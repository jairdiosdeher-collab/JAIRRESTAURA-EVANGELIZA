import React, {useMemo, useState} from 'react';
import {BookOpen, Film, Search} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {PREPARED_SERMONS} from '../data/sermons';
import {createProjectFromSermon} from '../services/scriptEngine';
import type {AspectRatio, MinistryIdentity, PreparedSermon, VideoProject} from '../types/evangeliza';

interface SermonsLibraryProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

export const SermonsLibrary: React.FC<SermonsLibraryProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSermon, setSelectedSermon] = useState<PreparedSermon>(PREPARED_SERMONS[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PREPARED_SERMONS;
    return PREPARED_SERMONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.bibleReference.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q),
    );
  }, [search]);

  const handleProduce = (sermon: PreparedSermon) => {
    const project = createProjectFromSermon(sermon, aspectRatio, ministryIdentity);
    onSelectProject(project);
  };

  const activeScene = SCENE_MAP[selectedSermon.defaultImageId];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Biblioteca sin conexión · 12 Mensajes Pastorales Completos
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Predicación en Video
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-400">
            Cada mensaje incluye introducción, desarrollo bíblico, versículo, reflexión pastoral y llamado a Cristo listo para convertir en video MP4.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar mensaje o versículo..."
            className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-white pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sermon Cards List */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
          {filtered.map((sermon) => {
            const scene = SCENE_MAP[sermon.defaultImageId];
            const isSelected = sermon.id === selectedSermon.id;
            return (
              <button
                key={sermon.id}
                type="button"
                onClick={() => setSelectedSermon(sermon)}
                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-colors ${
                  isSelected
                    ? 'border-[#B47B22] bg-white dark:border-[#EAB354] dark:bg-[#171C28]'
                    : 'border-stone-200 bg-white hover:border-stone-300 dark:border-slate-800 dark:bg-[#11151E] dark:hover:border-slate-700'
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                  <img
                    src={scene.src}
                    alt={sermon.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <p className="text-xs text-amber-300">
                      {sermon.bibleReference} · <span className="font-mono-tabular">{sermon.suggestedDuration}s</span>
                    </p>
                    <h2 className="mt-0.5 font-display text-xl font-bold leading-tight text-white">
                      {sermon.title}
                    </h2>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {sermon.category}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-700 dark:text-slate-300">
                    {sermon.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Full Sermon Study & Video Trigger Panel */}
        <aside className="lg:col-span-5">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
            <div className="relative h-48 overflow-hidden rounded-xl bg-slate-950">
              <img
                src={activeScene.src}
                alt={selectedSermon.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-xs text-amber-300">
                  {selectedSermon.category} · {selectedSermon.bibleReference}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">
                  {selectedSermon.title}
                </h2>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                <BookOpen className="h-3.5 w-3.5" />
                {selectedSermon.bibleReference}
              </p>
              <p className="mt-1.5 font-display text-lg italic leading-snug text-stone-900 dark:text-[#F4F1EA]">
                «{selectedSermon.bibleText}»
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
              <div>
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Introducción
                </h3>
                <p className="mt-0.5">{selectedSermon.introduction}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Desarrollo
                </h3>
                <p className="mt-0.5">{selectedSermon.development}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Reflexión pastoral
                </h3>
                <p className="mt-0.5">{selectedSermon.reflection}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                  Llamado a Cristo
                </h3>
                <p className="mt-0.5 font-medium text-stone-900 dark:text-stone-100">
                  {selectedSermon.callToChrist}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                  Formato de salida
                </span>
                <div className="flex gap-1.5">
                  {(['9:16', '1:1', '16:9'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-semibold font-mono-tabular transition-colors ${
                        aspectRatio === ratio
                          ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                          : 'bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleProduce(selectedSermon)}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
              >
                <Film className="h-4 w-4" />
                Producir video en el editor
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
