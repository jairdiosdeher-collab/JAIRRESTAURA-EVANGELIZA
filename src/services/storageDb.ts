import type {MinistryIdentity, VideoProject} from '../types/evangeliza';
import {DEFAULT_MINISTRY_IDENTITY} from './scriptEngine';

const DB_NAME = 'jairrestaura_evangeliza_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';

export interface AppStoredSettings {
  theme: 'dark' | 'light';
  ministryIdentity: MinistryIdentity;
  completedCampaignEpisodes: Record<string, number[]>;
}

const DEFAULT_SETTINGS: AppStoredSettings = {
  theme: 'light',
  ministryIdentity: DEFAULT_MINISTRY_IDENTITY,
  completedCampaignEpisodes: {},
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, {keyPath: 'key'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects(): Promise<VideoProject[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as VideoProject[]) || [];
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveProject(project: VideoProject): Promise<void> {
  const db = await openDatabase();
  const updated: VideoProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.put(updated);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectById(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAppSettings(): Promise<AppStoredSettings> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('app_settings');
      req.onsuccess = () => {
        const record = req.result as {key: string; value: AppStoredSettings} | undefined;
        resolve(record?.value ? {...DEFAULT_SETTINGS, ...record.value} : DEFAULT_SETTINGS);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppStoredSettings): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.put({key: 'app_settings', value: settings});
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface BackupPayload {
  app: 'JAIRRESTAURA_EVANGELIZA';
  schemaVersion: 1;
  exportedAt: string;
  settings: AppStoredSettings;
  projects: VideoProject[];
}

export function downloadProjectJson(project: VideoProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `jairrestaura-proyecto-${safeName || 'video'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFullBackup(): Promise<BackupPayload> {
  const [projects, settings] = await Promise.all([getAllProjects(), getAppSettings()]);
  const payload: BackupPayload = {
    app: 'JAIRRESTAURA_EVANGELIZA',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    projects,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `jairrestaura-respaldo-${dateTag}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload;
}

export async function restoreBackupFromFile(
  file: File,
): Promise<{importedProjects: number; restoredSettings: boolean}> {
  const rawText = await file.text();
  const parsed = JSON.parse(rawText) as Partial<BackupPayload> & Partial<VideoProject>;

  // Support restoring either a full backup file or a single project JSON file
  if (parsed.app === 'JAIRRESTAURA_EVANGELIZA' && Array.isArray(parsed.projects)) {
    let count = 0;
    for (const proj of parsed.projects) {
      if (proj && typeof proj.id === 'string' && proj.script && Array.isArray(proj.script.scenes)) {
        await saveProject(proj);
        count++;
      }
    }
    let restoredSettings = false;
    if (parsed.settings) {
      await saveAppSettings({...DEFAULT_SETTINGS, ...parsed.settings});
      restoredSettings = true;
    }
    return {importedProjects: count, restoredSettings};
  }

  if (parsed && typeof parsed.id === 'string' && parsed.script && Array.isArray(parsed.script.scenes)) {
    await saveProject(parsed as VideoProject);
    return {importedProjects: 1, restoredSettings: false};
  }

  throw new Error('El archivo seleccionado no corresponde a un respaldo válido de JAIRRESTAURA EVANGELIZA.');
}
