import { useCallback, useEffect, useRef, useState } from 'react';
import { isWhisperModelReady, loadWhisperModel, transcribeAudioChunk } from '@/lib/whisper';
import { getErrorMessage } from '@/lib/errors';
import type { ModelLoadProgress } from '@/types';

// Whisper wants mono 16kHz audio. Requesting the AudioContext itself at
// this rate lets the browser handle resampling from the mic's native rate,
// no manual resampler needed (confirmed live against a real speech sample).
const SAMPLE_RATE = 16000;

// A real local model can't match a cloud dictation service's word-by-word
// streaming, that takes far more compute than a small on-device model has.
// The honest middle ground: record in short chunks and transcribe each as
// it completes, so text visibly arrives in bursts rather than continuously.
const CHUNK_DURATION_S = 2.5;
const CHUNK_SAMPLES = Math.round(CHUNK_DURATION_S * SAMPLE_RATE);

// Below this, a chunk is almost certainly just the gap between clicking the
// mic and starting to speak (or a quick accidental toggle), not worth a
// transcription call for.
const MIN_FLUSH_SAMPLES = Math.round(0.3 * SAMPLE_RATE);

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);
  const bufferedSamplesRef = useRef(0);
  const queueRef = useRef<Float32Array[]>([]);
  const processingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setTranscribing(true);

    (async () => {
      while (queueRef.current.length > 0) {
        const chunk = queueRef.current.shift()!;
        try {
          const text = await transcribeAudioChunk(chunk);
          const trimmed = text.trim();
          if (trimmed) onTranscriptRef.current(trimmed);
        } catch (err) {
          setError(getErrorMessage(err, 'Transcription failed.'));
        }
      }
      processingRef.current = false;
      setTranscribing(false);
    })();
  }, []);

  const queueBuffer = useCallback(
    (minSamples: number) => {
      if (bufferedSamplesRef.current < minSamples) return;
      const combined = new Float32Array(bufferedSamplesRef.current);
      let offset = 0;
      for (const part of bufferRef.current) {
        combined.set(part, offset);
        offset += part.length;
      }
      bufferRef.current = [];
      bufferedSamplesRef.current = 0;
      queueRef.current.push(combined);
      processQueue();
    },
    [processQueue],
  );

  const teardownAudio = useCallback(() => {
    const processor = processorRef.current;
    if (processor) processor.onaudioprocess = null;
    processor?.disconnect();
    void audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (!isWhisperModelReady()) {
      setModelLoading(true);
      try {
        await loadWhisperModel((p) => setModelProgress(p));
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load the voice model.'));
        setModelLoading(false);
        setModelProgress(null);
        return;
      }
      setModelLoading(false);
      setModelProgress(null);
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was denied. Allow microphone access in your browser to use voice input.');
      return;
    }
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    // 4096 samples ≈ 256ms per callback at 16kHz; buffered up to a full
    // chunk before being queued for transcription.
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    // ScriptProcessorNode only fires callbacks while connected through to
    // the destination. Routing through a silent gain node keeps that true
    // without playing the user's own mic audio back to them.
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;

    bufferRef.current = [];
    bufferedSamplesRef.current = 0;

    processor.onaudioprocess = (e) => {
      bufferRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      bufferedSamplesRef.current += e.inputBuffer.length;
      if (bufferedSamplesRef.current >= CHUNK_SAMPLES) queueBuffer(CHUNK_SAMPLES);
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    setRecording(true);
  }, [queueBuffer]);

  const stop = useCallback(() => {
    setRecording(false);
    teardownAudio();
    // Whatever's left over (less than a full chunk) still deserves a shot
    // at transcription, otherwise the last couple of words are just lost.
    queueBuffer(MIN_FLUSH_SAMPLES);
  }, [teardownAudio, queueBuffer]);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  // A component unmounting mid-recording (navigating away) shouldn't leave
  // the microphone active in the background.
  useEffect(() => teardownAudio, [teardownAudio]);

  return {
    recording,
    transcribing,
    modelLoading,
    modelProgress,
    error,
    toggle,
    dismissError: () => setError(null),
  };
}
