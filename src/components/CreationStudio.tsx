import React, {useEffect, useRef, useState} from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  Clapperboard,
  Film,
  FolderArchive,
  Heart,
  Library,
  MapPin,
  MessageSquareQuote,
  Music,
  Play,
  Smile,
  Sparkles,
  Square,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  SCENE_CATALOG,
  SCENE_CATEGORIES,
  VISUAL_STYLE_PRESETS,
} from '../data/sceneCatalog';
import {useOnlineStatus} from '../hooks/usePWA';
import {LiveAudioController, MUSIC_LIBRARY} from '../services/audioEngine';
import {
  produceOneClickEvangelisticVideo,
  directScriptSequence,
} from '../services/autoDirector';
import {
  createProjectFromInput,
  generateLocalEvangelisticScript,
  generateOnlineGeminiScript,
  PRODUCTION_FORMATS,
  type ProductionFormatPreset,
} from '../services/scriptEngine';
import type {
  AppSection,
  AspectRatio,
  BibleVerseEntry,
  MinistryIdentity,
  MusicTrackId,
  ProductionFormat,
  SceneCategory,
  TargetAudience,
  VideoDuration,
  VideoProject,
  VisualStyle,
  VoiceType,
} from '../types/evangeliza';
import {BibleVerseModal} from './BibleVerseModal';
import {VoiceRecorderWidget} from './VoiceRecorderWidget';

interface CreationStudioProps {
  ministryIdentity: MinistryIdentity;
  savedProjectsCount?: number;
  onUpdateMinistryIdentity: (identity: MinistryIdentity) => void;
  onProjectCreated: (project: VideoProject) => void;
  onOpenSermons: () => void;
  onNavigateSection: (section: AppSection) => void;
}

const TOPIC_SUGGESTIONS = [
  'Jesús puede cambiar tu vida',
  'Jesús te ama y tiene un plan para ti',
  'Cómo vencer la ansiedad con la paz de Dios',
  'La familia restaurada bajo la gracia de Cristo',
  'Nunca es tarde para volver a Dios',
  'El perdón que sana el corazón herido',
];

const DURATIONS: Array<{value: VideoDuration; label: string}> = [
  {value: 15, label: '15 seg'},
  {value: 30, label: '30 seg'},
  {value: 60, label: '60 seg'},
  {value: 90, label: '90 seg'},
  {value: 180, label: '3 min'},
];

const FORMATS: Array<{value: AspectRatio; label: string; hint: string}> = [
  {value: '9:16', label: '9:16 Vertical', hint: 'WhatsApp · TikTok · Reels'},
  {value: '1:1', label: '1:1 Cuadrado', hint: 'Instagram · Facebook'},
  {value: '16:9', label: '16:9 Horizontal', hint: 'YouTube · Proyector'},
];

const AUDIENCES: TargetAudience[] = [
  'General',
  'Jóvenes',
  'Adolescentes',
  'Niños',
  'Familias',
  'Matrimonios',
  'Personas con ansiedad',
  'Nuevos creyentes',
];

export const CreationStudio: React.FC<CreationStudioProps> = ({
  ministryIdentity,
  savedProjectsCount = 0,
  onUpdateMinistryIdentity,
  onProjectCreated,
  onOpenSermons,
  onNavigateSection,
}) => {
  const isOnline = useOnlineStatus();

  const [productionFormat, setProductionFormat] = useState<ProductionFormat>('evangelistico_30_60');
  const [topic, setTopic] = useState('Hay esperanza para ti en Jesucristo');
  const [audience, setAudience] = useState<TargetAudience>('General');
  const [duration, setDuration] = useState<VideoDuration>(60);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('dorada_esperanza');
  const [voiceType, setVoiceType] = useState<VoiceType>('masculina');
  const [musicTrackId, setMusicTrackId] = useState<MusicTrackId>('piano_emotivo');
  const [customBibleRef, setCustomBibleRef] = useState('Jeremías 29:11');
  const [customBibleText, setCustomBibleText] = useState(
    'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
  );
  const [customCallToAction, setCustomCallToAction] = useState(
    'Hoy entrega tu corazón a Jesucristo. Su paz y esperanza te esperan con brazos abiertos.',
  );
  const [customVoiceDataUrl, setCustomVoiceDataUrl] = useState<string | undefined>(undefined);
  const [customVoiceMimeType, setCustomVoiceMimeType] = useState<string | undefined>(undefined);

  const [activePreviewSceneIdx, setActivePreviewSceneIdx] = useState(6); // salvation_grace
  const [selectedCategory, setSelectedCategory] = useState<SceneCategory | 'Todas'>('Todas');
  const [hasCustomBibleOverride, setHasCustomBibleOverride] = useState(false);
  const [bibleModalOpen, setBibleModalOpen] = useState(false);
  const [isGeneratingOnline, setIsGeneratingOnline] = useState(false);
  const [isProducingOneClick, setIsProducingOneClick] = useState(false);
  const [oneClickStatus, setOneClickStatus] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<MusicTrackId | null>(null);

  const audioCtrlRef = useRef<LiveAudioController | null>(null);

  useEffect(() => {
    audioCtrlRef.current = new LiveAudioController();
    return () => {
      audioCtrlRef.current?.stopAll();
    };
  }, []);

  const handleToggleMusicSample = async (id: MusicTrackId) => {
    const ctrl = audioCtrlRef.current;
    if (!ctrl) return;
    if (playingTrackId === id) {
      ctrl.stopMusic();
      setPlayingTrackId(null);
      return;
    }
    setPlayingTrackId(id);
    await ctrl.startMusic(id, 55, 16);
  };

  const handleSelectVerse = (verse: BibleVerseEntry) => {
    setCustomBibleRef(verse.reference);
    setCustomBibleText(verse.text);
    setHasCustomBibleOverride(true);
    const idx = SCENE_CATALOG.findIndex((s) => s.id === verse.recommendedImageId);
    if (idx >= 0) setActivePreviewSceneIdx(idx);
  };

  const handleSelectFormatPreset = (preset: ProductionFormatPreset) => {
    setProductionFormat(preset.id);
    setDuration(preset.defaultDuration);
    setAspectRatio(preset.defaultAspectRatio);
    setAudience(preset.defaultAudience);
    setMusicTrackId(preset.defaultMusic);
    setTopic(preset.defaultTopic);
    const firstImgIdx = SCENE_CATALOG.findIndex((s) => s.id === preset.recommendedScenes[0]);
    if (firstImgIdx >= 0) {
      setActivePreviewSceneIdx(firstImgIdx);
    }
  };

  const handleGenerateLocal = () => {
    audioCtrlRef.current?.stopAll();
    setPlayingTrackId(null);
    setStatusNotice(null);

    const input = {
      topic,
      productionFormat,
      audience,
      duration,
      aspectRatio,
      visualStyle,
      voiceType,
      musicTrackId,
      customBibleRef: hasCustomBibleOverride ? customBibleRef : undefined,
      customBibleText: hasCustomBibleOverride ? customBibleText : undefined,
      customCallToAction,
      ministryIdentity,
    };

    const rawScript = generateLocalEvangelisticScript(input);
    const {script} = directScriptSequence(rawScript, {
      topic: input.topic,
      productionFormat: input.productionFormat,
      targetDuration: input.duration,
    });
    const project = createProjectFromInput(input, script);
    if (customVoiceDataUrl) {
      project.customVoiceDataUrl = customVoiceDataUrl;
      project.customVoiceMimeType = customVoiceMimeType;
    }
    onProjectCreated(project);
  };

  const handleGenerateOnline = async () => {
    audioCtrlRef.current?.stopAll();
    setPlayingTrackId(null);
    setIsGeneratingOnline(true);
    setStatusNotice(null);

    const input = {
      topic,
      productionFormat,
      audience,
      duration,
      aspectRatio,
      visualStyle,
      voiceType,
      musicTrackId,
      customBibleRef: hasCustomBibleOverride ? customBibleRef : undefined,
      customBibleText: hasCustomBibleOverride ? customBibleText : undefined,
      customCallToAction,
      ministryIdentity,
    };

    const result = await generateOnlineGeminiScript(input);
    setIsGeneratingOnline(false);
    if (result.notice) {
      setStatusNotice(result.notice);
    }

    const {script} = directScriptSequence(result.script, {
      topic: input.topic,
      productionFormat: input.productionFormat,
      targetDuration: input.duration,
    });
    const project = createProjectFromInput(input, script);
    if (customVoiceDataUrl) {
      project.customVoiceDataUrl = customVoiceDataUrl;
      project.customVoiceMimeType = customVoiceMimeType;
    }
    onProjectCreated(project);
  };

  const handleOneClickProduce = async () => {
    audioCtrlRef.current?.stopAll();
    setPlayingTrackId(null);
    setStatusNotice(null);
    setIsProducingOneClick(true);
    setOneClickStatus('1/3 Dirigiendo guion bíblico y secuencia cinematográfica...');

    try {
      const input = {
        topic: topic.trim() || 'Jesús puede cambiar tu vida',
        productionFormat,
        audience,
        duration,
        aspectRatio,
        visualStyle,
        voiceType,
        musicTrackId,
        customBibleRef: hasCustomBibleOverride ? customBibleRef : undefined,
        customBibleText: hasCustomBibleOverride ? customBibleText : undefined,
        customCallToAction,
        ministryIdentity,
      };

      const {project, notice} = await produceOneClickEvangelisticVideo(input, (msg) => {
        setOneClickStatus(msg);
      });

      if (customVoiceDataUrl) {
        project.customVoiceDataUrl = customVoiceDataUrl;
        project.customVoiceMimeType = customVoiceMimeType;
      }
      if (notice) {
        setStatusNotice(notice);
      }
      onProjectCreated(project);
    } finally {
      setIsProducingOneClick(false);
      setOneClickStatus(null);
    }
  };

  const featuredScene = SCENE_CATALOG[activePreviewSceneIdx] ?? SCENE_CATALOG[0];
  const filteredCatalog =
    selectedCategory === 'Todas'
      ? SCENE_CATALOG
      : SCENE_CATALOG.filter((s) => s.category === selectedCategory);
  const stylePreset = VISUAL_STYLE_PRESETS[visualStyle];

  const scrollToStudioForm = () => {
    const el = document.getElementById('studio-topic-input');
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'center'});
      window.setTimeout(() => el.focus(), 250);
    }
  };

  return (
    <div className="space-y-10">
      {/* Panel Principal de Accesos Directos (Fase 4) */}
      <section
        aria-label="Panel principal de accesos directos"
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
              Panel Principal · Estudio Profesional de Producción Evangelística
            </p>
            <h2 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl dark:text-[#F4F1EA]">
              ¿Qué deseas producir hoy para Cristo?
            </h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-slate-400">
            Acceso gratuito · Día y Noche · Sin registro
          </span>
        </div>

        {/* 8 Requested Main Shortcuts */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <button
            type="button"
            onClick={scrollToStudioForm}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <Clapperboard className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                CREAR VIDEO
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Estudio personalizado
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={isProducingOneClick || isGeneratingOnline}
            onClick={() => void handleOneClickProduce()}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-[#B47B22] bg-[#B47B22] p-3.5 text-left text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
          >
            <Zap className="h-5 w-5" />
            <div>
              <p className="text-xs font-extrabold tracking-wide">
                VIDEO EN UN CLIC
              </p>
              <p className="text-[11px] opacity-90">
                {isProducingOneClick ? 'Produciendo...' : 'Guion + voz + escenas'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('predicaciones')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <BookOpen className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                PREDICACIONES
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                12 mensajes bíblicos
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('ninos')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <Smile className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                NIÑOS
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Historias, cantos y fe
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('jovenes')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <Users className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                ADOLESCENTES
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Evangelismo juvenil
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('campanas')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <Calendar className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                CAMPAÑAS
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                10 series de hasta 30 días
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('invitaciones')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <MapPin className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                INVITACIONES
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Cultos y MMM La Gaviota
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('proyectos')}
            className="flex min-h-[82px] flex-col items-start justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 text-left transition-colors hover:border-[#B47B22] hover:bg-white dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354] dark:hover:bg-[#171C28]"
          >
            <FolderArchive className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <p className="text-xs font-extrabold tracking-wide text-stone-900 dark:text-[#F4F1EA]">
                MIS VIDEOS
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                {savedProjectsCount > 0
                  ? `${savedProjectsCount} guardados localmente`
                  : 'Archivo y respaldos'}
              </p>
            </div>
          </button>
        </div>

        {/* Dedicated Additional Studio Accesses */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigateSection('testimonios')}
            className="flex min-h-[54px] items-center justify-between gap-3 rounded-xl border border-stone-200 bg-[#FAF8F4] px-4 py-2.5 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354]"
          >
            <span className="flex items-center gap-2.5 text-xs font-bold text-stone-900 dark:text-[#F4F1EA]">
              <Heart className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
              Estudio de Testimonios Reales (Escritos o Grabados)
            </span>
            <MessageSquareQuote className="h-4 w-4 shrink-0 text-stone-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('biblia')}
            className="flex min-h-[54px] items-center justify-between gap-3 rounded-xl border border-stone-200 bg-[#FAF8F4] px-4 py-2.5 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354]"
          >
            <span className="flex items-center gap-2.5 text-xs font-bold text-stone-900 dark:text-[#F4F1EA]">
              <Library className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
              Biblioteca Bíblica Ampliada (10 Colecciones RVR1960)
            </span>
            <BookOpen className="h-4 w-4 shrink-0 text-stone-400" />
          </button>
        </div>
      </section>

      {/* Hero Editorial Split */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wide text-[#9A6B1E] dark:text-[#EAB354]">
              Estudio de Producción Evangelística · Autónomo y Gratuito
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl dark:text-[#F4F1EA] [text-wrap:balance]">
              Convierte la Palabra de Dios en videos que abrazan el corazón
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-stone-600 dark:text-slate-300">
              Escribe un tema bíblico y el estudio prepara automáticamente el guion con gancho inicial,
              escenas cinematográficas, subtítulos sincronizados, narración, música instrumental y archivo MP4 real.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
            <label
              htmlFor="studio-topic-input"
              className="block text-sm font-semibold text-stone-900 dark:text-stone-100"
            >
              1. ¿Sobre qué mensaje deseas crear el video hoy?
            </label>
            <input
              id="studio-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej. Cómo encontrar paz en Cristo en medio de la tormenta..."
              className="w-full min-h-[48px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 text-base text-stone-900 placeholder:text-stone-400 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:placeholder:text-slate-500 dark:focus:border-[#EAB354]"
            />

            <div className="flex flex-wrap gap-2">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    topic === s
                      ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#171C28] dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProducingOneClick || isGeneratingOnline}
                onClick={() => void handleOneClickProduce()}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#D4A24C] sm:flex-none dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
              >
                <Zap className="h-4 w-4" />
                {isProducingOneClick
                  ? 'Preparando video completo...'
                  : 'Video evangelístico en un clic'}
              </button>

              <button
                type="button"
                disabled={isProducingOneClick}
                onClick={handleGenerateLocal}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
              >
                <Film className="h-4 w-4" />
                Solo guion y escenas
              </button>

              <button
                type="button"
                disabled={isGeneratingOnline || isProducingOneClick}
                onClick={() => void handleGenerateOnline()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
              >
                {isOnline ? (
                  <Sparkles className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-500" />
                )}
                {isGeneratingOnline ? 'Redactando con IA...' : 'Enriquecer con IA (con conexión)'}
              </button>

              <button
                type="button"
                onClick={onOpenSermons}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-medium text-stone-700 underline-offset-4 hover:underline dark:text-slate-300"
              >
                <BookOpen className="h-4 w-4" />
                Ver 12 mensajes preparados
              </button>
            </div>

            {oneClickStatus && (
              <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                {oneClickStatus}
              </p>
            )}

            {statusNotice && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {statusNotice}
              </p>
            )}
          </div>
        </div>

        {/* Right Hero Column: Cohesive Scene Preview Showcase */}
        <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#11151E] lg:col-span-5">
          <div className="relative flex-1 overflow-hidden rounded-xl bg-slate-950 min-h-[260px]">
            <img
              src={featuredScene.src}
              alt={featuredScene.description}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{backgroundColor: stylePreset.overlayCss}}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="flex items-center gap-2 text-xs text-amber-300/95">
                <span>{featuredScene.category}</span>
                <span aria-hidden="true">·</span>
                <span>{customBibleRef}</span>
              </div>
              <p className="mt-1.5 font-display text-2xl font-semibold leading-snug text-white">
                {topic || featuredScene.title}
              </p>
              {ministryIdentity.enabled && (
                <p className="mt-2 text-xs text-stone-300">
                  {ministryIdentity.brandName} · {ministryIdentity.authorLine}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-700 dark:text-slate-300">
              <span>Biblioteca visual · 14 categorías bíblicas y ministeriales</span>
              <span className="font-mono-tabular font-semibold">{SCENE_CATALOG.length} escenas</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('Todas')}
                className={`min-h-[30px] shrink-0 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                  selectedCategory === 'Todas'
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
                  onClick={() => {
                    setSelectedCategory(cat);
                    const firstIdx = SCENE_CATALOG.findIndex((s) => s.category === cat);
                    if (firstIdx >= 0) setActivePreviewSceneIdx(firstIdx);
                  }}
                  className={`min-h-[30px] shrink-0 rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                      : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {filteredCatalog.map((scene) => {
                const realIdx = SCENE_CATALOG.findIndex((s) => s.id === scene.id);
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActivePreviewSceneIdx(realIdx)}
                    title={`${scene.category}: ${scene.title} — ${scene.description}`}
                    className={`group relative overflow-hidden rounded-lg border transition-all ${
                      realIdx === activePreviewSceneIdx
                        ? 'border-[#B47B22] ring-2 ring-[#B47B22]/45 dark:border-[#EAB354] dark:ring-[#EAB354]/45'
                        : 'border-stone-200 opacity-85 hover:opacity-100 dark:border-slate-800'
                    }`}
                  >
                    <img
                      src={scene.src}
                      alt={scene.title}
                      referrerPolicy="no-referrer"
                      className="aspect-video w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
            <p className="truncate text-[11px] text-stone-600 dark:text-slate-400">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {featuredScene.title}:
              </span>{' '}
              {featuredScene.description}
            </p>
          </div>
        </div>
      </section>

      {/* Specialized Evangelical Production Formats (Fase 4) */}
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
              Formatos de Producción Evangelística
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300">
              Elige el propósito del video para ajustar automáticamente ritmo, escenas recomendadas, música y duración.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            9 formatos ministeriales listos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTION_FORMATS.map((preset) => {
            const active = productionFormat === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectFormatPreset(preset)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-[#B47B22] bg-[#B47B22]/10 dark:border-[#EAB354] dark:bg-[#EAB354]/15'
                    : 'border-stone-200 bg-[#FAF8F4] hover:border-stone-300 dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {preset.title}
                  </span>
                  <span className="text-[11px] font-semibold font-mono-tabular text-[#9A6B1E] dark:text-[#EAB354]">
                    {preset.defaultDuration >= 60
                      ? `${Math.round(preset.defaultDuration / 60)}m`
                      : `${preset.defaultDuration}s`}{' '}
                    · {preset.defaultAspectRatio}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-slate-300">
                  {preset.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Studio Parameters Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1: Público, Duración, Formato y Estilo */}
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
              2. Formato y Audiencia
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
              Adapta el mensaje según a quién deseas alcanzar hoy.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              Público objetivo
            </span>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCES.map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setAudience(aud)}
                  className={`min-h-[42px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                    audience === aud
                      ? 'border-[#B47B22] bg-[#B47B22]/10 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                      : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300 dark:hover:bg-slate-900'
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              Duración del video
            </span>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`min-h-[42px] flex-1 rounded-xl border px-3 py-2 text-xs font-semibold font-mono-tabular whitespace-nowrap transition-colors ${
                    duration === d.value
                      ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                      : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              Formato de pantalla
            </span>
            <div className="space-y-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setAspectRatio(f.value)}
                  className={`flex min-h-[46px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    aspectRatio === f.value
                      ? 'border-[#B47B22] bg-[#B47B22]/10 dark:border-[#EAB354] dark:bg-[#EAB354]/15'
                      : 'border-stone-200 bg-[#FAF8F4] hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {f.label}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-slate-400">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="visual-style-select"
              className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              Estilo visual cinematográfico
            </label>
            <select
              id="visual-style-select"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
              className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            >
              {Object.entries(VISUAL_STYLE_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label} — {preset.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Column 2: Narración y Música Instrumental */}
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
              3. Narrador y Música
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
              Voz pastoral cálida y ambientación instrumental original sin derechos de autor.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              Voz del narrador
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                {id: 'masculina' as VoiceType, label: 'Masculina pastoral'},
                {id: 'femenina' as VoiceType, label: 'Femenina cálida'},
                {id: 'propia' as VoiceType, label: 'Mi propia voz'},
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceType(v.id)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    voiceType === v.id
                      ? 'border-[#B47B22] bg-[#B47B22]/10 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                      : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {voiceType === 'propia' && (
            <VoiceRecorderWidget
              customVoiceDataUrl={customVoiceDataUrl}
              onChangeVoice={(url, mime) => {
                setCustomVoiceDataUrl(url);
                setCustomVoiceMimeType(mime);
              }}
            />
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                <Music className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                Música instrumental de fondo
              </span>
            </div>
            <div className="space-y-2">
              {MUSIC_LIBRARY.map((track) => {
                const selected = musicTrackId === track.id;
                const isPlaying = playingTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                      selected
                        ? 'border-[#B47B22] bg-[#B47B22]/10 dark:border-[#EAB354] dark:bg-[#EAB354]/15'
                        : 'border-stone-200 bg-[#FAF8F4] dark:border-slate-800 dark:bg-[#090B10]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setMusicTrackId(track.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {track.name}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-slate-400">
                        {track.mood} · {track.description}
                      </p>
                    </button>
                    {track.id !== 'sin_musica' && (
                      <button
                        type="button"
                        onClick={() => void handleToggleMusicSample(track.id)}
                        aria-label={isPlaying ? `Detener ${track.name}` : `Escuchar ${track.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200 dark:hover:bg-slate-800"
                      >
                        {isPlaying ? (
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

        {/* Column 3: Texto Bíblico, Llamado e Identidad del Ministerio */}
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                4. Escritura e Identidad
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                Fundamento bíblico, invitación final y firma ministerial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBibleModalOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-900 whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
              Elegir versículo
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="bible-ref-input"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Referencia bíblica
              </label>
              <input
                id="bible-ref-input"
                type="text"
                value={customBibleRef}
                onChange={(e) => {
                  setCustomBibleRef(e.target.value);
                  setHasCustomBibleOverride(true);
                }}
                className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="bible-text-input"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Texto bíblico
              </label>
              <textarea
                id="bible-text-input"
                rows={3}
                value={customBibleText}
                onChange={(e) => {
                  setCustomBibleText(e.target.value);
                  setHasCustomBibleOverride(true);
                }}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm leading-relaxed text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="cta-text-input"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Llamado evangelístico final
              </label>
              <textarea
                id="cta-text-input"
                rows={2}
                value={customCallToAction}
                onChange={(e) => setCustomCallToAction(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm leading-relaxed text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Identidad del Ministerio
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-slate-400">
                  {ministryIdentity.brandName} · {ministryIdentity.authorLine}
                  <br />
                  {ministryIdentity.motto}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ministryIdentity.enabled}
                onClick={() =>
                  onUpdateMinistryIdentity({
                    ...ministryIdentity,
                    enabled: !ministryIdentity.enabled,
                  })
                }
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  ministryIdentity.enabled
                    ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                    : 'border-stone-300 bg-[#FAF8F4] text-stone-600 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-400'
                }`}
              >
                {ministryIdentity.enabled && <Check className="h-3.5 w-3.5" />}
                {ministryIdentity.enabled ? 'Firma activa' : 'Desactivada'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-amber-500" />
              )}
              {isOnline
                ? 'Conexión lista · Modo autónomo y modo IA disponibles'
                : 'Sin conexión · Biblioteca bíblica, música y escenas activas'}
            </span>
          </div>
        </div>
      </section>

      <BibleVerseModal
        open={bibleModalOpen}
        onClose={() => setBibleModalOpen(false)}
        onSelect={handleSelectVerse}
      />
    </div>
  );
};
