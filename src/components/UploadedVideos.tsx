import React, {useCallback, useEffect, useState} from 'react';
import {Download, Film, HardDrive, Search, Trash2, Upload, Video} from 'lucide-react';

const DB_NAME = 'jairrestaura_mp4_library';
const STORE_NAME = 'videos';
const MAX_FILE_BYTES = 250 * 1024 * 1024;

interface UploadedVideo {
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
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'id'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listVideos(): Promise<UploadedVideo[]> {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as UploadedVideo[]).sort((a,b) => b.addedAt.localeCompare(a.addedAt)));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveVideo(video: UploadedVideo): Promise<void> {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(video);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

async function updateVideoCategory(id: string, category: string): Promise<void> {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({...request.result, category});
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function removeVideo(id: string): Promise<void> {
  const db = await openLibrary();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VIDEO_CATEGORIES = ['Sin categoría', 'Predicaciones', 'Alabanzas', 'Testimonios', 'Familia', 'Invitaciones', 'Saludos pastorales', 'Escenas propias'] as const;

const UploadedVideoCard: React.FC<{video: UploadedVideo; onDelete: (id: string) => void; onCategoryChange: (id: string, category: string) => void}> = ({video, onDelete, onCategoryChange}) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const nextUrl = URL.createObjectURL(video.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [video.blob]);
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#11151E]">
      <div className="aspect-video bg-black">
        {url && <video src={url} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label={video.name} />}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="break-words font-semibold text-stone-900 dark:text-stone-100">{video.name}</h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">{formatSize(video.size)} · Guardado en este dispositivo</p>
        <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">Categoría
          <select value={video.category || 'Sin categoría'} onChange={event => onCategoryChange(video.id, event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100">
            {VIDEO_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {url && <a href={url} download={video.name} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#B47B22] px-3 text-sm font-semibold text-white dark:bg-[#D4A24C] dark:text-[#090B10]"><Download className="h-4 w-4"/> Descargar</a>}
          <button type="button" onClick={() => onDelete(video.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"><Trash2 className="h-4 w-4"/> Quitar</button>
        </div>
      </div>
    </article>
  );
};

export const UploadedVideos: React.FC = () => {
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let active = true;
    void listVideos().then(items => { if (active) setVideos(items); }).catch(() => {
      if (active) setError('No se pudo abrir la biblioteca local. Comprueba que el navegador permita almacenamiento.');
    });
    return () => { active = false; };
  }, [refreshKey]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setNotice('');
    const selected = Array.from(files);
    const invalid = selected.find(file => !file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4');
    if (invalid) { setError(`“${invalid.name}” no parece ser un archivo MP4. Selecciona videos con extensión .mp4.`); return; }
    const oversized = selected.find(file => file.size > MAX_FILE_BYTES);
    if (oversized) { setError(`“${oversized.name}” supera el límite de 250 MB por archivo.`); return; }
    setBusy(true);
    try {
      for (const file of selected) {
        await saveVideo({
          id: `mp4_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
          name: file.name,
          size: file.size,
          addedAt: new Date().toISOString(),
          blob: file,
        });
      }
      setNotice(`${selected.length} video(s) guardado(s) en la biblioteca de este dispositivo.`);
      setRefreshKey(value => value + 1);
    } catch {
      setError('El navegador no tiene espacio disponible o no pudo guardar el video. Libera espacio e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCategoryChange = async (id: string, category: string) => {
    try {
      await updateVideoCategory(id, category);
      setVideos(current => current.map(video => video.id === id ? {...video, category} : video));
      setNotice('Categoría actualizada. El archivo original permanece intacto.');
    } catch {
      setError('No se pudo actualizar la categoría. Inténtalo de nuevo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Quitar este video de la biblioteca de este dispositivo?')) return;
    try {
      await removeVideo(id);
      setVideos(current => current.filter(video => video.id !== id));
      setNotice('Video quitado de la biblioteca local.');
    } catch {
      setError('No se pudo quitar el video. Inténtalo de nuevo.');
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#183B35] via-[#24584D] to-[#B47B22] p-6 text-white sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Film className="h-6 w-6"/></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100">Complemento de creación</p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Mi biblioteca de videos MP4</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">Sube predicaciones, testimonios, saludos pastorales o escenas propias para tenerlos a mano mientras preparas tus mensajes.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#11151E] sm:p-6">
        <label htmlFor="mp4-upload" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#B47B22]/50 bg-amber-50/60 px-5 py-8 text-center hover:bg-amber-50 dark:border-[#D4A24C]/50 dark:bg-slate-900/60 dark:hover:bg-slate-900">
          <Upload className="h-9 w-9 text-[#B47B22] dark:text-[#EAB354]"/>
          <span className="mt-3 text-base font-bold text-stone-900 dark:text-stone-100">{busy ? 'Guardando videos…' : 'Seleccionar videos MP4'}</span>
          <span className="mt-1 text-sm text-stone-600 dark:text-slate-400">Puedes seleccionar uno o varios archivos · máximo 250 MB cada uno</span>
          <span className="mt-4 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-bold text-white dark:bg-[#D4A24C] dark:text-[#090B10]">{busy ? 'Procesando…' : 'Elegir archivos'}</span>
        </label>
        <input id="mp4-upload" type="file" accept="video/mp4,.mp4" multiple disabled={busy} className="sr-only" onChange={event => { void handleFiles(event.currentTarget.files); event.currentTarget.value = ''; }}/>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:bg-slate-900 dark:text-slate-400">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0"/>
          <p>Los videos se guardan únicamente en el almacenamiento local de este navegador. No se envían a servidores ni se incorporan automáticamente al video final. Si borras los datos del navegador o cambias de dispositivo, necesitarás conservar una copia original.</p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Videos guardados ({videos.length})</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">Reproduce, descarga o quita cada archivo cuando lo necesites.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400"><Video className="h-4 w-4"/> MP4 · Biblioteca local</div>
      </div>
      {videos.length ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400"/><input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Buscar por nombre de video…" className="min-h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"/></label>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filtrar por categoría" className="min-h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100">
              {['Todas', ...VIDEO_CATEGORIES].map(category => <option key={category} value={category}>{category === 'Todas' ? 'Todas las categorías' : category}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {videos.filter(video => (categoryFilter === 'Todas' || (video.category || 'Sin categoría') === categoryFilter) && video.name.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())).map(video => <UploadedVideoCard key={video.id} video={video} onDelete={handleDelete} onCategoryChange={handleCategoryChange}/>)}
          </div>
          {videos.filter(video => (categoryFilter === 'Todas' || (video.category || 'Sin categoría') === categoryFilter) && video.name.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())).length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">No hay videos que coincidan con la búsqueda o categoría.</p>}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-slate-700">
          <Film className="mx-auto h-10 w-10 text-stone-400"/>
          <h3 className="mt-3 font-semibold text-stone-800 dark:text-stone-200">Aún no has añadido videos</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Selecciona un MP4 para comenzar tu biblioteca personal.</p>
        </div>
      )}
    </section>
  );
};
