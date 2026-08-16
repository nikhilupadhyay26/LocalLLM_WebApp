import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ChatSession, ChunkRecord, DocumentRecord } from '@/types';

interface LocalDeskDB extends DBSchema {
  documents: {
    key: string;
    value: DocumentRecord;
    indexes: { 'by-uploadedAt': number };
  };
  chunks: {
    key: string;
    value: ChunkRecord;
    indexes: { 'by-documentId': string };
  };
  chats: {
    key: string;
    value: ChatSession;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'localdesk';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocalDeskDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LocalDeskDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LocalDeskDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const documents = db.createObjectStore('documents', { keyPath: 'id' });
        documents.createIndex('by-uploadedAt', 'uploadedAt');

        const chunks = db.createObjectStore('chunks', { keyPath: 'id' });
        chunks.createIndex('by-documentId', 'documentId');

        const chats = db.createObjectStore('chats', { keyPath: 'id' });
        chats.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

// ---- Documents ----

export async function putDocument(doc: DocumentRecord) {
  const db = await getDB();
  await db.put('documents', doc);
}

export async function getAllDocuments(): Promise<DocumentRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('documents', 'by-uploadedAt');
  return all.reverse();
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  const db = await getDB();
  return db.get('documents', id);
}

export async function deleteDocument(id: string) {
  const db = await getDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');
  await tx.objectStore('documents').delete(id);
  const chunkIndex = tx.objectStore('chunks').index('by-documentId');
  let cursor = await chunkIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ---- Chunks ----

export async function putChunks(chunks: ChunkRecord[]) {
  const db = await getDB();
  const tx = db.transaction('chunks', 'readwrite');
  await Promise.all(chunks.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function getChunksForDocuments(documentIds: string[]): Promise<ChunkRecord[]> {
  const db = await getDB();
  const tx = db.transaction('chunks', 'readonly');
  const index = tx.store.index('by-documentId');
  const results: ChunkRecord[] = [];
  for (const documentId of documentIds) {
    let cursor = await index.openCursor(IDBKeyRange.only(documentId));
    while (cursor) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
  }
  return results;
}

// ---- Chats ----

export async function putChatSession(session: ChatSession) {
  const db = await getDB();
  await db.put('chats', session);
}

export async function getAllChatSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const all = await db.getAll('chats');
  // Most-recently-active first, not creation order: a chat you just replied
  // to should jump back to the top like any normal chat product.
  return all.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  const db = await getDB();
  return db.get('chats', id);
}

export async function deleteChatSession(id: string) {
  const db = await getDB();
  await db.delete('chats', id);
}

// ---- Wipe everything (Settings > "clear all local data") ----

export async function clearAllLocalData() {
  const db = await getDB();
  await Promise.all([db.clear('documents'), db.clear('chunks'), db.clear('chats')]);
}

export async function estimateStorageUsage(): Promise<{ usageBytes: number; quotaBytes: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usageBytes: usage ?? 0, quotaBytes: quota ?? 0 };
}
