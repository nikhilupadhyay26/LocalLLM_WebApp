// Core data model, mirrors PRD Section 8. Everything here lives in the
// browser (IndexedDB or localStorage); none of it is ever sent anywhere.

export type FileType = 'pdf' | 'docx' | 'csv' | 'txt';
export type DocumentStatus = 'parsing' | 'embedding' | 'ready' | 'error';

export interface DocumentRecord {
  id: string;
  filename: string;
  fileType: FileType;
  uploadedAt: number;
  charCount: number;
  status: DocumentStatus;
  errorMessage?: string;
  /** Only meaningful while status is 'embedding'; not persisted, purely a live progress readout. */
  embedProgress?: { completed: number; total: number };
}

export interface ChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

export interface ChatMessage {
  /** 'note' is a system-authored aside (e.g. "earlier messages summarized"), rendered without a bubble. */
  role: 'user' | 'assistant' | 'note';
  content: string;
  timestamp: number;
  citedChunkIds?: string[];
  /** Ephemeral pre-content phase, cleared once real content or an error lands. Never meaningful once persisted content exists. */
  status?: 'retrieving' | 'summarizing' | 'thinking';
}

export interface ChatSession {
  id: string;
  documentIds: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  title?: string;
  /** Rolling summary of everything older than the recent-turns tail, used to keep prompts within the model's real context window. */
  contextSummary?: string;
  /** How many of the earliest `messages` are already folded into `contextSummary`. */
  contextSummarizedCount?: number;
}

export interface ModelLoadProgress {
  progress: number; // 0..1
  text: string;
  timeElapsedSeconds?: number;
}

export type WebGPUCapability = 'checking' | 'available' | 'unavailable';
