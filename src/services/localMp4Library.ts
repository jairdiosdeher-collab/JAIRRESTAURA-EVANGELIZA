const DB_NAME = 'jairrestaura_mp4_library';
const STORE_NAME = 'videos';

export interface LocalMp4Video {
  id: string;
  name: string;
  size: number;
  addedAt: string;
  blob: Blob;
  category?: string;
}

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalMp4Videos(): Promise<LocalMp4Video[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as LocalMp4Video[]).sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getLocalMp4Video(id: string): Promise<LocalMp4Video | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as LocalMp4Video | undefined) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
