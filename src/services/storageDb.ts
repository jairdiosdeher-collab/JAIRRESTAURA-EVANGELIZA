import type {MinistryIdentity, VideoProject} from '../types/evangeliza';
import {normalizeMinistryIdentity, normalizeVideoProject} from './orthography';
import {DEFAULT_MINISTRY_IDENTITY} from './scriptEngine';

const DB_NAME = 'jairrestaura_evangeliza_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';
const ORTHOGRAPHY_BACKUP_KEY = 'pre_orthography_backup_v1';

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

export interface OrthographyMigrationResult {
  totalProjects: number;
  migratedProjects: number;
  backupCreated: boolean;
}

/**
 * Migración segura e idempotente de proyectos existentes en IndexedDB.
 * - Conserva DB_VERSION = 1 sin reiniciar ni borrar registros.
 * - Guarda copia de seguridad previa antes de modificar registros (solo si aún no existe).
 * - Conserva IDs, createdAt, updatedAt, duplicados, audios, imágenes y demás propiedades.
 */
export async function migrateExistingProjectsOrthography(): Promise<OrthographyMigrationResult> {
  try {
    const db = await openDatabase();
    return await new Promise<OrthographyMigrationResult>((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_SETTINGS], 'readwrite');
      const projectsStore = tx.objectStore(STORE_PROJECTS);
      const settingsStore = tx.objectStore(STORE_SETTINGS);

      const getProjectsReq = projectsStore.getAll();
      const getSettingsReq = settingsStore.get('app_settings');
      const getBackupReq = settingsStore.get(ORTHOGRAPHY_BACKUP_KEY);

      let existingProjects: VideoProject[] | null = null;
      let settingsRecord: {key: string; value: AppStoredSettings} | undefined;
      let hasBackup = false;
      let settledCount = 0;

      let migratedProjects = 0;
      let backupCreated = false;

      const tryApplyMigration = () => {
        if (settledCount < 3 || existingProjects === null) return;

        const changedProjects: VideoProject[] = [];
        for (const proj of existingProjects) {
          const normalized = normalizeVideoProject(proj);
          if (JSON.stringify(proj) !== JSON.stringify(normalized)) {
            changedProjects.push(normalized);
          }
        }

        const currentSettings = settingsRecord?.value
          ? {...DEFAULT_SETTINGS, ...settingsRecord.value}
          : DEFAULT_SETTINGS;
        const normalizedSettings: AppStoredSettings = {
          ...currentSettings,
          ministryIdentity: normalizeMinistryIdentity(currentSettings.ministryIdentity),
        };
        const settingsChanged =
          Boolean(settingsRecord?.value) &&
          JSON.stringify(currentSettings) !== JSON.stringify(normalizedSettings);

        if (!hasBackup && (changedProjects.length > 0 || settingsChanged || existingProjects.length > 0)) {
          settingsStore.put({
            key: ORTHOGRAPHY_BACKUP_KEY,
            value: {
              createdAt: new Date().toISOString(),
              projects: existingProjects,
              settings: currentSettings,
            },
          });
          backupCreated = true;
        }

        for (const updatedProj of changedProjects) {
          projectsStore.put(updatedProj);
          migratedProjects++;
        }

        if (settingsChanged) {
          settingsStore.put({key: 'app_settings', value: normalizedSettings});
        }
      };

      getProjectsReq.onsuccess = () => {
        existingProjects = (getProjectsReq.result as VideoProject[]) || [];
        settledCount++;
        tryApplyMigration();
      };
      getSettingsReq.onsuccess = () => {
        settingsRecord = getSettingsReq.result as {key: string; value: AppStoredSettings} | undefined;
        settledCount++;
        tryApplyMigration();
      };
      getBackupReq.onsuccess = () => {
        hasBackup = Boolean(getBackupReq.result);
        settledCount++;
        tryApplyMigration();
      };

      tx.oncomplete = () =>
        resolve({
          totalProjects: existingProjects?.length ?? 0,
          migratedProjects,
          backupCreated,
        });
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return {totalProjects: 0, migratedProjects: 0, backupCreated: false};
  }
}

export async function getAllProjects(): Promise<VideoProject[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = ((req.result as VideoProject[]) || []).map(normalizeVideoProject);
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
  const normalized = normalizeVideoProject(project);
  const updated: VideoProject = {
    ...normalized,
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
        const merged = record?.value ? {...DEFAULT_SETTINGS, ...record.value} : DEFAULT_SETTINGS;
        resolve({
          ...merged,
          ministryIdentity: normalizeMinistryIdentity(merged.ministryIdentity),
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppStoredSettings): Promise<void> {
  const db = await openDatabase();
  const normalized: AppStoredSettings = {
    ...settings,
    ministryIdentity: normalizeMinistryIdentity(settings.ministryIdentity),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.put({key: 'app_settings', value: normalized});
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
  const normalizedProject = normalizeVideoProject(project);
  const blob = new Blob([JSON.stringify(normalizedProject, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = normalizedProject.title
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
  const normalizedProjects = projects.map(normalizeVideoProject);
  const normalizedSettings: AppStoredSettings = {
    ...settings,
    ministryIdentity: normalizeMinistryIdentity(settings.ministryIdentity),
  };
  const payload: BackupPayload = {
    app: 'JAIRRESTAURA_EVANGELIZA',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: normalizedSettings,
    projects: normalizedProjects,
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
        await saveProject(normalizeVideoProject(proj));
        count++;
      }
    }
    let restoredSettings = false;
    if (parsed.settings) {
      await saveAppSettings({
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        ministryIdentity: normalizeMinistryIdentity(
          parsed.settings.ministryIdentity ?? DEFAULT_MINISTRY_IDENTITY,
        ),
      });
      restoredSettings = true;
    }
    return {importedProjects: count, restoredSettings};
  }

  if (parsed && typeof parsed.id === 'string' && parsed.script && Array.isArray(parsed.script.scenes)) {
    await saveProject(normalizeVideoProject(parsed as VideoProject));
    return {importedProjects: 1, restoredSettings: false};
  }

  throw new Error('El archivo seleccionado no corresponde a un respaldo válido de JAIRRESTAURA EVANGELIZA.');
}
