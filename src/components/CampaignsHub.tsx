import React, {useState} from 'react';
import {CheckCircle2, Circle, Film, Layers, Zap} from 'lucide-react';
import {EVANGELISTIC_CAMPAIGNS} from '../data/campaigns';
import {SCENE_MAP, VISUAL_STYLE_PRESETS} from '../data/sceneCatalog';
import {synthesizeServerSpanishVoice} from '../services/audioEngine';
import {createProjectFromCampaignEpisode} from '../services/scriptEngine';
import type {
  AspectRatio,
  CampaignEpisode,
  CampaignSeries,
  MinistryIdentity,
  VideoProject,
} from '../types/evangeliza';

interface CampaignsHubProps {
  ministryIdentity: MinistryIdentity;
  completedEpisodes: Record<string, number[]>;
  onToggleEpisodeComplete: (campaignId: string, day: number) => void;
  onSelectProject: (project: VideoProject) => void;
}

export const CampaignsHub: React.FC<CampaignsHubProps> = ({
  ministryIdentity,
  completedEpisodes,
  onToggleEpisodeComplete,
  onSelectProject,
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSeries>(
    EVANGELISTIC_CAMPAIGNS[0],
  );
  const [aspectOverride, setAspectOverride] = useState<AspectRatio | 'original'>('original');
  const [synthesizingDay, setSynthesizingDay] = useState<number | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const doneDays = completedEpisodes[selectedCampaign.id] || [];

  const resolveAspectRatio = (): AspectRatio | undefined =>
    aspectOverride === 'original' ? undefined : aspectOverride;

  const handleLaunchEpisode = (episode: CampaignEpisode) => {
    setStatusNotice(null);
    const proj = createProjectFromCampaignEpisode(
      selectedCampaign,
      episode,
      ministryIdentity,
      resolveAspectRatio(),
    );
    onSelectProject(proj);
  };

  const handleOneClickEpisode = async (episode: CampaignEpisode) => {
    setStatusNotice(null);
    setSynthesizingDay(episode.day);
    try {
      const proj = createProjectFromCampaignEpisode(
        selectedCampaign,
        episode,
        ministryIdentity,
        resolveAspectRatio(),
      );
      if (
        proj.voiceType !== 'propia' &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        const tts = await synthesizeServerSpanishVoice(
          proj.script.fullNarration,
          proj.voiceType,
        );
        if (tts.audioDataUrl) {
          proj.synthesizedVoiceDataUrl = tts.audioDataUrl;
        } else if (tts.notice) {
          setStatusNotice(tts.notice);
        }
      } else {
        setStatusNotice(
          'Modo sin conexión: el episodio está listo en el editor para grabar voz o exportar con música.',
        );
      }
      onSelectProject(proj);
    } finally {
      setSynthesizingDay(null);
    }
  };

  const stylePreset =
    VISUAL_STYLE_PRESETS[selectedCampaign.visualStyle ?? 'dorada_esperanza'];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
          Productor de Series Evangelísticas · Continuidad Temática y Visual
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
          Series y Campañas Evangelísticas
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-400">
          Produce series completas de videos conectados entre sí con línea bíblica continua, estilo visual unificado y formato listo para compartir día tras día.
        </p>
      </div>

      {/* Series Selector Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EVANGELISTIC_CAMPAIGNS.map((camp) => {
          const active = camp.id === selectedCampaign.id;
          const campDone = (completedEpisodes[camp.id] || []).length;
          return (
            <button
              key={camp.id}
              type="button"
              onClick={() => {
                setSelectedCampaign(camp);
                setStatusNotice(null);
              }}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? 'border-[#B47B22] bg-white dark:border-[#EAB354] dark:bg-[#171C28]'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-slate-800 dark:bg-[#11151E] dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                  <span>{camp.audience} · {camp.aspectRatio}</span>
                  <span className="font-mono-tabular font-semibold">
                    {campDone}/{camp.daysCount} cap.
                  </span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold leading-snug text-stone-900 dark:text-[#F4F1EA]">
                  {camp.title}
                </h2>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600 dark:text-slate-400">
                {camp.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Series Details & Continuity Controls */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-slate-400">
              <span>Formato base {selectedCampaign.aspectRatio}</span>
              <span aria-hidden="true">·</span>
              <span>Público: {selectedCampaign.audience}</span>
              <span aria-hidden="true">·</span>
              <span>Estilo visual: {stylePreset.label}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {doneDays.length} de {selectedCampaign.daysCount} completados
              </span>
            </div>
            <h2 className="font-display text-3xl font-bold text-stone-900 dark:text-[#F4F1EA]">
              {selectedCampaign.title}
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300">
              {selectedCampaign.description}
            </p>
            {selectedCampaign.continuityNote && (
              <p className="flex items-start gap-2 pt-1 text-xs font-medium text-[#9A6B1E] dark:text-[#EAB354]">
                <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Continuidad de la serie: {selectedCampaign.continuityNote}</span>
              </p>
            )}
          </div>

          <div className="shrink-0 space-y-1.5">
            <label
              htmlFor="series-aspect-select"
              className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              Formato de salida del episodio
            </label>
            <select
              id="series-aspect-select"
              value={aspectOverride}
              onChange={(e) =>
                setAspectOverride(e.target.value as AspectRatio | 'original')
              }
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-xs font-semibold text-stone-900 focus:border-[#B47B22] focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            >
              <option value="original">
                Original de serie ({selectedCampaign.aspectRatio})
              </option>
              <option value="9:16">9:16 Vertical (WhatsApp · Reels)</option>
              <option value="1:1">1:1 Cuadrado (Facebook · IG)</option>
              <option value="16:9">16:9 Horizontal (YouTube · Proyector)</option>
            </select>
          </div>
        </div>

        {statusNotice && (
          <p className="mt-4 text-xs font-medium text-amber-700 dark:text-amber-400">
            {statusNotice}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {selectedCampaign.episodes.map((ep) => {
            const isDone = doneDays.includes(ep.day);
            const scene = SCENE_MAP[ep.imageId];
            const isSynth = synthesizingDay === ep.day;
            return (
              <div
                key={ep.day}
                className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]"
              >
                <div className="flex gap-4">
                  <img
                    src={scene.src}
                    alt={ep.title}
                    referrerPolicy="no-referrer"
                    className="h-20 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                      <span className="font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                        {ep.bibleRef}
                      </span>
                      <span className="font-mono-tabular">
                        Capítulo {ep.day} de {selectedCampaign.daysCount}
                      </span>
                    </div>
                    <h3 className="mt-0.5 font-display text-xl font-bold leading-snug text-stone-900 dark:text-[#F4F1EA]">
                      {ep.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-slate-400">
                      {ep.summary}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onToggleEpisodeComplete(selectedCampaign.id, ep.day)}
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-stone-400 dark:text-slate-500" />
                    )}
                    {isDone ? 'Completado' : 'Marcar listo'}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchEpisode(ep)}
                      disabled={synthesizingDay !== null}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
                    >
                      <Film className="h-3.5 w-3.5" />
                      Editar escenas
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOneClickEpisode(ep)}
                      disabled={synthesizingDay !== null}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#B47B22] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {isSynth ? 'Preparando voz...' : '1 Clic con voz'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
