import React, {useMemo, useState} from 'react';
import {BookOpen, Film, Search, Zap} from 'lucide-react';
import {BIBLICAL_CATEGORIES, OFFLINE_BIBLE_VERSES} from '../data/bibleVerses';
import {SCENE_MAP} from '../data/sceneCatalog';
import {directScriptSequence, produceOneClickEvangelisticVideo} from '../services/autoDirector';
import {
  createProjectFromInput,
  generateLocalEvangelisticScript,
} from '../services/scriptEngine';
import type {
  AspectRatio,
  BibleVerseEntry,
  BiblicalCategory,
  MinistryIdentity,
  VideoProject,
} from '../types/evangeliza';

interface BiblicalLibraryViewProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

export const BiblicalLibraryView: React.FC<BiblicalLibraryViewProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BiblicalCategory | 'Todas'>('Todas');
  const [query, setQuery] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [producingId, setProducingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const filteredVerses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFLINE_BIBLE_VERSES.filter((v) => {
      const catMatch = selectedCategory === 'Todas' || v.category === selectedCategory;
      const textMatch =
        !q ||
        v.reference.toLowerCase().includes(q) ||
        v.theme.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [query, selectedCategory]);

  const handleOpenEditor = (verse: BibleVerseEntry) => {
    setStatusNotice(null);
    const input = {
      topic: `${verse.theme} (${verse.reference})`,
      productionFormat: 'evangelistico_30_60' as const,
      audience: 'General' as const,
      duration: 60 as const,
      aspectRatio,
      visualStyle: 'dorada_esperanza' as const,
      voiceType: 'masculina' as const,
      musicTrackId: 'piano_emotivo' as const,
      customBibleRef: verse.reference,
      customBibleText: verse.text,
      ministryIdentity,
    };
    const raw = generateLocalEvangelisticScript(input);
    const {script} = directScriptSequence(raw, {
      topic: input.topic,
      productionFormat: input.productionFormat,
      targetDuration: input.duration,
    });
    onSelectProject(createProjectFromInput(input, script));
  };

  const handleOneClickVerse = async (verse: BibleVerseEntry) => {
    setStatusNotice(null);
    setProducingId(verse.id);
    try {
      const {project, notice} = await produceOneClickEvangelisticVideo({
        topic: `${verse.theme} (${verse.reference})`,
        productionFormat: 'evangelistico_30_60',
        audience: 'General',
        duration: 60,
        aspectRatio,
        visualStyle: 'dorada_esperanza',
        voiceType: 'masculina',
        musicTrackId: 'piano_emotivo',
        customBibleRef: verse.reference,
        customBibleText: verse.text,
        ministryIdentity,
      });
      if (notice) setStatusNotice(notice);
      onSelectProject(project);
    } finally {
      setProducingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Biblioteca Bíblica Ampliada · Reina-Valera 1960 Verificada
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            10 Colecciones Bíblicas para Predicar
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-300">
            Explora referencias reales organizadas por Evangelios, Milagros, Parábolas, Enseñanzas, Promesas, Salvación, Fe, Perdón, Oración y Vida cristiana, y conviértelas directamente en video.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[230px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar libro, tema o palabra..."
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white pr-3.5 pl-10 text-xs font-medium text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
            />
          </div>

          <select
            aria-label="Formato para crear video bíblico"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="9:16">9:16 Vertical</option>
            <option value="1:1">1:1 Cuadrado</option>
            <option value="16:9">16:9 Horizontal</option>
          </select>
        </div>
      </div>

      {/* 10 Categories Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('Todas')}
          className={`min-h-[42px] whitespace-nowrap shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
            selectedCategory === 'Todas'
              ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#11151E] dark:text-slate-300'
          }`}
        >
          Todas ({OFFLINE_BIBLE_VERSES.length})
        </button>
        {BIBLICAL_CATEGORIES.map((cat) => {
          const count = OFFLINE_BIBLE_VERSES.filter((v) => v.category === cat).length;
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[42px] whitespace-nowrap shrink-0 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#11151E] dark:text-slate-300'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {statusNotice && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {statusNotice}
        </p>
      )}

      {/* Verse Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVerses.map((v) => {
          const scene = SCENE_MAP[v.recommendedImageId];
          const busy = producingId === v.id;
          return (
            <article
              key={v.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#11151E]"
            >
              <div>
                <div className="relative h-28 overflow-hidden bg-slate-900">
                  <img
                    src={scene.src}
                    alt={v.reference}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <p className="text-[11px] font-semibold text-amber-300">
                      {v.category} · {v.theme}
                    </p>
                    <h2 className="font-display text-xl font-bold leading-tight">
                      {v.reference}
                    </h2>
                  </div>
                </div>

                <div className="p-4">
                  <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                    <BookOpen className="mt-1 h-3.5 w-3.5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
                    <span>«{v.text}»</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-stone-200 p-3.5 dark:border-slate-800">
                <button
                  type="button"
                  disabled={producingId !== null}
                  onClick={() => void handleOneClickVerse(v)}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#B47B22] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {busy ? 'Preparando...' : 'Crear video en 1 clic'}
                </button>
                <button
                  type="button"
                  disabled={producingId !== null}
                  onClick={() => handleOpenEditor(v)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
                >
                  <Film className="h-3.5 w-3.5" />
                  Editor
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
