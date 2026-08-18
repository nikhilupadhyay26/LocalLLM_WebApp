import { create } from 'zustand';
import * as db from '@/lib/db';
import { chunkText } from '@/lib/chunk';
import { embedTexts } from '@/lib/embeddings';
import { parseFile, validateFile, FileTooLargeError, UnsupportedFileError } from '@/lib/parsers';
import { DEFAULT_MODEL_ID, getContextWindowSize, getLoadedModelId, hasLoadedEngine, loadModel, streamChatCompletion, completeMessages } from '@/lib/llm';
import {
  completeLiteMessages,
  getLiteContextWindowSize,
  isLiteModelReady,
  loadLiteModel,
  streamLiteChatCompletion,
} from '@/lib/liteLlm';
import { checkWebGPUWithRetries, type WebGPUCheckResult } from '@/lib/webgpu';
import { buildGeneralPrompt, buildPrompt, retrieveTopChunks } from '@/lib/rag';
import { estimateTokens, prepareConversationHistory } from '@/lib/contextBudget';
import { getErrorMessage } from '@/lib/errors';
import type { ChatMessage, ChatSession, ChunkRecord, DocumentRecord, ModelLoadProgress, WebGPUCapability } from '@/types';

const ACTIVE_CHAT_STORAGE_KEY = 'pouchlm_active_chat_id';
const ONBOARDING_STORAGE_KEY = 'pouchlm_onboarding_complete';
const MODEL_ID_STORAGE_KEY = 'pouchlm_model_id';
const LITE_MODE_STORAGE_KEY = 'pouchlm_lite_mode_accepted';

function persistActiveChatId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id);
  else localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
}

function getStoredModelId(): string {
  return localStorage.getItem(MODEL_ID_STORAGE_KEY) ?? DEFAULT_MODEL_ID;
}

function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

function isLiteModeAccepted(): boolean {
  return localStorage.getItem(LITE_MODE_STORAGE_KEY) === 'true';
}

function autoTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, ' ');
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

interface AppState {
  // Documents
  documents: DocumentRecord[];
  loadDocuments: () => Promise<void>;
  ingestFile: (file: File) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  uploadErrors: string[];
  dismissUploadError: (index: number) => void;

  // Chat
  chatSessions: ChatSession[];
  activeChatId: string | null;
  loadChatSessions: () => Promise<void>;
  startChatSession: (documentIds: string[]) => Promise<string>;
  setActiveChat: (id: string | null) => void;
  renameSession: (id: string, title: string) => Promise<void>;
  updateSessionDocuments: (id: string, documentIds: string[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  generatingSessionIds: string[];

  // Model / WebGPU
  webgpuStatus: WebGPUCapability;
  webgpuFailureReason: string | null;
  webgpuFailureKind: WebGPUCheckResult['kind'] | null;
  checkWebGpuSupport: () => Promise<void>;
  // Devices with no WebGPU at all (webgpuFailureKind === 'no-api') can still
  // run a much smaller model on CPU/WASM instead of being a dead end. This
  // is only ever true once the user has explicitly opted into that
  // tradeoff (smaller model, slower generation) from the onboarding screen.
  liteModeAccepted: boolean;
  acceptLiteMode: () => void;
  modelProgress: ModelLoadProgress | null;
  modelReady: boolean;
  ensureModelLoaded: () => Promise<void>;
  modelId: string;
  setModelId: (id: string) => Promise<void>;
  modelSwitchError: string | null;
  dismissModelSwitchError: () => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  documents: [],
  async loadDocuments() {
    const loaded = await db.getAllDocuments();
    // A document can be left in 'parsing'/'embedding' if the tab closed or
    // reloaded mid-pipeline. Nothing is still working on it, so surface
    // that honestly instead of showing "Indexing…" forever (Section 13:
    // errors should state exactly what happened).
    const documents = await Promise.all(
      loaded.map(async (doc) => {
        if (doc.status !== 'parsing' && doc.status !== 'embedding') return doc;
        const recovered: DocumentRecord = {
          ...doc,
          status: 'error',
          errorMessage: 'Processing was interrupted before this finished. Remove it and upload the file again.',
        };
        await db.putDocument(recovered);
        return recovered;
      }),
    );
    set({ documents });
  },
  uploadErrors: [],
  dismissUploadError(index) {
    set((s) => ({ uploadErrors: s.uploadErrors.filter((_, i) => i !== index) }));
  },
  async ingestFile(file) {
    let fileType;
    try {
      fileType = validateFile(file);
    } catch (err) {
      const message =
        err instanceof FileTooLargeError || err instanceof UnsupportedFileError
          ? err.message
          : 'Could not read this file.';
      set((s) => ({ uploadErrors: [...s.uploadErrors, message] }));
      return;
    }

    const id = crypto.randomUUID();
    const record: DocumentRecord = {
      id,
      filename: file.name,
      fileType,
      uploadedAt: Date.now(),
      charCount: 0,
      status: 'parsing',
    };
    await db.putDocument(record);
    set((s) => ({ documents: [record, ...s.documents] }));

    try {
      const text = await parseFile(file, fileType);
      if (import.meta.env.DEV) console.log(`[ingest:${fileType}] parse complete`, { id, chars: text.length });
      const updated: DocumentRecord = { ...record, charCount: text.length, status: 'embedding' };
      await db.putDocument(updated);
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }));

      const pieces = chunkText(text);
      if (import.meta.env.DEV) console.log(`[ingest:${fileType}] chunk complete`, { id, chunkCount: pieces.length });
      if (pieces.length === 0) {
        const empty: DocumentRecord = { ...updated, status: 'error', errorMessage: 'No readable text was found in this document.' };
        await db.putDocument(empty);
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? empty : d)) }));
        return;
      }

      const embedStartedAt = Date.now();
      const embeddings = await embedTexts(pieces, (completed, total) => {
        // Estimated from this document's own observed rate so far, not a
        // guess: large documents can genuinely take tens of minutes, and a
        // bare "340/12000" reads as "stuck" without a real time estimate.
        const elapsedMs = Date.now() - embedStartedAt;
        const etaSeconds = completed > 0 ? Math.round(((total - completed) * elapsedMs) / completed / 1000) : undefined;
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, embedProgress: { completed, total, etaSeconds } } : d)),
        }));
      });
      if (import.meta.env.DEV) console.log(`[ingest:${fileType}] embedding complete`, { id, vectorCount: embeddings.length });
      const chunks: ChunkRecord[] = pieces.map((text, i) => ({
        id: `${id}-${i}`,
        documentId: id,
        chunkIndex: i,
        text,
        embedding: embeddings[i],
      }));
      await db.putChunks(chunks);

      const ready: DocumentRecord = { ...updated, status: 'ready' };
      await db.putDocument(ready);
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? ready : d)) }));
      if (import.meta.env.DEV) console.log(`[ingest:${fileType}] ready`, { id });
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[ingest:${fileType}] failed`, { id, err });
      const failed: DocumentRecord = {
        ...record,
        status: 'error',
        errorMessage: getErrorMessage(err, 'Something went wrong while processing this file.'),
      };
      await db.putDocument(failed);
      set((s) => ({ documents: s.documents.map((d) => (d.id === id ? failed : d)) }));
    }
  },
  async removeDocument(id) {
    await db.deleteDocument(id);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  chatSessions: [],
  activeChatId: localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY),
  async loadChatSessions() {
    const chatSessions = await db.getAllChatSessions();
    set((s) => {
      const persisted = s.activeChatId;
      const stillExists = persisted && chatSessions.some((c) => c.id === persisted);
      const activeChatId = stillExists ? persisted : (chatSessions[0]?.id ?? null);
      if (activeChatId !== persisted) persistActiveChatId(activeChatId);
      return { chatSessions, activeChatId };
    });
  },
  async startChatSession(documentIds) {
    const now = Date.now();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      documentIds,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.putChatSession(session);
    persistActiveChatId(session.id);
    set((s) => ({ chatSessions: [session, ...s.chatSessions], activeChatId: session.id }));
    return session.id;
  },
  setActiveChat(id) {
    persistActiveChatId(id);
    set({ activeChatId: id });
  },
  async renameSession(id, title) {
    const session = get().chatSessions.find((c) => c.id === id);
    if (!session) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated: ChatSession = { ...session, title: trimmed };
    await db.putChatSession(updated);
    set((s) => ({ chatSessions: s.chatSessions.map((c) => (c.id === id ? updated : c)) }));
  },
  // Lets a chat's document scope change mid-conversation (toggling a
  // checkbox in the sidebar) instead of forcing a new chat every time.
  // Past messages keep whatever they were actually grounded in via their
  // own citedChunkIds; this only affects retrieval for turns sent after
  // the change.
  async updateSessionDocuments(id, documentIds) {
    const session = get().chatSessions.find((c) => c.id === id);
    if (!session) return;
    const updated: ChatSession = { ...session, documentIds };
    await db.putChatSession(updated);
    set((s) => ({ chatSessions: s.chatSessions.map((c) => (c.id === id ? updated : c)) }));
  },
  async deleteSession(id) {
    await db.deleteChatSession(id);
    set((s) => {
      const chatSessions = s.chatSessions.filter((c) => c.id !== id);
      const activeChatId = s.activeChatId === id ? (chatSessions[0]?.id ?? null) : s.activeChatId;
      if (activeChatId !== s.activeChatId) persistActiveChatId(activeChatId);
      return { chatSessions, activeChatId };
    });
  },
  generatingSessionIds: [],
  async sendMessage(content) {
    const state = get();
    const session = state.chatSessions.find((c) => c.id === state.activeChatId);
    if (!session) return;
    const sessionId = session.id;

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    const placeholder: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now(), status: 'thinking' };
    let working: ChatSession = {
      ...session,
      messages: [...session.messages, userMsg, placeholder],
      updatedAt: Date.now(),
      title: session.title ?? autoTitle(content),
    };
    const commit = () => set((s) => ({ chatSessions: s.chatSessions.map((c) => (c.id === sessionId ? working : c)) }));
    commit();

    set((s) => ({ generatingSessionIds: [...s.generatingSessionIds, sessionId] }));

    // Replaces the trailing assistant slot in place (the placeholder, or
    // whatever it has become) rather than appending, so a retrieval label,
    // streamed tokens, and a final error can never stack up as duplicate
    // bubbles for the same turn.
    const replaceLastAssistant = (patch: Partial<ChatMessage>) => {
      const messages = [...working.messages];
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant') {
        messages[messages.length - 1] = { ...last, ...patch };
      } else {
        messages.push({ role: 'assistant', content: '', timestamp: Date.now(), ...patch });
      }
      working = { ...working, messages };
      commit();
    };

    const finish = async () => {
      await db.putChatSession(working);
      set((s) => ({ generatingSessionIds: s.generatingSessionIds.filter((id) => id !== sessionId) }));
    };

    try {
      await get().ensureModelLoaded();
      const lite = get().webgpuStatus !== 'available';
      const stream = lite ? streamLiteChatCompletion : streamChatCompletion;
      const complete = lite ? completeLiteMessages : completeMessages;

      // No document in scope: skip retrieval entirely and answer as a
      // general assistant rather than forcing the context-constrained RAG
      // prompt on a query that has nothing to retrieve from.
      const hasDocs = session.documentIds.length > 0;
      let citedChunkIds: string[] = [];
      let system: string;
      let userTurn: string;
      if (hasDocs) {
        replaceLastAssistant({ status: 'retrieving' });
        const retrieved = await retrieveTopChunks(content, session.documentIds);
        citedChunkIds = retrieved.map((c) => c.id);
        const prompt = buildPrompt(retrieved, content, lite);
        system = prompt.system;
        userTurn = prompt.user;
      } else {
        const prompt = buildGeneralPrompt(content, lite);
        system = prompt.system;
        userTurn = prompt.user;
      }

      const priorMessages = session.messages; // excludes the user turn/placeholder just added
      const contextWindow = lite ? getLiteContextWindowSize() : getContextWindowSize(state.modelId);
      const prepared = await prepareConversationHistory(
        priorMessages,
        session.contextSummary,
        session.contextSummarizedCount ?? 0,
        contextWindow,
        estimateTokens(system),
        estimateTokens(userTurn),
        complete,
        () => replaceLastAssistant({ status: 'summarizing' }),
      );

      if (prepared.updatedSummaryState) {
        working = {
          ...working,
          contextSummary: prepared.updatedSummaryState.contextSummary,
          contextSummarizedCount: prepared.updatedSummaryState.contextSummarizedCount,
        };
      }
      if (prepared.freshSummaryNote) {
        const noteMsg: ChatMessage = { role: 'note', content: prepared.freshSummaryNote, timestamp: Date.now() };
        // Insert the note just before the placeholder (last message) so it reads in order.
        const messages = [...working.messages];
        messages.splice(messages.length - 1, 0, noteMsg);
        working = { ...working, messages };
      }

      replaceLastAssistant({ status: 'thinking' });

      const messages = [
        { role: 'system' as const, content: system },
        ...prepared.historyMessages,
        { role: 'user' as const, content: userTurn },
      ];

      await stream(messages, {
        onToken: (fullTextSoFar) => {
          replaceLastAssistant({ content: fullTextSoFar, citedChunkIds, status: undefined });
        },
        onDone: async (fullText) => {
          replaceLastAssistant({ content: fullText, citedChunkIds, status: undefined });
          await finish();
        },
        onError: async (error) => {
          replaceLastAssistant({
            content: `Something went wrong generating a response: ${error.message}`,
            status: undefined,
          });
          await finish();
        },
      });
    } catch (err) {
      replaceLastAssistant({
        content: `Something went wrong: ${getErrorMessage(err, 'unknown error')}`,
        status: undefined,
      });
      await finish();
    }
  },

  webgpuStatus: 'checking',
  webgpuFailureReason: null,
  webgpuFailureKind: null,
  async checkWebGpuSupport() {
    set({ webgpuStatus: 'checking', webgpuFailureReason: null, webgpuFailureKind: null });
    const result = await checkWebGPUWithRetries();
    set({
      webgpuStatus: result.available ? 'available' : 'unavailable',
      webgpuFailureReason: result.reason,
      webgpuFailureKind: result.kind,
    });
  },
  liteModeAccepted: isLiteModeAccepted(),
  acceptLiteMode() {
    localStorage.setItem(LITE_MODE_STORAGE_KEY, 'true');
    set({ liteModeAccepted: true });
  },
  modelProgress: null,
  modelReady: false,
  async ensureModelLoaded() {
    const { modelId, webgpuStatus } = get();

    // No WebGPU on this device: run the small CPU/WASM model instead of the
    // full catalog. Only reachable once liteModeAccepted is true (AppPage
    // gates on that), so this is always an informed choice, never a silent
    // downgrade.
    if (webgpuStatus !== 'available') {
      if (get().modelReady && isLiteModelReady()) return;
      await loadLiteModel((progress) => set({ modelProgress: progress }));
      set({ modelReady: true, modelProgress: null });
      return;
    }

    // Also check the engine itself and which model it's actually running,
    // not just the flag: a GPU hiccup can silently drop the underlying
    // engine (llm.ts recovers automatically when it can, but if that
    // recovery ever fails, modelReady would otherwise stay stuck true
    // forever), and a stale mismatch here would otherwise mean the wrong
    // model answers the next message.
    if (get().modelReady && hasLoadedEngine() && getLoadedModelId() === modelId) return;
    await loadModel(modelId, (progress) => set({ modelProgress: progress }));
    set({ modelReady: true, modelProgress: null });
  },
  modelId: getStoredModelId(),
  modelSwitchError: null,
  dismissModelSwitchError() {
    set({ modelSwitchError: null });
  },
  async setModelId(newModelId) {
    const previousModelId = get().modelId;
    if (newModelId === previousModelId && hasLoadedEngine() && getLoadedModelId() === newModelId) return;

    set({ modelSwitchError: null, modelProgress: null, modelReady: false });
    try {
      await loadModel(newModelId, (progress) => set({ modelProgress: progress }));
      localStorage.setItem(MODEL_ID_STORAGE_KEY, newModelId);
      set({ modelId: newModelId, modelReady: true, modelProgress: null });
    } catch (err) {
      const message = getErrorMessage(err, 'Could not load this model.');
      // Never leave the user on a broken engine with no usable model at
      // all: fall back to whatever was actually working before this switch.
      try {
        await loadModel(previousModelId, (progress) => set({ modelProgress: progress }));
        set({ modelId: previousModelId, modelReady: true, modelProgress: null, modelSwitchError: message });
      } catch {
        set({ modelSwitchError: message, modelProgress: null });
      }
    }
  },
  onboardingComplete: isOnboardingComplete(),
  completeOnboarding() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    set({ onboardingComplete: true });
  },
}));
