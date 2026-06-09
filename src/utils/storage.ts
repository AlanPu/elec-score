import type { ScoreMeta } from '../types/score';

const META_KEY = 'elec-score-meta';
const DB_NAME = 'elec-score-db';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

// --- IndexedDB 操作 ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePdfData(id: string, pdfData: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(pdfData, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPdfData(id: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function deletePdfData(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- 元数据操作（localStorage） ---

export function loadScoreMetas(): ScoreMeta[] {
  try {
    const data = localStorage.getItem(META_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveScoreMetas(metas: ScoreMeta[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(metas));
}

// --- 组合操作 ---

export async function addScore(id: string, name: string, pdfData: string, thumbnail: string, pageCount: number, fileSize: number): Promise<ScoreMeta[]> {
  // 保存 PDF 数据到 IndexedDB
  await savePdfData(id, pdfData);

  // 保存元数据到 localStorage
  const metas = loadScoreMetas();
  const meta: ScoreMeta = { id, name, thumbnail, pageCount, addedDate: Date.now(), fileSize };
  metas.unshift(meta);
  saveScoreMetas(metas);
  return metas;
}

export async function deleteScore(id: string): Promise<ScoreMeta[]> {
  await deletePdfData(id);
  const metas = loadScoreMetas().filter((m) => m.id !== id);
  saveScoreMetas(metas);
  return metas;
}
