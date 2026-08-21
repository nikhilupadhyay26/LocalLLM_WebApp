import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import Modal from '@/components/common/Modal';
import ModelDownloadReassurances from '@/components/common/ModelDownloadReassurances';
import ModelDownloadProgressBar from '@/components/common/ModelDownloadProgressBar';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function Composer({ onSend, disabled, placeholder }: ComposerProps) {
  const [value, setValue] = useState('');

  const { recording, transcribing, modelLoading, modelProgress, error, toggle, dismissError } = useVoiceInput({
    onTranscript: (text) => {
      setValue((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    },
  });

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-ink-800">
      {error && (
        <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md border border-red-800/40 bg-red-950/30 px-2 py-1.5 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss" className="shrink-0">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={onFormSubmit} className="flex items-end gap-2 p-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder ?? 'Ask about your documents…'}
          aria-label="Message"
          className="input max-h-40 flex-1 resize-none"
        />
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={recording ? 'Stop recording' : 'Start voice input'}
          aria-pressed={recording}
          title={recording ? 'Stop recording' : transcribing ? 'Transcribing…' : 'Voice input'}
          className={`btn-secondary !px-3 ${recording ? '!border-red-500 text-red-400' : ''}`}
        >
          {recording ? '⏹' : '🎤'}
        </button>
        <button type="submit" disabled={disabled || !value.trim()} className="btn-primary">
          Send
        </button>
      </form>

      <Modal open={modelLoading} onClose={() => {}} title="Setting up voice input" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Downloading the voice model so speech-to-text can run right here on your device, this happens once.
          </p>
          <ModelDownloadReassurances />
          <ModelDownloadProgressBar progress={modelProgress} />
        </div>
      </Modal>
    </div>
  );
}
