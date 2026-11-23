import React, {useMemo, useState} from 'react';
import {BookOpen, Search, X} from 'lucide-react';
import {BIBLICAL_CATEGORIES, OFFLINE_BIBLE_VERSES} from '../data/bibleVerses';
import type {BiblicalCategory, BibleVerseEntry} from '../types/evangeliza';

interface BibleVerseModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (verse: BibleVerseEntry) => void;
}

export const BibleVerseModal: React.FC<BibleVerseModalProps> = ({open, onClose, onSelect}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BiblicalCategory | 'Todas'>('Todas');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFLINE_BIBLE_VERSES.filter((v) => {
      const matchesCat = selectedCategory === 'Todas' || v.category === selectedCategory;
      const matchesQuery =
        !q ||
        v.reference.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q) ||
        v.theme.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, selectedCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bible-modal-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-stone-200 bg-[#FAF8F4] shadow-2xl dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <h2
              id="bible-modal-title"
              className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]"
            >
              Biblioteca Bíblica ({OFFLINE_BIBLE_VERSES.length} versículos · 10 categorías)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar biblioteca bíblica"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/70 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-stone-200 px-6 py-4 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por libro, palabra o tema (ej. milagro, perdón, Juan 3:16)..."
              className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-white pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:placeholder:text-slate-500 dark:focus:border-[#EAB354]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('Todas')}
              className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'Todas'
                  ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            {BIBLICAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-slate-400">
              No se encontraron versículos con ese criterio.
            </p>
          ) : (
            filtered.map((verse) => (
              <button
                key={verse.id}
                type="button"
                onClick={() => {
                  onSelect(verse);
                  onClose();
                }}
                className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#171C28] dark:hover:border-[#EAB354]"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                  <span className="font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                    {verse.reference}
                  </span>
                  <span>
                    {verse.category} · {verse.theme}
                  </span>
                </div>
                <p className="mt-1.5 font-display text-lg leading-snug text-stone-900 dark:text-[#F4F1EA]">
                  «{verse.text}»
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
