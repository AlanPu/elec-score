import type { ScoreMeta, ScoreSettings } from '../types/score';
import { DEFAULT_SCORE_SETTINGS } from '../types/score';

const META_KEY = 'elec-score-meta';
const DB_NAME = 'elec-score-db';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

// --- IndexedDB 操作（本地缓存） ---

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

async function savePdfDataToLocal(id: string, pdfData: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(pdfData, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPdfDataFromLocal(id: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function deletePdfDataFromLocal(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- localStorage 元数据操作（本地缓存） ---

function loadScoreMetasFromLocal(): ScoreMeta[] {
  try {
    const data = localStorage.getItem(META_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveScoreMetasToLocal(metas: ScoreMeta[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(metas));
}

// --- 服务端 API 操作 ---

async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function apiDelete<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// --- 乐谱操作（API 优先，本地缓存降级） ---

// 加载乐谱列表
export async function loadScoreMetas(): Promise<ScoreMeta[]> {
  // 优先从 API 加载
  const serverMetas = await apiGet<ScoreMeta[]>('/api/scores');
  if (serverMetas) {
    // 同步缓存到 localStorage
    saveScoreMetasToLocal(serverMetas);
    return serverMetas;
  }
  // 降级到 localStorage
  return loadScoreMetasFromLocal();
}

// 同步加载乐谱列表（用于初始化，降级到 localStorage）
export function loadScoreMetasSync(): ScoreMeta[] {
  return loadScoreMetasFromLocal();
}

// 添加乐谱
export async function addScore(id: string, name: string, pdfData: string, thumbnail: string, pageCount: number, fileSize: number): Promise<ScoreMeta[]> {
  // 保存到服务端
  const serverMetas = await apiPost<ScoreMeta[]>('/api/scores', {
    id, name, pdfData, thumbnail, pageCount, fileSize,
  });

  if (serverMetas) {
    // 同步缓存 PDF 到本地 IndexedDB
    savePdfDataToLocal(id, pdfData).catch(() => {});
    // 同步缓存元数据到 localStorage
    saveScoreMetasToLocal(serverMetas);
    return serverMetas;
  }

  // API 不可用，降级到本地存储
  await savePdfDataToLocal(id, pdfData);
  const metas = loadScoreMetasFromLocal();
  const meta: ScoreMeta = { id, name, thumbnail, pageCount, addedDate: Date.now(), fileSize };
  metas.unshift(meta);
  saveScoreMetasToLocal(metas);
  return metas;
}

// 删除乐谱
export async function deleteScore(id: string): Promise<ScoreMeta[]> {
  // 从服务端删除
  const serverMetas = await apiDelete<ScoreMeta[]>(`/api/scores/${id}`);

  if (serverMetas) {
    // 同步清理本地缓存
    deletePdfDataFromLocal(id).catch(() => {});
    saveScoreMetasToLocal(serverMetas);
    return serverMetas;
  }

  // API 不可用，降级到本地删除
  await deletePdfDataFromLocal(id);
  const metas = loadScoreMetasFromLocal().filter((m) => m.id !== id);
  saveScoreMetasToLocal(metas);
  return metas;
}

// 加载 PDF 数据
export async function loadPdfData(id: string): Promise<string | undefined> {
  // 优先从 API 加载
  const result = await apiGet<{ pdfData: string }>(`/api/scores/${id}/pdf`);
  if (result?.pdfData) {
    // 同步缓存到本地 IndexedDB
    savePdfDataToLocal(id, result.pdfData).catch(() => {});
    return result.pdfData;
  }
  // 降级到本地 IndexedDB
  return loadPdfDataFromLocal(id);
}

// --- 乐谱设置操作（服务端 API + localStorage 缓存） ---

const SETTINGS_CACHE_PREFIX = 'elec-score-settings-';

function getSettingsCacheKey(scoreId: string): string {
  return `${SETTINGS_CACHE_PREFIX}${scoreId}`;
}

export async function fetchScoreSettings(scoreId: string): Promise<ScoreSettings | null> {
  const data = await apiGet<ScoreSettings>(`/api/settings/${scoreId}`);
  if (!data) return null;
  return { ...DEFAULT_SCORE_SETTINGS, ...data };
}

export async function saveScoreSettingsToServer(scoreId: string, settings: ScoreSettings): Promise<boolean> {
  try {
    const response = await fetch(`/api/settings/${scoreId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function loadScoreSettingsCache(scoreId: string): ScoreSettings | null {
  try {
    const data = localStorage.getItem(getSettingsCacheKey(scoreId));
    if (!data) return null;
    return { ...DEFAULT_SCORE_SETTINGS, ...JSON.parse(data) };
  } catch {
    return null;
  }
}

export function saveScoreSettingsCache(scoreId: string, settings: ScoreSettings): void {
  try {
    localStorage.setItem(getSettingsCacheKey(scoreId), JSON.stringify(settings));
  } catch {
    // 忽略
  }
}

export async function loadScoreSettings(scoreId: string): Promise<ScoreSettings> {
  const serverSettings = await fetchScoreSettings(scoreId);
  if (serverSettings) {
    saveScoreSettingsCache(scoreId, serverSettings);
    return serverSettings;
  }
  const cachedSettings = loadScoreSettingsCache(scoreId);
  if (cachedSettings) return cachedSettings;
  return { ...DEFAULT_SCORE_SETTINGS };
}

export async function saveScoreSettings(scoreId: string, settings: ScoreSettings): Promise<void> {
  saveScoreSettingsCache(scoreId, settings);
  saveScoreSettingsToServer(scoreId, settings);
}
