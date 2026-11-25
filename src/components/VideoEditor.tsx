import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  SCENE_CATALOG,
  SCENE_CATEGORIES,
  SCENE_MAP,
  VISUAL_STYLE_PRESETS,
} from '../data/sceneCatalog';
import {useOnlineStatus} from '../hooks/usePWA';
import {
  LiveAudioController,
  MUSIC_LIBRARY,
  speakSpanishSpeech,
  stopSpanishSpeech,
  synthesizeServerSpanishVoice,
} from '../services/audioEngine';
import {
  CAMERA_MOTION_LABELS,
  reDirectExistingProject,
} from '../services/autoDirector';
import {
  normalizeChristianCapitalization,
  normalizeVideoProject,
} from '../services/orthography';
import {downloadProjectJson} from '../services/storageDb';
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
import type {
  AspectRatio,
  BibleVerseEntry,
  CameraMotion,
  MusicTrackId,
  SceneCategory,
  SceneImageId,
  SceneTransition,
  VideoProject,
  VideoScene,
  VisualStyle,
  VoiceType,
} from '../types/evangeliza';
import {BibleVerseModal} from './BibleVerseModal';
import {VoiceRecorderWidget} from './VoiceRecorderWidget';

interface VideoEditorProps {
  project: VideoProject;
  onUpdateProject: (updated: VideoProject) => void;
  onSaveProject: (project: VideoProject) => Promise<void>;
}

type EditorTab = 'escenas' | 'guion' | 'audio' | 'marca';

export const VideoEditor: React.FC<VideoEditorProps> = ({
  project,
  onUpdateProject,
  onSaveProject,
}) => {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<EditorTab>('escenas');
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [sceneCategoryFilter, setSceneCategoryFilter] = useState<SceneCategory | 'Todas'>('Todas');
  const [directorNotice, setDirectorNotice] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bibleModalOpen, setBibleModalOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sampleTrackPlaying, setSampleTrackPlaying] = useState<MusicTrackId | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number>(0);
  const lastSpokenSceneRef = useRef<number>(-1);
  const audioCtrlRef = useRef<LiveAudioController | null>(null);

  const totalDuration = useMemo(() => getProjectTotalDuration(project), [project]);
  const previewSize = useMemo(
    () => getDimensionsForAspectRatio(project.aspectRatio, 'preview'),
    [project.aspectRatio],
  );

  useEffect(() => {
    audioCtrlRef.current = new LiveAudioController();
    return () => {
      audioCtrlRef.current?.stopAll();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    };
  }, [exportPreviewUrl]);

  // Preload project images whenever scenes or logo change
  useEffect(() => {
    let active = true;
    void preloadProjectImages(project).then(({imageMap, logoImg}) => {
      if (!active) return;
      imageMapRef.current = imageMap;
      logoImgRef.current = logoImg;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawProjectFrame(
            ctx,
            canvas.width,
            canvas.height,
            project,
            currentTime,
            imageMap,
            logoImg,
          );
        }
      }
    });
    return () => {
      active = false;
    };
  }, [project, currentTime]);

  // Redraw canvas when scrubbing or paused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawProjectFrame(
      ctx,
      canvas.width,
      canvas.height,
      project,
      currentTime,
      imageMapRef.current,
      logoImgRef.current,
    );
  }, [project, currentTime, previewSize]);

  // Real-time playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtrlRef.current?.stopAll();
      lastSpokenSceneRef.current = -1;
      return;
    }

    const hasRecordedOrSynthVoice =
      (project.voiceType === 'propia' && Boolean(project.customVoiceDataUrl)) ||
      (project.voiceType !== 'propia' && Boolean(project.synthesizedVoiceDataUrl));

    lastFrameTsRef.current = performance.now();
    void audioCtrlRef.current?.startMusic(
      project.musicTrackId,
      hasRecordedOrSynthVoice ? Math.round(project.musicVolume * 0.65) : project.musicVolume,
      Math.max(10, totalDuration - currentTime),
    );
    if (project.voiceType === 'propia' && project.customVoiceDataUrl) {
      audioCtrlRef.current?.playVoiceAudio(
        project.customVoiceDataUrl,
        project.narrationVolume,
      );
    } else if (project.voiceType !== 'propia' && project.synthesizedVoiceDataUrl) {
      audioCtrlRef.current?.playVoiceAudio(
        project.synthesizedVoiceDataUrl,
        project.narrationVolume,
      );
    }

    const tick = (now: number) => {
      const dt = (now - lastFrameTsRef.current) / 1000;
      lastFrameTsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }

        if (project.voiceType !== 'propia' && !project.synthesizedVoiceDataUrl) {
          const {index, scene} = getSceneAtTime(project.script.scenes, next);
          if (index !== lastSpokenSceneRef.current) {
            lastSpokenSceneRef.current = index;
            speakSpanishSpeech(
              scene.narrationText,
              project.voiceType,
              project.narrationVolume,
            );
          }
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtrlRef.current?.stopAll();
    };
  }, [
    isPlaying,
    totalDuration,
    project.musicTrackId,
    project.musicVolume,
    project.narrationVolume,
    project.voiceType,
    project.customVoiceDataUrl,
    project.synthesizedVoiceDataUrl,
    project.script.scenes,
  ]);

  const currentSceneInfo = useMemo(
    () => getSceneAtTime(project.script.scenes, currentTime),
    [project.script.scenes, currentTime],
  );

  const safeSceneIdx = Math.min(selectedSceneIdx, Math.max(0, project.script.scenes.length - 1));
  const editingScene = project.script.scenes[safeSceneIdx];

  const updateScenes = (nextScenes: VideoScene[]) => {
    const normalized = nextScenes.map((s, idx) => ({...s, order: idx + 1}));
    onUpdateProject({
      ...project,
      script: {
        ...project.script,
        scenes: normalized,
        fullNarration: normalized.map((s) => s.narrationText).join(' '),
      },
    });
  };

  const updateSingleScene = (idx: number, patch: Partial<VideoScene>) => {
    const next = project.script.scenes.map((s, i) => (i === idx ? {...s, ...patch} : s));
    updateScenes(next);
  };

  const moveScene = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= project.script.scenes.length) return;
    const copy = [...project.script.scenes];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    updateScenes(copy);
    setSelectedSceneIdx(target);
  };

  const addScene = () => {
    const newScene: VideoScene = {
      id: `scene_${Date.now().toString(36)}`,
      order: project.script.scenes.length + 1,
      durationSec: 6,
      imageId: 'inspiring_sunrise',
      visualDirection: 'Nueva toma inspiradora con luz suave.',
      onScreenText: 'Jesús es la luz del mundo',
      narrationText: 'En Jesucristo encuentras dirección, paz y vida eterna.',
      transition: 'fade',
    };
    const next = [...project.script.scenes, newScene];
    updateScenes(next);
    setSelectedSceneIdx(next.length - 1);
  };

  const duplicateScene = (idx: number) => {
    const source = project.script.scenes[idx];
    if (!source) return;
    const clone: VideoScene = {
      ...source,
      id: `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    };
    const next = [...project.script.scenes];
    next.splice(idx + 1, 0, clone);
    updateScenes(next);
    setSelectedSceneIdx(idx + 1);
  };

  const removeScene = (idx: number) => {
    if (project.script.scenes.length <= 1) return;
    const next = project.script.scenes.filter((_, i) => i !== idx);
    updateScenes(next);
    setSelectedSceneIdx(Math.max(0, idx - 1));
  };

  const handleUploadSceneImage = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateSingleScene(idx, {customImageDataUrl: String(reader.result)});
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdateProject({
        ...project,
        showLogo: true,
        ministryIdentity: {
          ...project.ministryIdentity,
          customLogoDataUrl: String(reader.result),
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectBibleVerse = (verse: BibleVerseEntry) => {
    onUpdateProject({
      ...project,
      script: {
        ...project.script,
        bibleReference: verse.reference,
        bibleVerseText: verse.text,
      },
    });
  };

  const handleSave = async () => {
    const normalized = normalizeVideoProject(project);
    onUpdateProject(normalized);
    await onSaveProject(normalized);
    setSaveFeedback('Video guardado en Mis Videos');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleExportMp4 = async () => {
    setIsPlaying(false);
    audioCtrlRef.current?.stopAll();
    stopSpanishSpeech();
    setExportError(null);
    setExportResult(null);
    if (exportPreviewUrl) {
      URL.revokeObjectURL(exportPreviewUrl);
      setExportPreviewUrl(null);
    }

    setIsExporting(true);
    try {
      const normalized = normalizeVideoProject(project);
      onUpdateProject(normalized);
      await onSaveProject(normalized);
      const res = await exportProjectToMp4(normalized, (progress) => {
        setExportProgress(progress);
      });
      setExportResult(res);
      const url = URL.createObjectURL(res.blob);
      setExportPreviewUrl(url);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al exportar el video. Intenta con una duración menor.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExported = () => {
    if (!exportResult || !exportPreviewUrl) return;
    const a = document.createElement('a');
    a.href = exportPreviewUrl;
    a.download = exportResult.filename;
    a.click();
  };

  const handleShareExported = async () => {
    if (!exportResult || !navigator.share) return;
    try {
      const file = new File([exportResult.blob], exportResult.filename, {
        type: exportResult.mimeType,
      });
      if (navigator.canShare && navigator.canShare({files: [file]})) {
        await navigator.share({
          title: project.title,
          text: `${project.title} — JAIRRESTAURA EVANGELIZA`,
          files: [file],
        });
      }
    } catch {
      // User cancelled share sheet
    }
  };

  const handleToggleMusicSample = async (id: MusicTrackId) => {
    if (!audioCtrlRef.current) return;
    if (sampleTrackPlaying === id) {
      audioCtrlRef.current.stopMusic();
      setSampleTrackPlaying(null);
      return;
    }
    setSampleTrackPlaying(id);
    await audioCtrlRef.current.startMusic(id, project.musicVolume, 15);
  };

  const handleSynthesizeServerVoice = async () => {
    if (project.voiceType === 'propia') return;
    setIsSynthesizingVoice(true);
    setVoiceNotice(null);
    const fullText =
      project.script.fullNarration ||
      project.script.scenes.map((s) => s.narrationText).join(' ');
    const res = await synthesizeServerSpanishVoice(fullText, project.voiceType);
    setIsSynthesizingVoice(false);
    if (res.audioDataUrl) {
      onUpdateProject({
        ...project,
        synthesizedVoiceDataUrl: res.audioDataUrl,
      });
      setVoiceNotice('Narración en español generada e incrustada en el proyecto para el MP4.');
    } else {
      setVoiceNotice(
        res.notice ??
          'No se pudo generar voz en línea en este momento. Puedes grabar tu propia voz abajo.',
      );
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Editor Header Bar */}
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
            <span>Editor de Video Evangelístico</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{project.aspectRatio}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{totalDuration}s totales</span>
            <span aria-hidden="true">·</span>
            <span>{project.script.bibleReference}</span>
          </div>
          <input
            type="text"
            value={project.title}
            onChange={(e) =>
              onUpdateProject({
                ...project,
                title: e.target.value,
                script: {...project.script, title: e.target.value},
              })
            }
            onBlur={() => {
              const fixedTitle = normalizeChristianCapitalization(project.title);
              if (fixedTitle !== project.title) {
                onUpdateProject({
                  ...project,
                  title: fixedTitle,
                  script: {...project.script, title: fixedTitle},
                });
              }
            }}
            aria-label="Título del proyecto de video"
            className="mt-1 w-full bg-transparent font-display text-2xl font-bold text-stone-900 focus:outline-none sm:text-3xl dark:text-[#F4F1EA]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100 dark:hover:bg-slate-800"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>

          <button
            type="button"
            onClick={() => downloadProjectJson(project)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-slate-300 dark:hover:bg-slate-800"
            title="Descargar archivo de proyecto (.json)"
          >
            <Download className="h-4 w-4" />
            .JSON
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportMp4()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
          >
            <Film className="h-4 w-4" />
            {isExporting ? 'Exportando MP4...' : 'Exportar MP4'}
          </button>
        </div>
      </div>

      {saveFeedback && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {saveFeedback}
        </p>
      )}

      {/* Main Split: Left Canvas Preview + Export Output, Right Tabs */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Stage: Canvas Video Player & MP4 Export Panel */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#11151E]">
            <div className="flex items-center justify-center rounded-xl bg-[#050609] p-3">
              <canvas
                ref={canvasRef}
                width={previewSize.width}
                height={previewSize.height}
                className={`max-h-[440px] w-auto rounded-lg object-contain shadow-lg ${
                  project.aspectRatio === '16:9' ? 'w-full' : ''
                }`}
              />
            </div>

            {/* Playback Controls */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B47B22] text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                  aria-label={isPlaying ? 'Pausar previsualización' : 'Reproducir previsualización'}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-300"
                  aria-label="Reiniciar video"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentTime(Number(e.target.value));
                    }}
                    aria-label="Línea de tiempo del video"
                    className="w-full accent-[#B47B22] dark:accent-[#EAB354]"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-stone-500 font-mono-tabular dark:text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>
                      Escena {currentSceneInfo.index + 1}/{project.script.scenes.length}
                    </span>
                    <span>{formatTime(totalDuration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Progress & Verified Result Card */}
          {(isExporting || exportProgress || exportResult || exportError) && (
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-[#11151E]">
              <h3 className="font-display text-xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Exportación Real de Video
              </h3>

              {exportProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-300">
                    <span>{exportProgress.message}</span>
                    <span className="font-mono-tabular font-semibold">
                      {exportProgress.percent}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-[#B47B22] transition-all duration-200 dark:bg-[#EAB354]"
                      style={{width: `${exportProgress.percent}%`}}
                    />
                  </div>
                </div>
              )}

              {exportError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {exportError}
                </p>
              )}

              {exportResult && exportPreviewUrl && (
                <div className="space-y-3 border-t border-stone-200 pt-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold">
                      {exportResult.verified
                        ? `Video verificado (${(exportResult.blob.size / (1024 * 1024)).toFixed(2)} MB)`
                        : `Archivo generado (${(exportResult.blob.size / (1024 * 1024)).toFixed(2)} MB)`}
                    </span>
                    <span className="font-mono-tabular">
                      {exportResult.codecSummary}
                    </span>
                  </div>

                  {exportResult.isWebmFallback && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold">
                          Aviso de formato: se generó un archivo .WEBM en lugar de .MP4
                        </p>
                        <p className="mt-0.5 leading-relaxed">
                          Tu navegador preparó un archivo compatible (.WEBM) porque el formato MP4 no estuvo disponible aquí. Puedes reproducirlo y compartirlo normalmente.
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-stone-700 dark:text-slate-300 font-mono-tabular">
                    {exportResult.verifiedWidth}×{exportResult.verifiedHeight}px ·{' '}
                    {exportResult.verifiedDurationSec > 0
                      ? `${exportResult.verifiedDurationSec.toFixed(1)}s`
                      : `${exportResult.durationSec}s`}{' '}
                    · {exportResult.hasVideoTrack ? 'Video OK' : 'Pista visual'} ·{' '}
                    {exportResult.hasVoiceAudio ? 'Voz incluida' : 'Sin pista de voz'} ·{' '}
                    {exportResult.hasMusicAudio ? 'Música incluida' : 'Sin música'}
                  </p>

                  <video
                    src={exportPreviewUrl}
                    controls
                    playsInline
                    className="max-h-72 w-full rounded-xl bg-black"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadExported}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                    >
                      <Download className="h-4 w-4" />
                      Descargar {exportResult.containerFormat === 'mp4' ? 'MP4' : 'WEBM'}
                    </button>

                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        type="button"
                        onClick={() => void handleShareExported()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      >
                        <Share2 className="h-4 w-4" />
                        Compartir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Workspace: 4 Production Tabs */}
        <div className="space-y-5 lg:col-span-7">
          {/* Segmented Tab Bar */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-stone-200 bg-stone-100 p-1.5 sm:grid-cols-4 dark:border-slate-800 dark:bg-[#11151E]">
            {[
              {id: 'escenas' as EditorTab, label: 'Escenas', icon: Layers},
              {id: 'guion' as EditorTab, label: 'Guion', icon: FileText},
              {id: 'audio' as EditorTab, label: 'Voz y Música', icon: Music},
              {id: 'marca' as EditorTab, label: 'Estilo y Firma', icon: Sliders},
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-white text-stone-900 shadow-sm dark:bg-[#1C2232] dark:text-[#EAB354]'
                      : 'text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-stone-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: Scenes & Timeline */}
          {activeTab === 'escenas' && (
            <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Línea de tiempo y escenas
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProject(reDirectExistingProject(project));
                      setDirectorNotice(
                        'Director Automático aplicado: escenas, movimiento de cámara, duración y transiciones optimizados.',
                      );
                      setTimeout(() => setDirectorNotice(null), 4500);
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#B47B22]/40 bg-[#B47B22]/10 px-3.5 py-2 text-xs font-semibold text-[#9A6B1E] hover:bg-[#B47B22]/20 dark:border-[#EAB354]/40 dark:bg-[#EAB354]/15 dark:text-[#EAB354] whitespace-nowrap"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Director Automático
                  </button>
                  <button
                    type="button"
                    onClick={addScene}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-[#090B10] whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir escena
                  </button>
                </div>
              </div>

              {directorNotice && (
                <p className="text-xs font-medium text-[#9A6B1E] dark:text-[#EAB354]">
                  {directorNotice}
                </p>
              )}

              {/* Scene Strip */}
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {project.script.scenes.map((sc, idx) => {
                  const thumb = sc.customImageDataUrl || SCENE_MAP[sc.imageId]?.src;
                  const active = idx === safeSceneIdx;
                  const startOffset = project.script.scenes
                    .slice(0, idx)
                    .reduce((acc, s) => acc + s.durationSec, 0);
                  const endOffset = startOffset + sc.durationSec;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        setSelectedSceneIdx(idx);
                        setCurrentTime(startOffset + 0.2);
                      }}
                      className={`group relative w-36 shrink-0 overflow-hidden rounded-xl border text-left transition-all ${
                        active
                          ? 'border-[#B47B22] ring-2 ring-[#B47B22]/35 dark:border-[#EAB354] dark:ring-[#EAB354]/35'
                          : 'border-stone-200 opacity-85 hover:opacity-100 dark:border-slate-800'
                      }`}
                    >
                      <img
                        src={thumb}
                        alt={`Escena ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-20 w-full object-cover"
                      />
                      <div className="bg-[#FAF8F4] px-2.5 py-1.5 dark:bg-[#090B10]">
                        <p className="flex items-center justify-between text-xs font-semibold text-stone-900 dark:text-stone-100">
                          <span>Escena {idx + 1}</span>
                          <span className="font-mono-tabular text-[11px] text-stone-600 dark:text-slate-300">
                            {formatTime(startOffset)}–{formatTime(endOffset)}
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Scene Inspector */}
              {editingScene && (
                <div className="space-y-4 border-t border-stone-200 pt-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Editando Escena {safeSceneIdx + 1} · {editingScene.durationSec}s
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => duplicateScene(safeSceneIdx)}
                        title="Duplicar escena"
                        aria-label="Duplicar escena"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={safeSceneIdx === 0}
                        onClick={() => moveScene(safeSceneIdx, -1)}
                        aria-label="Mover escena hacia atrás"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={safeSceneIdx === project.script.scenes.length - 1}
                        onClick={() => moveScene(safeSceneIdx, 1)}
                        aria-label="Mover escena hacia adelante"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={project.script.scenes.length <= 1}
                        onClick={() => removeScene(safeSceneIdx)}
                        aria-label="Eliminar escena"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scene Image Selector */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                        <ImageIcon className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                        Biblioteca visual ({SCENE_CATALOG.length} escenas · 14 categorías)
                      </span>
                      <label className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-[#FAF8F4] px-3 py-1 text-xs font-medium text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200">
                        <Upload className="h-3.5 w-3.5" />
                        Subir foto propia
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadSceneImage(safeSceneIdx, e)}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setSceneCategoryFilter('Todas')}
                        className={`min-h-[30px] shrink-0 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                          sceneCategoryFilter === 'Todas'
                            ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                            : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                        }`}
                      >
                        Todas ({SCENE_CATALOG.length})
                      </button>
                      {SCENE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSceneCategoryFilter(cat)}
                          className={`min-h-[30px] shrink-0 rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
                            sceneCategoryFilter === cat
                              ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                              : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {SCENE_CATALOG.filter(
                        (a) => sceneCategoryFilter === 'Todas' || a.category === sceneCategoryFilter,
                      ).map((asset) => {
                        const selected =
                          !editingScene.customImageDataUrl && editingScene.imageId === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() =>
                              updateSingleScene(safeSceneIdx, {
                                imageId: asset.id as SceneImageId,
                                customImageDataUrl: undefined,
                              })
                            }
                            title={`${asset.category} · ${asset.description}`}
                            className={`overflow-hidden rounded-lg border text-left transition-all ${
                              selected
                                ? 'border-[#B47B22] ring-2 ring-[#B47B22]/35 dark:border-[#EAB354]'
                                : 'border-stone-200 opacity-85 hover:opacity-100 dark:border-slate-800'
                            }`}
                          >
                            <img
                              src={asset.src}
                              alt={asset.title}
                              referrerPolicy="no-referrer"
                              className="aspect-video w-full object-cover"
                            />
                            <p className="truncate bg-[#FAF8F4] px-1.5 py-1 text-[11px] font-medium text-stone-800 dark:bg-[#090B10] dark:text-slate-200">
                              {asset.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration, Transition & Camera Motion */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                        Duración (seg):{' '}
                        <span className="font-mono-tabular">{editingScene.durationSec}s</span>
                      </label>
                      <input
                        type="range"
                        min={3}
                        max={45}
                        step={1}
                        value={editingScene.durationSec}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {durationSec: Number(e.target.value)})
                        }
                        className="mt-3 w-full accent-[#B47B22] dark:accent-[#EAB354]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="scene-transition-select"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Transición visual
                      </label>
                      <select
                        id="scene-transition-select"
                        value={editingScene.transition}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {
                            transition: e.target.value as SceneTransition,
                          })
                        }
                        className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      >
                        <option value="fade">Fundido suave</option>
                        <option value="zoom">Acercamiento cinematográfico</option>
                        <option value="slide">Deslizamiento lateral</option>
                        <option value="cut">Corte directo</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="scene-camera-select"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Movimiento de cámara
                      </label>
                      <select
                        id="scene-camera-select"
                        value={editingScene.cameraMotion ?? 'zoom_in'}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {
                            cameraMotion: e.target.value as CameraMotion,
                          })
                        }
                        className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      >
                        {(Object.entries(CAMERA_MOTION_LABELS) as Array<[CameraMotion, string]>).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Texts */}
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="scene-screen-text"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Texto en pantalla / Subtítulo
                      </label>
                      <textarea
                        id="scene-screen-text"
                        rows={2}
                        value={editingScene.onScreenText}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {onScreenText: e.target.value})
                        }
                        onBlur={() =>
                          updateSingleScene(safeSceneIdx, {
                            onScreenText: normalizeChristianCapitalization(
                              editingScene.onScreenText,
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="scene-narration-text"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Texto de narración (voz)
                      </label>
                      <textarea
                        id="scene-narration-text"
                        rows={3}
                        value={editingScene.narrationText}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {narrationText: e.target.value})
                        }
                        onBlur={() =>
                          updateSingleScene(safeSceneIdx, {
                            narrationText: normalizeChristianCapitalization(
                              editingScene.narrationText,
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="scene-visual-direction"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Descripción visual e indicación de cámara
                      </label>
                      <input
                        id="scene-visual-direction"
                        type="text"
                        value={editingScene.visualDirection}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {visualDirection: e.target.value})
                        }
                        onBlur={() =>
                          updateSingleScene(safeSceneIdx, {
                            visualDirection: normalizeChristianCapitalization(
                              editingScene.visualDirection,
                            ),
                          })
                        }
                        className="mt-1 w-full min-h-[40px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="scene-bible-ref"
                        className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                      >
                        Referencia bíblica en escena (opcional)
                      </label>
                      <input
                        id="scene-bible-ref"
                        type="text"
                        value={editingScene.bibleRef || ''}
                        onChange={(e) =>
                          updateSingleScene(safeSceneIdx, {bibleRef: e.target.value || undefined})
                        }
                        onBlur={() =>
                          updateSingleScene(safeSceneIdx, {
                            bibleRef: editingScene.bibleRef
                              ? normalizeChristianCapitalization(editingScene.bibleRef)
                              : undefined,
                          })
                        }
                        placeholder="Ej. Juan 3:16"
                        className="mt-1 w-full min-h-[40px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Full Script & Timecoded Structure */}
          {activeTab === 'guion' && (
            <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Guion Evangelístico Completo
                </h2>
                <button
                  type="button"
                  onClick={() => setBibleModalOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                  Insertar versículo bíblico
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Gancho inicial de 3 segundos
                  </label>
                  <textarea
                    rows={2}
                    value={project.script.hook3s}
                    onChange={(e) =>
                      onUpdateProject({
                        ...project,
                        script: {...project.script, hook3s: e.target.value},
                      })
                    }
                    onBlur={() =>
                      onUpdateProject({
                        ...project,
                        script: {
                          ...project.script,
                          hook3s: normalizeChristianCapitalization(project.script.hook3s),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                      Cita bíblica principal
                    </label>
                    <input
                      type="text"
                      value={project.script.bibleReference}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          script: {...project.script, bibleReference: e.target.value},
                        })
                      }
                      onBlur={() =>
                        onUpdateProject({
                          ...project,
                          script: {
                            ...project.script,
                            bibleReference: normalizeChristianCapitalization(
                              project.script.bibleReference,
                            ),
                          },
                        })
                      }
                      className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                      Texto del versículo
                    </label>
                    <input
                      type="text"
                      value={project.script.bibleVerseText}
                      onChange={(e) =>
                        onUpdateProject({
                          ...project,
                          script: {...project.script, bibleVerseText: e.target.value},
                        })
                      }
                      onBlur={() =>
                        onUpdateProject({
                          ...project,
                          script: {
                            ...project.script,
                            bibleVerseText: normalizeChristianCapitalization(
                              project.script.bibleVerseText,
                            ),
                          },
                        })
                      }
                      className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Cierre con invitación a buscar a Jesucristo
                  </label>
                  <textarea
                    rows={2}
                    value={project.script.callToAction}
                    onChange={(e) =>
                      onUpdateProject({
                        ...project,
                        script: {...project.script, callToAction: e.target.value},
                      })
                    }
                    onBlur={() =>
                      onUpdateProject({
                        ...project,
                        script: {
                          ...project.script,
                          callToAction: normalizeChristianCapitalization(
                            project.script.callToAction,
                          ),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Guion narrativo completo
                  </label>
                  <textarea
                    rows={4}
                    value={project.script.fullNarration}
                    onChange={(e) =>
                      onUpdateProject({
                        ...project,
                        script: {...project.script, fullNarration: e.target.value},
                      })
                    }
                    onBlur={() =>
                      onUpdateProject({
                        ...project,
                        script: {
                          ...project.script,
                          fullNarration: normalizeChristianCapitalization(
                            project.script.fullNarration,
                          ),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm leading-relaxed text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  />
                </div>

                {/* Timecoded Scene Breakdown Table */}
                <div className="border-t border-stone-200 pt-4 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Escalonamiento por tiempos
                  </h3>
                  <div className="mt-2 divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                    {project.script.scenes.map((sc, idx) => {
                      const start = project.script.scenes
                        .slice(0, idx)
                        .reduce((a, b) => a + b.durationSec, 0);
                      const end = start + sc.durationSec;
                      return (
                        <div key={sc.id} className="space-y-1 p-3 text-xs">
                          <div className="flex items-center justify-between text-stone-500 dark:text-slate-400">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">
                              Escena {idx + 1} · {SCENE_MAP[sc.imageId]?.title}
                            </span>
                            <span className="font-mono-tabular">
                              {formatTime(start)} – {formatTime(end)}
                            </span>
                          </div>
                          <p className="text-stone-600 dark:text-slate-400">
                            Indicación visual: {sc.visualDirection}
                          </p>
                          <p className="text-stone-800 dark:text-slate-200">{sc.narrationText}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Voice & Instrumental Music */}
          {activeTab === 'audio' && (
            <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
              <div>
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Narrador Evangelístico y Ambientación
                </h2>
                <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                  Configura la voz en español y el balance de volumen entre narración y música instrumental.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {id: 'masculina' as VoiceType, label: 'Voz masculina pastoral'},
                  {id: 'femenina' as VoiceType, label: 'Voz femenina cálida'},
                  {id: 'propia' as VoiceType, label: 'Mi propia voz grabada'},
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      onUpdateProject({
                        ...project,
                        voiceType: v.id,
                        synthesizedVoiceDataUrl:
                          v.id !== 'propia' && v.id !== project.voiceType
                            ? undefined
                            : project.synthesizedVoiceDataUrl,
                      })
                    }
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      project.voiceType === v.id
                        ? 'border-[#B47B22] bg-[#B47B22]/10 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                        : 'border-stone-200 bg-[#FAF8F4] text-stone-700 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Server TTS Synthesis Box for Real Audio in MP4 */}
              {project.voiceType !== 'propia' && (
                <div className="space-y-3 rounded-xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        Síntesis de voz pastoral en español (para MP4)
                      </p>
                      <p className="text-xs text-stone-600 dark:text-slate-300">
                        {project.synthesizedVoiceDataUrl
                          ? 'Audio de narración listo para incluirse dentro del archivo MP4.'
                          : isOnline
                            ? 'Genera la narración hablada en audio WAV para que el MP4 incluya voz y música.'
                            : 'Sin conexión: el reproductor usa lectura local del navegador y puedes grabar tu voz abajo para el MP4.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSynthesizingVoice || !isOnline}
                      onClick={() => void handleSynthesizeServerVoice()}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#B47B22] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-50 dark:bg-[#D4A24C] dark:text-[#090B10]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isSynthesizingVoice
                        ? 'Generando voz...'
                        : project.synthesizedVoiceDataUrl
                          ? 'Regenerar voz (con conexión)'
                          : 'Generar voz narrada (con conexión)'}
                    </button>
                  </div>

                  {project.synthesizedVoiceDataUrl && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-2.5 dark:border-slate-800">
                      <audio
                        src={project.synthesizedVoiceDataUrl}
                        controls
                        className="h-9 flex-1 min-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProject({...project, synthesizedVoiceDataUrl: undefined})
                        }
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-stone-300 px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        Quitar audio generado
                      </button>
                    </div>
                  )}

                  {voiceNotice && (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {voiceNotice}
                    </p>
                  )}
                </div>
              )}

              {/* Teleprompter Reading Guide + Local Voice Recorder */}
              <div className="space-y-3">
                <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 dark:border-slate-800 dark:bg-[#090B10]">
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Guía de lectura (Teleprompter para grabar tu voz)
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-800 dark:text-slate-200">
                    {project.script.fullNarration ||
                      project.script.scenes.map((s) => s.narrationText).join(' ')}
                  </p>
                </div>

                <VoiceRecorderWidget
                  customVoiceDataUrl={project.customVoiceDataUrl}
                  onChangeVoice={(url, mime) =>
                    onUpdateProject({
                      ...project,
                      voiceType: url ? 'propia' : project.voiceType,
                      customVoiceDataUrl: url,
                      customVoiceMimeType: mime,
                    })
                  }
                />
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-3 text-xs text-stone-700 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300">
                <span className="font-semibold">Audio que llevará el MP4 exportado: </span>
                {project.voiceType === 'propia' && project.customVoiceDataUrl
                  ? 'Tu voz grabada + pista instrumental'
                  : project.voiceType !== 'propia' && project.synthesizedVoiceDataUrl
                    ? 'Voz pastoral sintetizada + pista instrumental (con atenuación automática)'
                    : isOnline
                      ? 'Al exportar se intentará generar voz pastoral en español automáticamente + pista instrumental'
                      : 'Sin conexión: pista instrumental (graba tu propia voz arriba si deseas incluir narración sin internet)'}
              </div>

              {/* Volume Sliders */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-slate-300">
                    <span>Volumen de narración</span>
                    <span className="font-mono-tabular">{project.narrationVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={project.narrationVolume}
                    onChange={(e) =>
                      onUpdateProject({...project, narrationVolume: Number(e.target.value)})
                    }
                    className="mt-2 w-full accent-[#B47B22] dark:accent-[#EAB354]"
                  />
                </div>
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-slate-300">
                    <span>Volumen de música instrumental</span>
                    <span className="font-mono-tabular">{project.musicVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={project.musicVolume}
                    onChange={(e) =>
                      onUpdateProject({...project, musicVolume: Number(e.target.value)})
                    }
                    className="mt-2 w-full accent-[#B47B22] dark:accent-[#EAB354]"
                  />
                </div>
              </div>

              {/* Instrumental Track Picker */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                  Pista instrumental incluida en el MP4
                </span>
                <div className="space-y-2">
                  {MUSIC_LIBRARY.map((track) => {
                    const selected = project.musicTrackId === track.id;
                    const playing = sampleTrackPlaying === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                          selected
                            ? 'border-[#B47B22] bg-[#B47B22]/10 dark:border-[#EAB354] dark:bg-[#EAB354]/15'
                            : 'border-stone-200 bg-[#FAF8F4] dark:border-slate-800 dark:bg-[#090B10]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onUpdateProject({...project, musicTrackId: track.id})}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                            {track.name}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-slate-400">
                            {track.description}
                          </p>
                        </button>
                        {track.id !== 'sin_musica' && (
                          <button
                            type="button"
                            onClick={() => void handleToggleMusicSample(track.id)}
                            aria-label={playing ? 'Detener muestra' : 'Escuchar muestra'}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-800 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200"
                          >
                            {playing ? (
                              <Square className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Aspect Ratio, Style, Subtitles, Logo & Ministry Identity */}
          {activeTab === 'marca' && (
            <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Formato, Subtítulos e Identidad del Ministerio
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Formato de video
                  </label>
                  <div className="mt-2 flex gap-2">
                    {(['9:16', '1:1', '16:9'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onUpdateProject({...project, aspectRatio: ratio})}
                        className={`min-h-[42px] flex-1 rounded-xl border text-xs font-semibold font-mono-tabular ${
                          project.aspectRatio === ratio
                            ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                            : 'border-stone-200 bg-[#FAF8F4] text-stone-700 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="editor-style-select"
                    className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                  >
                    Estilo visual cinematográfico
                  </label>
                  <select
                    id="editor-style-select"
                    value={project.visualStyle}
                    onChange={(e) =>
                      onUpdateProject({...project, visualStyle: e.target.value as VisualStyle})
                    }
                    className="mt-2 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  >
                    {Object.entries(VISUAL_STYLE_PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Subtítulos sincronizados en pantalla
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      Muestra el texto legible en cada escena para personas que ven el video sin sonido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject({...project, showSubtitles: !project.showSubtitles})
                    }
                    className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      project.showSubtitles
                        ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                        : 'border-stone-300 bg-[#FAF8F4] text-stone-600 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-400'
                    }`}
                  >
                    {project.showSubtitles ? 'Activados' : 'Desactivados'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Logotipo superior en pantalla
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      Incorpora tu logotipo personalizado o el nombre del ministerio en la esquina superior.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 py-1.5 text-xs font-medium text-stone-800 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200">
                      <Upload className="h-3.5 w-3.5" />
                      Subir logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onUpdateProject({...project, showLogo: !project.showLogo})}
                      className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        project.showLogo
                          ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                          : 'border-stone-300 bg-[#FAF8F4] text-stone-600 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-400'
                      }`}
                    >
                      {project.showLogo ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 border-t border-stone-200 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Firma ministerial JAIRRESTAURA
                    </p>
                    <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                      {project.ministryIdentity.brandName} · {project.ministryIdentity.authorLine} ·{' '}
                      {project.ministryIdentity.motto}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProject({
                        ...project,
                        ministryIdentity: {
                          ...project.ministryIdentity,
                          enabled: !project.ministryIdentity.enabled,
                        },
                      })
                    }
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      project.ministryIdentity.enabled
                        ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                        : 'border-stone-300 bg-[#FAF8F4] text-stone-600 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-400'
                    }`}
                  >
                    {project.ministryIdentity.enabled && <Check className="h-3.5 w-3.5" />}
                    {project.ministryIdentity.enabled ? 'Firma activa' : 'Sin firma'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BibleVerseModal
        open={bibleModalOpen}
        onClose={() => setBibleModalOpen(false)}
        onSelect={handleSelectBibleVerse}
      />
    </div>
  );
};
