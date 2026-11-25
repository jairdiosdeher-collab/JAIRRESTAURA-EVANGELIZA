import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Copy,
  Download,
  Film,
  FolderArchive,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {
  LiveAudioController,
  speakSpanishSpeech,
  stopSpanishSpeech,
} from '../services/audioEngine';
import {normalizeChristianCapitalization} from '../services/orthography';
import {
  downloadProjectJson,
  exportFullBackup,
  restoreBackupFromFile,
} from '../services/storageDb';
import {
  drawProjectFrame,
  exportProjectToMp4,
  getDimensionsForAspectRatio,
  getProjectTotalDuration,
  getSceneAtTime,
  preloadProjectImages,
  type ExportProgress,
  type ExportResult,
} from '../services/videoExporter';
import type {MinistryIdentity, VideoProject} from '../types/evangeliza';

interface ProjectsVaultProps {
  projects: VideoProject[];
  ministryIdentity: MinistryIdentity;
  onUpdateMinistryIdentity: (identity: MinistryIdentity) => void;
  onOpenProject: (project: VideoProject) => void;
  onDuplicateProject: (project: VideoProject) => void;
  onDeleteProject: (id: string) => void;
  onCreateNew: () => void;
  onRefreshData: () => Promise<void>;
}

type VaultFilter = 'todos' | 'cortos' | 'largos' | '9:16' | '1:1' | '16:9';

function friendlyAspectLabel(ratio: VideoProject['aspectRatio']): string {
  switch (ratio) {
    case '9:16':
      return 'Vertical';
    case '1:1':
      return 'Cuadrado';
    case '16:9':
      return 'Horizontal';
  }
}

export const ProjectsVault: React.FC<ProjectsVaultProps> = ({
  projects,
  ministryIdentity,
  onUpdateMinistryIdentity,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onCreateNew,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<VaultFilter>('todos');
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [showBackupsPanel, setShowBackupsPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Preview Player Modal state
  const [previewProject, setPreviewProject] = useState<VideoProject | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const previewLogoRef = useRef<HTMLImageElement | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewLastTsRef = useRef<number>(0);
  const previewLastSpokenRef = useRef<number>(-1);
  const audioCtrlRef = useRef<LiveAudioController | null>(null);

  // Direct MP4 Download Modal state
  const [exportingProject, setExportingProject] = useState<VideoProject | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    audioCtrlRef.current = new LiveAudioController();
    return () => {
      audioCtrlRef.current?.stopAll();
      stopSpanishSpeech();
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    };
  }, [exportUrl]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((proj) => {
      const normalizedTitle = normalizeChristianCapitalization(proj.title).toLowerCase();
      const normalizedRef = normalizeChristianCapitalization(proj.script.bibleReference).toLowerCase();
      const matchesSearch = !q || normalizedTitle.includes(q) || normalizedRef.includes(q);
      if (!matchesSearch) return false;

      const dur = getProjectTotalDuration(proj);
      switch (activeFilter) {
        case 'cortos':
          return dur <= 45;
        case 'largos':
          return dur > 45;
        case '9:16':
        case '1:1':
        case '16:9':
          return proj.aspectRatio === activeFilter;
        case 'todos':
        default:
          return true;
      }
    });
  }, [projects, searchQuery, activeFilter]);

  // Quick Preview Canvas Sync
  const previewSize = useMemo(
    () => getDimensionsForAspectRatio(previewProject?.aspectRatio ?? '9:16', 'preview'),
    [previewProject?.aspectRatio],
  );

  useEffect(() => {
    if (!previewProject) return;
    let active = true;
    void preloadProjectImages(previewProject).then(({imageMap, logoImg}) => {
      if (!active) return;
      previewImagesRef.current = imageMap;
      previewLogoRef.current = logoImg;
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawProjectFrame(
            ctx,
            canvas.width,
            canvas.height,
            previewProject,
            previewTime,
            imageMap,
            logoImg,
          );
        }
      }
    });
    return () => {
      active = false;
    };
  }, [previewProject, previewTime, previewSize]);

  useEffect(() => {
    if (!previewProject || !isPreviewPlaying) {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      audioCtrlRef.current?.stopAll();
      stopSpanishSpeech();
      previewLastSpokenRef.current = -1;
      return;
    }

    const totalDur = getProjectTotalDuration(previewProject);
    previewLastTsRef.current = performance.now();

    const hasOwnOrSynth =
      (previewProject.voiceType === 'propia' && Boolean(previewProject.customVoiceDataUrl)) ||
      (previewProject.voiceType !== 'propia' && Boolean(previewProject.synthesizedVoiceDataUrl));

    void audioCtrlRef.current?.startMusic(
      previewProject.musicTrackId,
      hasOwnOrSynth ? Math.round(previewProject.musicVolume * 0.65) : previewProject.musicVolume,
      Math.max(8, totalDur - previewTime),
    );

    if (previewProject.voiceType === 'propia' && previewProject.customVoiceDataUrl) {
      audioCtrlRef.current?.playVoiceAudio(
        previewProject.customVoiceDataUrl,
        previewProject.narrationVolume,
      );
    } else if (
      previewProject.voiceType !== 'propia' &&
      previewProject.synthesizedVoiceDataUrl
    ) {
      audioCtrlRef.current?.playVoiceAudio(
        previewProject.synthesizedVoiceDataUrl,
        previewProject.narrationVolume,
      );
    }

    const tick = (now: number) => {
      const dt = (now - previewLastTsRef.current) / 1000;
      previewLastTsRef.current = now;
      setPreviewTime((prev) => {
        const next = prev + dt;
        if (next >= totalDur) {
          setIsPreviewPlaying(false);
          return 0;
        }
        if (
          previewProject.narrationVolume > 0 &&
          previewProject.voiceType !== 'propia' &&
          !previewProject.synthesizedVoiceDataUrl
        ) {
          const {index, scene} = getSceneAtTime(previewProject.script.scenes, next);
          if (index !== previewLastSpokenRef.current) {
            previewLastSpokenRef.current = index;
            speakSpanishSpeech(
              scene.narrationText,
              previewProject.voiceType,
              previewProject.narrationVolume,
            );
          }
        }
        return next;
      });
      previewRafRef.current = requestAnimationFrame(tick);
    };
    previewRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      audioCtrlRef.current?.stopAll();
      stopSpanishSpeech();
    };
  }, [previewProject, isPreviewPlaying]);

  const handleOpenPreview = (proj: VideoProject) => {
    setPreviewTime(0);
    setPreviewProject(proj);
    setIsPreviewPlaying(true);
  };

  const handleClosePreview = () => {
    setIsPreviewPlaying(false);
    audioCtrlRef.current?.stopAll();
    stopSpanishSpeech();
    setPreviewProject(null);
  };

  const handleDirectDownload = async (proj: VideoProject) => {
    handleClosePreview();
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
    setExportResult(null);
    setExportError(null);
    setExportingProject(proj);
    setExportProgress({
      stage: 'preparing',
      percent: 0,
      message: 'Preparando tu mensaje...',
    });

    try {
      const res = await exportProjectToMp4(proj, (progress) => {
        setExportProgress(progress);
      });
      const url = URL.createObjectURL(res.blob);
      setExportResult(res);
      setExportUrl(url);
    } catch {
      setExportError(
        'No fue posible generar el video en este momento. Puedes abrirlo en «Editar» y probar de nuevo.',
      );
    }
  };

  const handleCloseDownloadModal = () => {
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
    setExportingProject(null);
    setExportResult(null);
    setExportProgress(null);
    setExportError(null);
  };

  const handleExportAll = async () => {
    setBackupError(null);
    const payload = await exportFullBackup();
    setBackupNotice(
      `Copia descargada con ${payload.projects.length} videos guardados.`,
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupError(null);
    setBackupNotice(null);
    try {
      const res = await restoreBackupFromFile(file);
      await onRefreshData();
      setBackupNotice(
        `Restauración completada: ${res.importedProjects} video(s) recuperado(s) sin borrar los que ya tenías.`,
      );
    } catch (err) {
      setBackupError(
        err instanceof Error ? err.message : 'No se pudo leer el archivo seleccionado.',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filterButtons: Array<{id: VaultFilter; label: string}> = [
    {id: 'todos', label: 'Todos'},
    {id: 'cortos', label: 'Cortos (15–30s)'},
    {id: 'largos', label: 'Largos (60s–3m)'},
    {id: '9:16', label: 'Vertical'},
    {id: '1:1', label: 'Cuadrado'},
    {id: '16:9', label: 'Horizontal'},
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Mis Videos
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-400">
            Tus mensajes se guardan automáticamente en este dispositivo. Aquí puedes reproducirlos, editarlos o descargarlos cuando quieras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowBackupsPanel((prev) => !prev)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <FolderArchive className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
            Copias de seguridad
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Crear nuevo video
          </button>
        </div>
      </div>

      {/* Search & Simple Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#11151E]">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar video por título..."
            aria-label="Buscar video por título"
            className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-[#FAF8F4] pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterButtons.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeFilter === f.id
                  ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'bg-[#FAF8F4] text-stone-700 hover:bg-stone-200/70 dark:bg-[#090B10] dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Backup & Ministry Signature Panel */}
      {showBackupsPanel && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E] lg:col-span-7">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Guardar o recuperar copias
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                Guarda todos tus videos en un archivo para llevarlos a otro dispositivo o recuperarlos más adelante. Nunca borramos tus videos repetidos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void handleExportAll()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-[#090B10] dark:hover:bg-white"
              >
                <Download className="h-4 w-4" />
                Exportar respaldo completo (.json)
              </button>

              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-900">
                <Upload className="h-4 w-4" />
                Restaurar respaldo (.json)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void handleImportFile(e)}
                  className="sr-only"
                />
              </label>
            </div>

            {backupNotice && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {backupNotice}
              </p>
            )}
            {backupError && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {backupError}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E] lg:col-span-5">
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
              Firma de tus videos
            </h2>
            <input
              type="text"
              value={ministryIdentity.brandName}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, brandName: e.target.value})
              }
              onBlur={() =>
                onUpdateMinistryIdentity({
                  ...ministryIdentity,
                  brandName: normalizeChristianCapitalization(ministryIdentity.brandName),
                })
              }
              aria-label="Nombre del ministerio"
              className="w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
            <input
              type="text"
              value={ministryIdentity.authorLine}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, authorLine: e.target.value})
              }
              onBlur={() =>
                onUpdateMinistryIdentity({
                  ...ministryIdentity,
                  authorLine: normalizeChristianCapitalization(ministryIdentity.authorLine),
                })
              }
              aria-label="Autor o pastor"
              className="w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
            <input
              type="text"
              value={ministryIdentity.motto}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, motto: e.target.value})
              }
              onBlur={() =>
                onUpdateMinistryIdentity({
                  ...ministryIdentity,
                  motto: normalizeChristianCapitalization(ministryIdentity.motto),
                })
              }
              aria-label="Lema ministerial"
              className="w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-xs tracking-wide text-stone-800 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200"
            />
          </div>
        </div>
      )}

      {/* Video Cards Grid */}
      {projects.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#11151E]">
          <Film className="mx-auto h-10 w-10 text-stone-400 dark:text-slate-500" />
          <h2 className="mt-3 font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
            Aún no tienes videos guardados
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
            Pulsa «Crear nuevo video» para preparar tu primer mensaje en pocos minutos.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#B47B22] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10]"
          >
            Crear mi primer video
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#11151E]">
          <p className="text-base font-semibold text-stone-800 dark:text-stone-200">
            No encontramos videos que coincidan con tu búsqueda o filtro.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('todos');
            }}
            className="mt-3 text-sm font-semibold text-[#9A6B1E] hover:underline dark:text-[#EAB354]"
          >
            Ver todos mis videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => {
            const firstScene = proj.script.scenes[0];
            const thumb =
              firstScene?.customImageDataUrl ||
              (firstScene ? SCENE_MAP[firstScene.imageId]?.src : undefined) ||
              SCENE_MAP.inspiring_sunrise.src;
            const totalDur = getProjectTotalDuration(proj);
            const dateLabel = new Date(proj.updatedAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <article
                key={proj.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#11151E]"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-slate-950">
                    <img
                      src={thumb}
                      alt={normalizeChristianCapitalization(proj.title)}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-xs text-amber-300 font-mono-tabular">
                        {totalDur} seg · {friendlyAspectLabel(proj.aspectRatio)}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 font-display text-xl font-bold leading-snug text-white">
                        {normalizeChristianCapitalization(proj.title)}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-1 p-4">
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {dateLabel} · {normalizeChristianCapitalization(proj.script.bibleReference)}
                    </p>
                    <p className="line-clamp-2 text-sm text-stone-700 dark:text-slate-300">
                      {normalizeChristianCapitalization(proj.script.hook3s)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-stone-200 px-4 py-3 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenProject(proj)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview(proj)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:hover:bg-slate-800"
                    >
                      <Play className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                      Reproducir
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDirectDownload(proj)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#B47B22] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-stone-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => downloadProjectJson(proj)}
                      className="hover:text-stone-800 hover:underline dark:hover:text-stone-200"
                    >
                      Guardar copia (.json)
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj)}
                        aria-label="Duplicar video"
                        className="inline-flex items-center gap-1 hover:text-stone-800 dark:hover:text-stone-200"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        aria-label="Eliminar video"
                        className="inline-flex items-center gap-1 text-red-600 hover:underline dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Quick Video Preview Modal */}
      {previewProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Reproducir video"
        >
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#11151E]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                  Reproduciendo video
                </p>
                <h3 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  {normalizeChristianCapitalization(previewProject.title)}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                aria-label="Cerrar reproductor"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-center rounded-2xl bg-[#050609] p-3">
              <canvas
                ref={previewCanvasRef}
                width={previewSize.width}
                height={previewSize.height}
                className={`max-h-[380px] w-auto rounded-lg object-contain ${
                  previewProject.aspectRatio === '16:9' ? 'w-full' : ''
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewPlaying((p) => !p)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2 text-sm font-bold text-white dark:bg-[#D4A24C] dark:text-[#090B10]"
              >
                {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPreviewPlaying ? 'Pausar' : 'Reproducir'}
              </button>

              <button
                type="button"
                onClick={() => void handleDirectDownload(previewProject)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              >
                <Download className="h-4 w-4" />
                Descargar video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Video Download Modal */}
      {exportingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Descargar video"
        >
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#11151E]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                  Preparando archivo de video
                </p>
                <h3 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  {normalizeChristianCapitalization(exportingProject.title)}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDownloadModal}
                aria-label="Cerrar ventana de descarga"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!exportResult && !exportError && (
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-5 text-center dark:border-slate-800 dark:bg-[#090B10]">
                <p className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                  {exportProgress?.message || 'Preparando tu mensaje...'}
                </p>
                {exportProgress &&
                  (exportProgress.stage === 'frames' ||
                    (exportProgress.stage === 'encoding' && exportProgress.percent >= 20)) && (
                    <div className="space-y-1">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                        <div
                          className="h-full bg-[#B47B22] transition-all dark:bg-[#D4A24C]"
                          style={{width: `${exportProgress.percent}%`}}
                        />
                      </div>
                      <p className="font-mono-tabular text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                        {exportProgress.percent}%
                      </p>
                    </div>
                  )}
              </div>
            )}

            {exportError && (
              <div className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <p>{exportError}</p>
                <button
                  type="button"
                  onClick={handleCloseDownloadModal}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-stone-900"
                >
                  Cerrar
                </button>
              </div>
            )}

            {exportResult && exportUrl && (
              <div className="space-y-4">
                <video
                  src={exportUrl}
                  controls
                  playsInline
                  className="max-h-[320px] w-full rounded-xl bg-black"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-stone-600 dark:text-slate-400">
                    {exportResult.codecSummary}
                  </span>
                  <a
                    href={exportUrl}
                    download={exportResult.filename}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#B47B22] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                  >
                    <Download className="h-4 w-4" />
                    Descargar video ahora
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
