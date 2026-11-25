import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Film,
  FolderArchive,
  Mic,
  Music,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  Share2,
  Sliders,
  Sparkles,
  Square,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {
  LiveAudioController,
  MUSIC_LIBRARY,
  speakSpanishSpeech,
  stopSpanishSpeech,
} from '../services/audioEngine';
import {directScriptSequence} from '../services/autoDirector';
import {
  normalizeChristianCapitalization,
  normalizeVideoProject,
} from '../services/orthography';
import {
  createProjectFromInput,
  generateLocalEvangelisticScript,
} from '../services/scriptEngine';
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
  MinistryIdentity,
  MusicTrackId,
  ProductionFormat,
  SceneImageId,
  TargetAudience,
  VideoDuration,
  VideoProject,
  VideoScene,
  VisualStyle,
  VoiceType,
} from '../types/evangeliza';
import {BibleVerseModal} from './BibleVerseModal';
import type {WizardEntryIntent} from './HomeHub';
import {VoiceRecorderWidget} from './VoiceRecorderWidget';
import {listLocalMp4Videos, type LocalMp4Video} from '../services/localMp4Library';

export type WizardMessageCategoryId =
  | 'esperanza'
  | 'salvacion'
  | 'familia'
  | 'oracion'
  | 'restauracion'
  | 'ninos'
  | 'jovenes'
  | 'invitaciones'
  | 'testimonios'
  | 'predicaciones';

export type WizardVisualThemeId =
  | 'recomendado'
  | 'biblicas'
  | 'naturaleza'
  | 'familia'
  | 'iglesia';

interface MessageCategoryOption {
  id: WizardMessageCategoryId;
  title: string;
  description: string;
  imageId: SceneImageId;
  defaultTopic: string;
  productionFormat: ProductionFormat;
  audience: TargetAudience;
  defaultDuration: VideoDuration;
  defaultMusic: MusicTrackId;
  defaultStyle: VisualStyle;
  bibleRef: string;
  bibleText: string;
  recommendedScenes: SceneImageId[];
}

const MESSAGE_CATEGORIES: MessageCategoryOption[] = [
  {
    id: 'esperanza',
    title: 'Esperanza',
    description: 'Aliento y paz de Dios para momentos difíciles.',
    imageId: 'finding_hope',
    defaultTopic: 'Con Dios siempre hay esperanza para tu corazón',
    productionFormat: 'evangelistico_30_60',
    audience: 'Personas con ansiedad',
    defaultDuration: 60,
    defaultMusic: 'esperanza_ambiental',
    defaultStyle: 'dorada_esperanza',
    bibleRef: 'Jeremías 29:11',
    bibleText:
      'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    recommendedScenes: ['finding_hope', 'inspiring_sunrise', 'open_bible_light', 'praying_people'],
  },
  {
    id: 'salvacion',
    title: 'Salvación',
    description: 'El amor de Jesucristo que perdona y da vida nueva.',
    imageId: 'salvation_grace',
    defaultTopic: 'Dios te ama y Jesucristo transforma tu vida',
    productionFormat: 'evangelistico_30_60',
    audience: 'General',
    defaultDuration: 60,
    defaultMusic: 'piano_emotivo',
    defaultStyle: 'solemne_calvario',
    bibleRef: 'Juan 3:16',
    bibleText:
      'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
    recommendedScenes: ['calvary_cross', 'salvation_grace', 'empty_tomb', 'open_bible_light'],
  },
  {
    id: 'familia',
    title: 'Familia',
    description: 'Unión, perdón y bendición de Dios para el hogar.',
    imageId: 'restored_family',
    defaultTopic: 'Dios restaura y bendice tu familia hoy',
    productionFormat: 'matrimonios',
    audience: 'Familias',
    defaultDuration: 60,
    defaultMusic: 'piano_emotivo',
    defaultStyle: 'luz_hogar',
    bibleRef: 'Josué 24:15',
    bibleText: 'Pero yo y mi casa serviremos a Jehová.',
    recommendedScenes: ['restored_family', 'christian_marriage', 'praying_people', 'open_bible_light'],
  },
  {
    id: 'oracion',
    title: 'Oración',
    description: 'Confianza para hablar con Dios sabiendo que Él escucha.',
    imageId: 'praying_people',
    defaultTopic: 'Dios escucha tu oración hoy',
    productionFormat: 'evangelistico_30_60',
    audience: 'General',
    defaultDuration: 30,
    defaultMusic: 'adoracion_instrumental',
    defaultStyle: 'nocturno_contemplativo',
    bibleRef: 'Jeremías 33:3',
    bibleText:
      'Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.',
    recommendedScenes: ['praying_people', 'open_bible_light', 'inspiring_sunrise', 'finding_hope'],
  },
  {
    id: 'restauracion',
    title: 'Restauración',
    description: 'Sanidad interior y un nuevo comienzo en Cristo.',
    imageId: 'testimony_freedom',
    defaultTopic: 'Nunca es tarde para empezar de nuevo con Dios',
    productionFormat: 'testimonio',
    audience: 'General',
    defaultDuration: 60,
    defaultMusic: 'cinematografica',
    defaultStyle: 'amanecer_gloria',
    bibleRef: '2 Corintios 5:17',
    bibleText:
      'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.',
    recommendedScenes: ['testimony_freedom', 'salvation_grace', 'inspiring_sunrise', 'empty_tomb'],
  },
  {
    id: 'ninos',
    title: 'Niños',
    description: 'Historias bíblicas tiernas y valores cristianos.',
    imageId: 'kids_good_shepherd',
    defaultTopic: 'Jesús ama y cuida a los niños como el Buen Pastor',
    productionFormat: 'infantil',
    audience: 'Niños',
    defaultDuration: 60,
    defaultMusic: 'esperanza_ambiental',
    defaultStyle: 'dorada_esperanza',
    bibleRef: 'Mateo 19:14',
    bibleText:
      'Dejad a los niños venir a mí, y no se lo impidáis; porque de los tales es el reino de los cielos.',
    recommendedScenes: ['kids_good_shepherd', 'kids_jesus_children', 'children_bible', 'biblical_landscape'],
  },
  {
    id: 'jovenes',
    title: 'Jóvenes',
    description: 'Identidad, propósito y fe firme para nuevas generaciones.',
    imageId: 'youth_fellowship',
    defaultTopic: 'Tu propósito verdadero está en Dios',
    productionFormat: 'adolescentes',
    audience: 'Jóvenes',
    defaultDuration: 30,
    defaultMusic: 'cinematografica',
    defaultStyle: 'amanecer_gloria',
    bibleRef: '1 Timoteo 4:12',
    bibleText:
      'Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.',
    recommendedScenes: ['youth_fellowship', 'youth_worship_light', 'teens_purpose', 'open_bible_light'],
  },
  {
    id: 'invitaciones',
    title: 'Invitaciones',
    description: 'Invita a tu iglesia, culto especial o reunión familiar.',
    imageId: 'church_invitation_welcome',
    defaultTopic: 'Te invitamos con alegría a la casa de Dios',
    productionFormat: 'invitacion_culto',
    audience: 'Familias',
    defaultDuration: 30,
    defaultMusic: 'adoracion_instrumental',
    defaultStyle: 'dorada_esperanza',
    bibleRef: 'Salmos 122:1',
    bibleText: 'Yo me alegré con los que me decían: A la casa de Jehová iremos.',
    recommendedScenes: [
      'church_invitation_welcome',
      'church_worship',
      'restored_family',
      'open_bible_light',
    ],
  },
  {
    id: 'testimonios',
    title: 'Testimonios',
    description: 'Comparte lo que Dios ha hecho en tu vida o familia.',
    imageId: 'open_bible_light',
    defaultTopic: 'Gracias a Dios mi vida tiene nueva esperanza',
    productionFormat: 'testimonio',
    audience: 'General',
    defaultDuration: 60,
    defaultMusic: 'piano_emotivo',
    defaultStyle: 'luz_hogar',
    bibleRef: 'Salmos 107:1',
    bibleText: 'Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia.',
    recommendedScenes: ['testimony_freedom', 'praying_people', 'open_bible_light', 'inspiring_sunrise'],
  },
  {
    id: 'predicaciones',
    title: 'Predicaciones',
    description: 'Reflexión bíblica clara con enseñanza y llamado a la fe.',
    imageId: 'jesus_teaching',
    defaultTopic: 'La Palabra de Dios trae luz a tu camino',
    productionFormat: 'predicacion_3min',
    audience: 'General',
    defaultDuration: 90,
    defaultMusic: 'piano_emotivo',
    defaultStyle: 'solemne_calvario',
    bibleRef: 'Salmos 119:105',
    bibleText: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
    recommendedScenes: ['jesus_teaching', 'open_bible_light', 'biblical_landscape', 'calvary_cross', 'empty_tomb'],
  },
];

const VISUAL_THEME_OPTIONS: Array<{
  id: WizardVisualThemeId;
  title: string;
  description: string;
  previewImageId: SceneImageId;
  visualStyle: VisualStyle;
  pool: SceneImageId[];
}> = [
  {
    id: 'recomendado',
    title: 'Diseño recomendado',
    description: 'Selecciona automáticamente las mejores imágenes para tu mensaje.',
    previewImageId: 'salvation_grace',
    visualStyle: 'dorada_esperanza',
    pool: [],
  },
  {
    id: 'biblicas',
    title: 'Imágenes bíblicas',
    description: 'Escenas de Jesús, la Biblia abierta, Galilea y la Cruz.',
    previewImageId: 'jesus_teaching',
    visualStyle: 'solemne_calvario',
    pool: ['jesus_teaching', 'open_bible_light', 'biblical_landscape', 'calvary_cross', 'empty_tomb', 'miracles_of_jesus'],
  },
  {
    id: 'naturaleza',
    title: 'Naturaleza y esperanza',
    description: 'Amaneceres luminosos, paisajes serenos y horizontes de paz.',
    previewImageId: 'inspiring_sunrise',
    visualStyle: 'amanecer_gloria',
    pool: ['inspiring_sunrise', 'finding_hope', 'biblical_landscape', 'salvation_grace', 'parable_sower'],
  },
  {
    id: 'familia',
    title: 'Familia y restauración',
    description: 'Hogares unidos, oración familiar, perdón y vida nueva.',
    previewImageId: 'restored_family',
    visualStyle: 'luz_hogar',
    pool: ['restored_family', 'christian_marriage', 'praying_people', 'testimony_freedom', 'kids_good_shepherd'],
  },
  {
    id: 'iglesia',
    title: 'Invitación a la iglesia',
    description: 'Templo iluminado, alabanza congregacional y bienvenida cálida.',
    previewImageId: 'church_invitation_welcome',
    visualStyle: 'dorada_esperanza',
    pool: ['church_invitation_welcome', 'church_worship', 'street_evangelism', 'open_bible_light', 'restored_family'],
  },
];

const DURATION_OPTIONS: Array<{value: VideoDuration; label: string; hint: string}> = [
  {value: 15, label: '15 seg', hint: 'Muy breve'},
  {value: 30, label: '30 seg', hint: 'Ideal estados'},
  {value: 60, label: '60 seg', hint: 'Recomendado'},
  {value: 90, label: '90 seg', hint: 'Reflexión'},
  {value: 180, label: '3 min', hint: 'Mensaje amplio'},
];

const FORMAT_OPTIONS: Array<{value: AspectRatio; label: string; hint: string}> = [
  {value: '9:16', label: 'Vertical', hint: 'Celular, WhatsApp y TikTok'},
  {value: '1:1', label: 'Cuadrado', hint: 'Facebook e Instagram'},
  {value: '16:9', label: 'Horizontal', hint: 'YouTube y pantalla grande'},
];

const STEP_LABELS = [
  '1. Elegir mensaje',
  '2. Personalizar',
  '3. Elegir voz',
  '4. Aspecto y vista previa',
  '5. Crear y descargar',
];

function splitMessageIntoScenes(
  fullText: string,
  baseScenes: VideoScene[],
  targetDuration: VideoDuration,
  bibleRef: string,
): VideoScene[] {
  const cleanText = normalizeChristianCapitalization(fullText.trim());
  const rawSentences = cleanText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const count = Math.max(3, Math.min(6, baseScenes.length || (targetDuration <= 30 ? 4 : 5)));
  const sentences =
    rawSentences.length >= count
      ? rawSentences
      : rawSentences.length > 0
        ? rawSentences
        : [cleanText];

  const grouped: string[] = [];
  if (sentences.length <= count) {
    for (let i = 0; i < count; i++) {
      grouped.push(sentences[Math.min(i, sentences.length - 1)]);
    }
  } else {
    const chunkSize = Math.ceil(sentences.length / count);
    for (let i = 0; i < count; i++) {
      const slice = sentences.slice(i * chunkSize, (i + 1) * chunkSize);
      grouped.push(slice.join(' ') || sentences[sentences.length - 1]);
    }
  }

  return Array.from({length: count}, (_, idx) => {
    const template = baseScenes[idx % Math.max(1, baseScenes.length)];
    const narrationText = normalizeChristianCapitalization(grouped[idx] || cleanText);
    const shortWords = narrationText.split(/\s+/).slice(0, 12).join(' ');
    const onScreenText =
      shortWords.length < narrationText.length ? `${shortWords}…` : narrationText;

    return {
      id: template?.id || `wizard_scene_${Date.now().toString(36)}_${idx}`,
      order: idx + 1,
      durationSec: Math.max(3, Math.round(targetDuration / count)),
      imageId: template?.imageId || 'salvation_grace',
      customImageDataUrl: template?.customImageDataUrl,
      visualDirection: template?.visualDirection || 'Escena inspiradora con movimiento suave.',
      onScreenText,
      narrationText,
      bibleRef: idx === count - 1 || idx === 1 ? bibleRef : template?.bibleRef,
      transition: template?.transition || 'fade',
      cameraMotion: template?.cameraMotion,
    };
  });
}

function mapExportStageFriendly(progress: ExportProgress): {
  title: string;
  detail: string;
  percent: number | null;
} {
  switch (progress.stage) {
    case 'preparing':
    case 'voice':
      return {
        title: 'Preparando tu mensaje',
        detail: progress.message,
        percent: null,
      };
    case 'frames':
      return {
        title: 'Organizando las escenas',
        detail: progress.message,
        percent: progress.percent,
      };
    case 'audio':
      return {
        title: 'Añadiendo tu narración',
        detail: progress.message,
        percent: null,
      };
    case 'encoding':
    case 'verifying':
      return {
        title: 'Finalizando el video',
        detail: progress.message,
        percent: progress.percent >= 20 ? progress.percent : null,
      };
    case 'done':
    default:
      return {
        title: '¡Tu video está listo!',
        detail: progress.message,
        percent: 100,
      };
  }
}

interface GuidedVideoWizardProps {
  ministryIdentity: MinistryIdentity;
  initialIntent: WizardEntryIntent;
  initialProject?: VideoProject | null;
  onSaveProject: (project: VideoProject) => Promise<void>;
  onOpenAdvancedEditor: (project: VideoProject) => void;
  onGoToMyVideos: () => void;
  onCancel: () => void;
}

export const GuidedVideoWizard: React.FC<GuidedVideoWizardProps> = ({
  ministryIdentity,
  initialIntent,
  initialProject = null,
  onSaveProject,
  onOpenAdvancedEditor,
  onGoToMyVideos,
  onCancel,
}) => {
  const initialCategory: MessageCategoryOption = useMemo(() => {
    if (initialIntent === 'invitacion') {
      return MESSAGE_CATEGORIES.find((c) => c.id === 'invitaciones')!;
    }
    return MESSAGE_CATEGORIES[0];
  }, [initialIntent]);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(initialProject ? 2 : 1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<WizardMessageCategoryId>(
    initialProject?.productionFormat === 'invitacion_culto'
      ? 'invitaciones'
      : initialProject?.productionFormat === 'infantil'
        ? 'ninos'
        : initialProject?.productionFormat === 'adolescentes'
          ? 'jovenes'
          : initialProject?.productionFormat === 'matrimonios'
            ? 'familia'
            : initialProject?.productionFormat === 'testimonio'
              ? 'testimonios'
              : initialProject?.productionFormat === 'predicacion_3min'
                ? 'predicaciones'
                : initialCategory.id,
  );

  // Step 1 & 2 state
  const [customTopic, setCustomTopic] = useState(initialProject?.topic ?? '');
  const [title, setTitle] = useState(
    initialProject?.title ?? initialCategory.defaultTopic,
  );
  const [messageText, setMessageText] = useState(
    initialProject?.script.fullNarration ?? '',
  );
  const [bibleRef, setBibleRef] = useState(
    initialProject?.script.bibleReference ?? initialCategory.bibleRef,
  );
  const [bibleVerseText, setBibleVerseText] = useState(
    initialProject?.script.bibleVerseText ?? initialCategory.bibleText,
  );
  const [duration, setDuration] = useState<VideoDuration>(
    initialProject?.targetDuration ?? initialCategory.defaultDuration,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialProject?.aspectRatio ?? '9:16',
  );

  // Friendly optional fields when invitation category is chosen
  const [churchName, setChurchName] = useState('Iglesia Cristiana MMM La Gaviota');
  const [churchSchedule, setChurchSchedule] = useState('Domingos 9:00 AM y 5:00 PM');
  const [churchAddress, setChurchAddress] = useState('Ibagué, Tolima · Puertas abiertas para tu familia');

  // Step 3 state (Voice & Music)
  const [voiceType, setVoiceType] = useState<VoiceType>(
    initialProject?.voiceType ?? (initialIntent === 'voz' ? 'propia' : 'masculina'),
  );
  const [noNarration, setNoNarration] = useState(
    initialProject ? initialProject.narrationVolume === 0 : false,
  );
  const [customVoiceDataUrl, setCustomVoiceDataUrl] = useState<string | undefined>(
    initialProject?.customVoiceDataUrl,
  );
  const [customVoiceMimeType, setCustomVoiceMimeType] = useState<string | undefined>(
    initialProject?.customVoiceMimeType,
  );
  const [musicTrackId, setMusicTrackId] = useState<MusicTrackId>(
    initialProject?.musicTrackId ?? initialCategory.defaultMusic,
  );
  const [playingSampleId, setPlayingSampleId] = useState<MusicTrackId | null>(null);

  // Step 4 state (Visual Aspect & Live Preview)
  const [visualTheme, setVisualTheme] = useState<WizardVisualThemeId>('recomendado');
  const [localMp4Videos, setLocalMp4Videos] = useState<LocalMp4Video[]>([]);
  const [backgroundVideoId, setBackgroundVideoId] = useState('');
  const [backgroundVideoBlob, setBackgroundVideoBlob] = useState<Blob | null>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);
  const [hasEditedStep2, setHasEditedStep2] = useState(Boolean(initialProject));
  const [projectDraft, setProjectDraft] = useState<VideoProject | null>(initialProject);

  // Step 5 state (Export & Finish)
  const [isCreating, setIsCreating] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const [bibleModalOpen, setBibleModalOpen] = useState(false);

  // Preview Canvas refs (Step 4)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const lastSpokenIdxRef = useRef<number>(-1);
  const audioCtrlRef = useRef<LiveAudioController | null>(null);
  const resultVideoRef = useRef<HTMLVideoElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);

  const activeCategory = useMemo(
    () => MESSAGE_CATEGORIES.find((c) => c.id === selectedCategoryId) ?? MESSAGE_CATEGORIES[0],
    [selectedCategoryId],
  );

  useEffect(() => {
    let alive = true;
    void listLocalMp4Videos().then(items => { if (alive) setLocalMp4Videos(items); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const selected = localMp4Videos.find(item => item.id === backgroundVideoId);
    setBackgroundVideoBlob(selected?.blob ?? null);
    if (!selected) { setBackgroundVideoUrl(null); return; }
    const url = URL.createObjectURL(selected.blob);
    setBackgroundVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [backgroundVideoId, localMp4Videos]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || !backgroundVideoUrl) return;
    video.pause(); video.currentTime = 0; video.load();
  }, [backgroundVideoUrl]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || !backgroundVideoBlob || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const target = previewTime % video.duration;
    if (Math.abs(video.currentTime - target) > 0.35) video.currentTime = target;
  }, [previewTime, backgroundVideoBlob]);

  useEffect(() => {
    audioCtrlRef.current = new LiveAudioController();
    return () => {
      audioCtrlRef.current?.stopAll();
      stopSpanishSpeech();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    };
  }, [exportPreviewUrl]);

  const stopAllAudio = useCallback(() => {
    setIsPreviewPlaying(false);
    setPlayingSampleId(null);
    audioCtrlRef.current?.stopAll();
    stopSpanishSpeech();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const buildRecommendedDraft = useCallback(
    (
      cat: MessageCategoryOption,
      topicOverride?: string,
      durOverride?: VideoDuration,
      ratioOverride?: AspectRatio,
      verseRefOverride?: string,
      verseTextOverride?: string,
    ): {
      nextTitle: string;
      nextMessage: string;
      nextBibleRef: string;
      nextBibleText: string;
      project: VideoProject;
    } => {
      const effectiveTopic = normalizeChristianCapitalization(
        (topicOverride ?? '').trim() || cat.defaultTopic,
      );
      const effectiveDur = durOverride ?? cat.defaultDuration;
      const effectiveRatio = ratioOverride ?? aspectRatio;
      const effectiveRef = normalizeChristianCapitalization(verseRefOverride || cat.bibleRef);
      const effectiveVerse = normalizeChristianCapitalization(verseTextOverride || cat.bibleText);

      let invitationExtra = '';
      if (cat.id === 'invitaciones' && churchName.trim()) {
        invitationExtra = ` Te esperamos en ${churchName.trim()} (${churchSchedule.trim() || 'este domingo'}) en ${churchAddress.trim() || 'nuestra congregación'}.`;
      }

      const rawScript = generateLocalEvangelisticScript({
        topic: effectiveTopic,
        productionFormat: cat.productionFormat,
        audience: cat.audience,
        duration: effectiveDur,
        aspectRatio: effectiveRatio,
        visualStyle: cat.defaultStyle,
        voiceType,
        musicTrackId: cat.defaultMusic,
        customBibleRef: effectiveRef,
        customBibleText: effectiveVerse,
        ministryIdentity,
      });

      const fullMsg = normalizeChristianCapitalization(
        `${rawScript.fullNarration}${invitationExtra}`,
      );
      const splitScenes = splitMessageIntoScenes(
        fullMsg,
        rawScript.scenes,
        effectiveDur,
        effectiveRef,
      );
      const {script} = directScriptSequence(
        {...rawScript, title: effectiveTopic, fullNarration: fullMsg, scenes: splitScenes},
        {
          topic: effectiveTopic,
          productionFormat: cat.productionFormat,
          targetDuration: effectiveDur,
        },
      );

      const proj = createProjectFromInput(
        {
          topic: effectiveTopic,
          productionFormat: cat.productionFormat,
          audience: cat.audience,
          duration: effectiveDur,
          aspectRatio: effectiveRatio,
          visualStyle: cat.defaultStyle,
          voiceType,
          musicTrackId: cat.defaultMusic,
          customBibleRef: effectiveRef,
          customBibleText: effectiveVerse,
          ministryIdentity,
        },
        script,
      );

      return {
        nextTitle: normalizeChristianCapitalization(proj.title),
        nextMessage: normalizeChristianCapitalization(proj.script.fullNarration),
        nextBibleRef: normalizeChristianCapitalization(proj.script.bibleReference),
        nextBibleText: normalizeChristianCapitalization(proj.script.bibleVerseText),
        project: proj,
      };
    },
    [aspectRatio, churchAddress, churchName, churchSchedule, ministryIdentity, voiceType],
  );

  const buildSynchronizedProject = useCallback(
    (themeOverride?: WizardVisualThemeId): VideoProject => {
      const themeChoice =
        VISUAL_THEME_OPTIONS.find((t) => t.id === (themeOverride ?? visualTheme)) ??
        VISUAL_THEME_OPTIONS[0];
      const cleanTitle = normalizeChristianCapitalization(
        title.trim() || customTopic.trim() || activeCategory.defaultTopic,
      );
      const cleanMessage = normalizeChristianCapitalization(
        messageText.trim() || `${cleanTitle}. ${bibleVerseText}`,
      );
      const cleanRef = normalizeChristianCapitalization(bibleRef.trim() || activeCategory.bibleRef);
      const cleanVerse = normalizeChristianCapitalization(
        bibleVerseText.trim() || activeCategory.bibleText,
      );

      const base =
        projectDraft ??
        buildRecommendedDraft(
          activeCategory,
          cleanTitle,
          duration,
          aspectRatio,
          cleanRef,
          cleanVerse,
        ).project;

      const updatedScenes = splitMessageIntoScenes(
        cleanMessage,
        base.script.scenes,
        duration,
        cleanRef,
      );

      const pool =
        themeChoice.id === 'recomendado'
          ? activeCategory.recommendedScenes
          : themeChoice.pool;

      const themedScenes: VideoScene[] = updatedScenes.map((sc, idx) => ({
        ...sc,
        imageId:
          themeChoice.id === 'recomendado' && base.script.scenes[idx]?.customImageDataUrl
            ? sc.imageId
            : pool[idx % pool.length] || sc.imageId,
      }));

      const {script} =
        themeChoice.id === 'recomendado'
          ? directScriptSequence(
              {
                ...base.script,
                title: cleanTitle,
                fullNarration: cleanMessage,
                bibleReference: cleanRef,
                bibleVerseText: cleanVerse,
                scenes: themedScenes,
              },
              {
                topic: cleanTitle,
                productionFormat: activeCategory.productionFormat,
                targetDuration: duration,
                preserveCustomImages: true,
              },
            )
          : {
              script: {
                ...base.script,
                title: cleanTitle,
                fullNarration: cleanMessage,
                bibleReference: cleanRef,
                bibleVerseText: cleanVerse,
                scenes: themedScenes,
              },
            };

      const styleToUse =
        themeChoice.id === 'recomendado' ? activeCategory.defaultStyle : themeChoice.visualStyle;

      return normalizeVideoProject({
        ...base,
        title: cleanTitle,
        topic: cleanTitle,
        productionFormat: activeCategory.productionFormat,
        audience: activeCategory.audience,
        targetDuration: duration,
        aspectRatio,
        visualStyle: styleToUse,
        voiceType: noNarration ? 'masculina' : voiceType,
        narrationVolume: noNarration ? 0 : 94,
        musicTrackId,
        musicVolume: noNarration ? 62 : 34,
        customVoiceDataUrl: voiceType === 'propia' && !noNarration ? customVoiceDataUrl : undefined,
        customVoiceMimeType:
          voiceType === 'propia' && !noNarration ? customVoiceMimeType : undefined,
        ministryIdentity,
        script,
      });
    },
    [
      activeCategory,
      aspectRatio,
      bibleRef,
      bibleVerseText,
      buildRecommendedDraft,
      customTopic,
      customVoiceDataUrl,
      customVoiceMimeType,
      duration,
      messageText,
      ministryIdentity,
      musicTrackId,
      noNarration,
      projectDraft,
      title,
      visualTheme,
      voiceType,
    ],
  );

  // Keep synchronized project ready in Step 4 and Step 5
  const previewProject = useMemo(() => {
    if (step < 4) return projectDraft;
    return buildSynchronizedProject();
  }, [buildSynchronizedProject, projectDraft, step]);

  const previewSize = useMemo(
    () => getDimensionsForAspectRatio(aspectRatio, 'preview'),
    [aspectRatio],
  );

  // Preload & draw Step 4 canvas
  useEffect(() => {
    if (step !== 4 || !previewProject) return;
    let active = true;
    void preloadProjectImages(previewProject).then(({imageMap, logoImg}) => {
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
  }, [step, previewProject, previewTime, previewSize]);

  useEffect(() => {
    if (step !== 4 || !previewProject) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawProjectFrame(
      ctx,
      canvas.width,
      canvas.height,
      previewProject,
      previewTime,
      imageMapRef.current,
      logoImgRef.current,
      backgroundVideoRef.current,
    );
  }, [step, previewProject, previewTime, previewSize]);

  // Step 4 preview animation loop
  useEffect(() => {
    if (step !== 4 || !isPreviewPlaying || !previewProject) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtrlRef.current?.stopAll();
      stopSpanishSpeech();
      lastSpokenIdxRef.current = -1;
      return;
    }

    const totalDur = getProjectTotalDuration(previewProject);
    lastTsRef.current = performance.now();

    const hasCustomVoice =
      previewProject.voiceType === 'propia' &&
      Boolean(previewProject.customVoiceDataUrl) &&
      previewProject.narrationVolume > 0;

    void audioCtrlRef.current?.startMusic(
      previewProject.musicTrackId,
      hasCustomVoice ? Math.round(previewProject.musicVolume * 0.65) : previewProject.musicVolume,
      Math.max(8, totalDur - previewTime),
    );

    if (hasCustomVoice && previewProject.customVoiceDataUrl) {
      audioCtrlRef.current?.playVoiceAudio(
        previewProject.customVoiceDataUrl,
        previewProject.narrationVolume,
      );
    }

    const tick = (now: number) => {
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      setPreviewTime((prev) => {
        const next = prev + dt;
        if (next >= totalDur) {
          setIsPreviewPlaying(false);
          return 0;
        }
        if (
          previewProject.narrationVolume > 0 &&
          previewProject.voiceType !== 'propia'
        ) {
          const {index, scene} = getSceneAtTime(previewProject.script.scenes, next);
          if (index !== lastSpokenIdxRef.current) {
            lastSpokenIdxRef.current = index;
            speakSpanishSpeech(
              scene.narrationText,
              previewProject.voiceType,
              previewProject.narrationVolume,
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
      stopSpanishSpeech();
    };
  }, [step, isPreviewPlaying, previewProject]);

  const handleSelectCategory = (cat: MessageCategoryOption) => {
    setSelectedCategoryId(cat.id);
    setHasEditedStep2(false);
    setMusicTrackId(cat.defaultMusic);
    setDuration(cat.defaultDuration);
  };

  const handleContinueFromStep1 = () => {
    stopAllAudio();
    if (!hasEditedStep2 || !messageText.trim()) {
      const res = buildRecommendedDraft(
        activeCategory,
        customTopic,
        duration,
        aspectRatio,
      );
      setTitle(res.nextTitle);
      setMessageText(res.nextMessage);
      setBibleRef(res.nextBibleRef);
      setBibleVerseText(res.nextBibleText);
      setProjectDraft(res.project);
      setMusicTrackId(activeCategory.defaultMusic);
    }
    setStep(2);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleUseRecommendedMessage = () => {
    const res = buildRecommendedDraft(
      activeCategory,
      customTopic,
      duration,
      aspectRatio,
    );
    setTitle(res.nextTitle);
    setMessageText(res.nextMessage);
    setBibleRef(res.nextBibleRef);
    setBibleVerseText(res.nextBibleText);
    setProjectDraft(res.project);
    setHasEditedStep2(false);
  };

  const handleContinueFromStep2 = () => {
    stopAllAudio();
    setTitle((prev) => normalizeChristianCapitalization(prev));
    setMessageText((prev) => normalizeChristianCapitalization(prev));
    setStep(3);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleContinueFromStep3 = () => {
    stopAllAudio();
    const synced = buildSynchronizedProject();
    setProjectDraft(synced);
    setPreviewTime(0);
    setStep(4);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleContinueFromStep4 = () => {
    stopAllAudio();
    const synced = buildSynchronizedProject();
    setProjectDraft(synced);
    setSavedConfirmed(false);
    setExportError(null);
    setStep(5);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleToggleMusicSample = async (id: MusicTrackId) => {
    if (!audioCtrlRef.current) return;
    if (playingSampleId === id) {
      audioCtrlRef.current.stopMusic();
      setPlayingSampleId(null);
      return;
    }
    setPlayingSampleId(id);
    await audioCtrlRef.current.startMusic(id, 55, 14);
  };

  const handleCreateFinalVideo = async () => {
    stopAllAudio();
    setExportError(null);
    setShareFeedback(null);
    setExportResult(null);
    if (exportPreviewUrl) {
      URL.revokeObjectURL(exportPreviewUrl);
      setExportPreviewUrl(null);
    }

    const readyProject = buildSynchronizedProject();
    setProjectDraft(readyProject);
    setIsCreating(true);
    setExportProgress({
      stage: 'preparing',
      percent: 0,
      message: 'Preparando tu mensaje...',
    });

    try {
      await onSaveProject(readyProject);
      setSavedConfirmed(true);

      const res = await exportProjectToMp4(readyProject, (progress) => {
        setExportProgress(progress);
      }, backgroundVideoBlob ?? undefined);

      setExportResult(res);
      const url = URL.createObjectURL(res.blob);
      setExportPreviewUrl(url);
    } catch {
      setExportError(
        'No fue posible completar el video en este momento. Puedes probar con una duración un poco más corta o guardar el proyecto en Mis Videos e intentarlo de nuevo.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!exportResult || !exportPreviewUrl) return;
    const a = document.createElement('a');
    a.href = exportPreviewUrl;
    a.download = exportResult.filename;
    a.click();
  };

  const handlePlayFinalVideo = () => {
    const vid = resultVideoRef.current;
    if (!vid) return;
    vid.scrollIntoView({behavior: 'smooth', block: 'center'});
    void vid.play().catch(() => {});
  };

  const handleShareVideo = async () => {
    if (!exportResult) return;
    setShareFeedback(null);
    const shareText = `${normalizeChristianCapitalization(title)} — JAIRRESTAURA EVANGELIZA`;

    if (navigator.share) {
      try {
        const file = new File([exportResult.blob], exportResult.filename, {
          type: exportResult.mimeType,
        });
        if (navigator.canShare && navigator.canShare({files: [file]})) {
          await navigator.share({
            title: normalizeChristianCapitalization(title),
            text: shareText,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: normalizeChristianCapitalization(title),
          text: shareText,
        });
        return;
      } catch {
        // User cancelled or file share unsupported on desktop browser
      }
    }

    handleDownloadVideo();
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText).catch(() => {});
    }
    setShareFeedback(
      'Descargamos tu video y copiamos el título para que puedas enviarlo fácilmente por WhatsApp, Facebook o Instagram.',
    );
  };

  const handleSaveToMyVideos = async () => {
    const readyProject = buildSynchronizedProject();
    await onSaveProject(readyProject);
    setSavedConfirmed(true);
  };

  const handleStartOver = () => {
    stopAllAudio();
    if (exportPreviewUrl) {
      URL.revokeObjectURL(exportPreviewUrl);
      setExportPreviewUrl(null);
    }
    setExportResult(null);
    setExportProgress(null);
    setExportError(null);
    setShareFeedback(null);
    setSavedConfirmed(false);
    setHasEditedStep2(false);
    setCustomTopic('');
    setCustomVoiceDataUrl(undefined);
    setCustomVoiceMimeType(undefined);
    setNoNarration(false);
    setVoiceType('masculina');
    setVisualTheme('recomendado');
    setStep(1);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const friendlyProgress = exportProgress ? mapExportStageFriendly(exportProgress) : null;
  const totalPreviewDuration = previewProject ? getProjectTotalDuration(previewProject) : duration;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Top Wizard Header & Stepper */}
      <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#9A6B1E] dark:text-[#EAB354]">
              Asistente guiado · Paso {step} de 5
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold text-stone-900 sm:text-3xl dark:text-[#F4F1EA]">
              {step === 1 && 'Paso 1: Elige el mensaje de tu video'}
              {step === 2 && 'Paso 2: Personaliza tu mensaje'}
              {step === 3 && 'Paso 3: Elige la voz del video'}
              {step === 4 && 'Paso 4: Elige el aspecto y mira la vista previa'}
              {step === 5 && 'Paso 5: Crea y descarga tu video'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              onCancel();
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </div>

        {/* Visual 5-Step Progress Indicator */}
        <div className="grid grid-cols-5 gap-2" role="navigation" aria-label="Pasos de creación">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = (idx + 1) as 1 | 2 | 3 | 4 | 5;
            const isCurrent = step === stepNum;
            const isDone = step > stepNum;
            return (
              <button
                key={label}
                type="button"
                disabled={stepNum > step || isCreating}
                onClick={() => {
                  if (stepNum < step) {
                    stopAllAudio();
                    setStep(stepNum);
                  }
                }}
                className={`flex min-h-[44px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors ${
                  isCurrent
                    ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                    : isDone
                      ? 'border-emerald-600/40 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-stone-200 bg-[#FAF8F4] text-stone-400 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-500'
                }`}
              >
                <span className="hidden text-xs font-bold leading-tight sm:inline">
                  {label}
                </span>
                <span className="font-mono-tabular text-xs font-bold sm:hidden">
                  {stepNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — ELEGIR EL MENSAJE */}
      {step === 1 && (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#11151E]">
          <p className="text-base text-stone-600 dark:text-slate-300">
            Toca una tarjeta para elegir de qué tratará tu video. Si prefieres, también puedes escribir un tema propio abajo.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MESSAGE_CATEGORIES.map((cat) => {
              const scene = SCENE_MAP[cat.imageId];
              const active = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                    active
                      ? 'border-[#B47B22] ring-2 ring-[#B47B22]/35 dark:border-[#EAB354] dark:ring-[#EAB354]/35'
                      : 'border-stone-200 hover:border-stone-400 dark:border-slate-800 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                    <img
                      src={scene.src}
                      alt={cat.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white">
                      <span className="font-display text-2xl font-bold">{cat.title}</span>
                      {active && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 bg-[#FAF8F4] p-4 dark:bg-[#090B10]">
                    <p className="text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-5 dark:border-slate-800 dark:bg-[#090B10]">
            <label
              htmlFor="wizard-custom-topic"
              className="block text-base font-bold text-stone-900 dark:text-[#F4F1EA]"
            >
              ¿Quieres escribir un tema propio? (opcional)
            </label>
            <p className="text-sm text-stone-600 dark:text-slate-400">
              Si lo dejas vacío, prepararemos el mensaje recomendado para «{activeCategory.title}».
            </p>
            <input
              id="wizard-custom-topic"
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onBlur={() => setCustomTopic((prev) => normalizeChristianCapitalization(prev))}
              placeholder={`Ej. ${activeCategory.defaultTopic}`}
              className="mt-2 w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <button
              type="button"
              onClick={handleContinueFromStep1}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B47B22] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              Continuar
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2 — PERSONALIZAR EL MENSAJE */}
      {step === 2 && (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#11151E]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]">
            <p className="text-sm text-stone-700 dark:text-slate-300">
              Ya preparamos un mensaje para ti. Puedes editarlo libremente o restaurar la sugerencia en un clic.
            </p>
            <button
              type="button"
              onClick={handleUseRecommendedMessage}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#B47B22] bg-white px-4 py-2 text-sm font-bold text-[#9A6B1E] hover:bg-amber-50 dark:border-[#D4A24C] dark:bg-[#11151E] dark:text-[#EAB354] dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              Usar mensaje recomendado
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="wizard-title-input"
                className="block text-base font-bold text-stone-900 dark:text-[#F4F1EA]"
              >
                Título del video
              </label>
              <input
                id="wizard-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setHasEditedStep2(true);
                  setTitle(e.target.value);
                }}
                onBlur={() => setTitle((prev) => normalizeChristianCapitalization(prev))}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 text-base font-semibold text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            {selectedCategoryId === 'invitaciones' && (
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-[#090B10]">
                <div>
                  <label
                    htmlFor="wizard-church-name"
                    className="block text-xs font-bold text-stone-700 dark:text-slate-300"
                  >
                    Nombre de la iglesia
                  </label>
                  <input
                    id="wizard-church-name"
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="wizard-church-schedule"
                    className="block text-xs font-bold text-stone-700 dark:text-slate-300"
                  >
                    Días y horarios
                  </label>
                  <input
                    id="wizard-church-schedule"
                    type="text"
                    value={churchSchedule}
                    onChange={(e) => setChurchSchedule(e.target.value)}
                    className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="wizard-church-address"
                    className="block text-xs font-bold text-stone-700 dark:text-slate-300"
                  >
                    Lugar o dirección
                  </label>
                  <input
                    id="wizard-church-address"
                    type="text"
                    value={churchAddress}
                    onChange={(e) => setChurchAddress(e.target.value)}
                    className="mt-1 w-full min-h-[42px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="wizard-message-textarea"
                className="block text-base font-bold text-stone-900 dark:text-[#F4F1EA]"
              >
                Mensaje del video
              </label>
              <textarea
                id="wizard-message-textarea"
                rows={5}
                value={messageText}
                onChange={(e) => {
                  setHasEditedStep2(true);
                  setMessageText(e.target.value);
                }}
                onBlur={() => setMessageText((prev) => normalizeChristianCapitalization(prev))}
                className="mt-2 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-4 text-base leading-relaxed text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            {/* Bible Reference */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-[#090B10]">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                  Cita bíblica: {normalizeChristianCapitalization(bibleRef)}
                </p>
                <p className="font-display text-lg italic leading-snug text-stone-800 dark:text-stone-200">
                  «{normalizeChristianCapitalization(bibleVerseText)}»
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBibleModalOpen(true)}
                className="inline-flex min-h-[46px] shrink-0 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
                Cambiar cita bíblica
              </button>
            </div>

            {/* Duration & Aspect Ratio */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2.5">
                <span className="block text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Duración aproximada
                </span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuration(opt.value)}
                      className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors ${
                        duration === opt.value
                          ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                          : 'border-stone-200 bg-[#FAF8F4] text-stone-800 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-stone-200'
                      }`}
                    >
                      <span className="font-mono-tabular text-sm font-bold">{opt.label}</span>
                      <span className="text-[11px] opacity-85">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Tamaño de pantalla
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAspectRatio(opt.value)}
                      className={`flex min-h-[54px] flex-col items-start justify-center rounded-xl border px-3.5 py-2 text-left transition-colors ${
                        aspectRatio === opt.value
                          ? 'border-[#B47B22] bg-[#B47B22]/12 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                          : 'border-stone-200 bg-[#FAF8F4] text-stone-800 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#090B10] dark:text-stone-200'
                      }`}
                    >
                      <span className="text-sm font-bold text-stone-900 dark:text-[#F4F1EA]">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-stone-600 dark:text-slate-400">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <button
              type="button"
              onClick={handleContinueFromStep2}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B47B22] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              Continuar
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 — ELEGIR LA VOZ */}
      {step === 3 && (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#11151E]">
          <p className="text-base text-stone-600 dark:text-slate-300">
            Elige cómo quieres que se escuche el mensaje. Si prefieres, también puedes continuar solo con música suave y texto en pantalla.
          </p>

          {/* 3 Large Voice Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                id: 'propia' as VoiceType,
                title: 'Mi propia voz',
                description: 'Graba tu propia narración o saludo con el micrófono.',
                icon: Mic,
              },
              {
                id: 'masculina' as VoiceType,
                title: 'Voz masculina',
                description: 'Narración pastoral varonil en español (con conexión).',
                icon: User,
              },
              {
                id: 'femenina' as VoiceType,
                title: 'Voz femenina',
                description: 'Narración cálida y cercana en español (con conexión).',
                icon: Volume2,
              },
            ].map((card) => {
              const Icon = card.icon;
              const selected = !noNarration && voiceType === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setNoNarration(false);
                    setVoiceType(card.id);
                  }}
                  className={`flex min-h-[156px] flex-col justify-between rounded-2xl border p-6 text-left transition-all ${
                    selected
                      ? 'border-[#B47B22] bg-[#B47B22]/10 ring-2 ring-[#B47B22]/30 dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:ring-[#EAB354]/30'
                      : 'border-stone-200 bg-[#FAF8F4] hover:border-stone-400 dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        selected
                          ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                          : 'bg-white text-stone-700 dark:bg-[#171C28] dark:text-stone-200'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    {selected && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                      {card.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                      {card.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Own Voice Recorder (Mic requested ONLY when user presses "Grabar mi voz") */}
          {!noNarration && voiceType === 'propia' && (
            <VoiceRecorderWidget
              customVoiceDataUrl={customVoiceDataUrl}
              onChangeVoice={(url, mime) => {
                setCustomVoiceDataUrl(url);
                setCustomVoiceMimeType(mime);
              }}
              showContinueButton
              onContinue={handleContinueFromStep3}
            />
          )}

          {/* Option to continue without narration */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]">
            <div className="flex items-center gap-3">
              <VolumeX className="h-5 w-5 text-stone-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-bold text-stone-900 dark:text-[#F4F1EA]">
                  ¿Prefieres un video sin voz narrada?
                </p>
                <p className="text-xs text-stone-600 dark:text-slate-400">
                  El mensaje aparecerá escrito en pantalla acompañado por la música instrumental.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNoNarration((prev) => !prev)}
              className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                noNarration
                  ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-200'
              }`}
            >
              {noNarration ? 'Usando solo música y texto' : 'Continuar sin narración'}
            </button>
          </div>

          {/* Simple Background Music Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
              <h2 className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                Música de fondo
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {MUSIC_LIBRARY.map((track) => {
                const selected = musicTrackId === track.id;
                const isPlaying = playingSampleId === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
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
                      <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                        {track.name}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-slate-400">
                        {track.mood}
                      </p>
                    </button>
                    {track.id !== 'sin_musica' && (
                      <button
                        type="button"
                        onClick={() => void handleToggleMusicSample(track.id)}
                        aria-label={isPlaying ? `Detener ${track.name}` : `Escuchar ${track.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100"
                      >
                        {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setStep(2);
              }}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <button
              type="button"
              onClick={handleContinueFromStep3}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B47B22] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              {voiceType === 'propia' && !noNarration && !customVoiceDataUrl
                ? 'Continuar sin grabar voz'
                : 'Continuar'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 4 — ELEGIR EL ASPECTO DEL VIDEO + VISTA PREVIA */}
      {step === 4 && previewProject && (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#11151E]">
          <p className="text-base text-stone-600 dark:text-slate-300">
            Elige el estilo visual que mejor acompañe tu mensaje. Ya seleccionamos las escenas automáticamente para ti.
          </p>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left: 5 Visual Aspect Cards */}
            <div className="space-y-3 lg:col-span-6">
              {VISUAL_THEME_OPTIONS.map((themeOpt) => {
                const scene = SCENE_MAP[themeOpt.previewImageId];
                const selected = visualTheme === themeOpt.id;
                return (
                  <button
                    key={themeOpt.id}
                    type="button"
                    onClick={() => {
                      setIsPreviewPlaying(false);
                      setPreviewTime(0);
                      setVisualTheme(themeOpt.id);
                    }}
                    className={`flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-[#B47B22] bg-[#B47B22]/10 ring-2 ring-[#B47B22]/30 dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:ring-[#EAB354]/30'
                        : 'border-stone-200 bg-[#FAF8F4] hover:border-stone-400 dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={scene.src}
                      alt={themeOpt.title}
                      referrerPolicy="no-referrer"
                      className="h-20 w-28 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                          {themeOpt.title}
                        </p>
                        {selected && (
                          <Check className="h-5 w-5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
                        {themeOpt.description}
                      </p>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  onOpenAdvancedEditor(previewProject);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 pt-2 text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-slate-400 dark:hover:text-stone-100"
              >
                <Sliders className="h-4 w-4" />
                ¿Deseas ajustar escenas individuales? Abrir herramienta avanzada
              </button>
            </div>

            {/* Right: Live Video Preview */}
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-5 lg:col-span-6 dark:border-slate-800 dark:bg-[#090B10]">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-700/50 dark:bg-slate-900/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">Mi video MP4 de fondo</p>
                      <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-slate-400">Elige un video de tu biblioteca local. Se repetirá si es más corto que el mensaje y quedará debajo de los textos y versículos.</p>
                    </div>
                    <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-950 dark:bg-amber-400/20 dark:text-amber-200">Opcional</span>
                  </div>
                  <select value={backgroundVideoId} onChange={e => setBackgroundVideoId(e.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100">
                    <option value="">Usar imágenes del editor (sin video de fondo)</option>
                    {localMp4Videos.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {backgroundVideoId && backgroundVideoUrl && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Video seleccionado: {localMp4Videos.find(item => item.id === backgroundVideoId)?.name}. El archivo original no se modifica.</p>}
                  {!localMp4Videos.length && <p className="mt-2 text-xs text-stone-600 dark:text-slate-400">Tu biblioteca está vacía. Primero agrega un MP4 en “Mis Videos MP4”.</p>}
                  {backgroundVideoUrl && <video ref={backgroundVideoRef} src={backgroundVideoUrl} muted playsInline preload="auto" className="mt-3 aspect-video max-h-36 w-full rounded-lg bg-black object-contain" aria-label="Vista previa del video de fondo" />}
                </div>
                <p className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                  Vista previa de tu video
                </p>
                <span className="font-mono-tabular text-xs font-semibold text-stone-500 dark:text-slate-400">
                  {Math.floor(previewTime)}s / {totalPreviewDuration}s
                </span>
              </div>

              <div className="flex items-center justify-center rounded-xl bg-[#050609] p-3">
                <canvas
                  ref={canvasRef}
                  width={previewSize.width}
                  height={previewSize.height}
                  className={`max-h-[380px] w-auto rounded-lg object-contain ${
                    aspectRatio === '16:9' ? 'w-full' : ''
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewPlaying((p) => !p)}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                >
                  {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPreviewPlaying ? 'Pausar' : 'Ver vista previa'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={totalPreviewDuration}
                  step={0.5}
                  value={previewTime}
                  onChange={(e) => setPreviewTime(Number(e.target.value))}
                  aria-label="Posición de la vista previa"
                  className="flex-1 accent-[#B47B22] dark:accent-[#D4A24C]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setStep(3);
              }}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <button
              type="button"
              onClick={handleContinueFromStep4}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#B47B22] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              Continuar
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 5 — CREAR Y DESCARGAR */}
      {step === 5 && previewProject && (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#11151E]">
          {/* Summary before / during export */}
          {!exportResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-6 sm:grid-cols-12 dark:border-slate-800 dark:bg-[#090B10]">
                <div className="sm:col-span-4">
                  <img
                    src={
                      SCENE_MAP[previewProject.script.scenes[0]?.imageId ?? 'salvation_grace']?.src
                    }
                    alt={previewProject.title}
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                </div>
                <div className="space-y-2 sm:col-span-8">
                  <p className="text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                    Todo listo para crear tu video
                  </p>
                  <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                    {previewProject.title}
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-slate-300">
                    Duración: {totalPreviewDuration} segundos · Formato:{' '}
                    {aspectRatio === '9:16'
                      ? 'Vertical'
                      : aspectRatio === '1:1'
                        ? 'Cuadrado'
                        : 'Horizontal'}{' '}
                    · Cita: {previewProject.script.bibleReference}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-slate-400">
                    Voz:{' '}
                    {noNarration
                      ? 'Solo música instrumental y subtítulos'
                      : voiceType === 'propia'
                        ? customVoiceDataUrl
                          ? 'Tu propia voz grabada'
                          : 'Subtítulos y música (sin grabación)'
                        : voiceType === 'masculina'
                          ? 'Voz masculina'
                          : 'Voz femenina'}
                  </p>
                </div>
              </div>

              {!isCreating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => void handleCreateFinalVideo()}
                    className="inline-flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-[#B47B22] px-10 py-4 text-lg font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-[#9A6B1E] sm:w-auto dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                  >
                    <Film className="h-6 w-6" />
                    CREAR MI VIDEO
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveToMyVideos()}
                    className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-stone-700 underline-offset-4 hover:underline dark:text-slate-300"
                  >
                    <FolderArchive className="h-4 w-4" />
                    {savedConfirmed
                      ? 'Guardado en Mis Videos'
                      : 'Guardar borrador en Mis Videos'}
                  </button>
                </div>
              ) : (
                <div
                  role="status"
                  aria-live="polite"
                  className="space-y-4 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-6 text-center dark:border-slate-800 dark:bg-[#090B10]"
                >
                  <p className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                    {friendlyProgress?.title || 'Preparando tu mensaje'}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-slate-300">
                    {friendlyProgress?.detail || 'Por favor espera un momento mientras terminamos tu video.'}
                  </p>
                  {friendlyProgress?.percent !== null && friendlyProgress?.percent !== undefined ? (
                    <div className="mx-auto max-w-md space-y-1.5">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                        <div
                          className="h-full bg-[#B47B22] transition-all duration-300 dark:bg-[#D4A24C]"
                          style={{width: `${friendlyProgress.percent}%`}}
                        />
                      </div>
                      <p className="font-mono-tabular text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                        {friendlyProgress.percent}%
                      </p>
                    </div>
                  ) : (
                    <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-[#B47B22] dark:bg-[#D4A24C]" />
                    </div>
                  )}
                </div>
              )}

              {exportError && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{exportError}</p>
                </div>
              )}

              {!isCreating && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Export Finished Result */}
          {exportResult && exportPreviewUrl && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-display text-2xl font-bold">
                  ¡Tu video está listo para compartir!
                </p>
                <p className="mt-1 text-sm">
                  {exportResult.codecSummary} · {exportResult.verifiedWidth}×
                  {exportResult.verifiedHeight} · {Math.round(exportResult.verifiedDurationSec)} seg
                </p>
              </div>

              <div className="flex items-center justify-center rounded-2xl bg-[#050609] p-4">
                <video
                  ref={resultVideoRef}
                  src={exportPreviewUrl}
                  controls
                  playsInline
                  className="max-h-[460px] w-auto rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={handlePlayFinalVideo}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-5 py-3 text-base font-bold text-stone-900 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:hover:bg-slate-800"
                >
                  <Play className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
                  Reproducir video
                </button>

                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-5 py-3 text-base font-bold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                >
                  <Download className="h-5 w-5" />
                  Descargar video
                </button>

                <button
                  type="button"
                  onClick={() => void handleShareVideo()}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-5 py-3 text-base font-bold text-stone-900 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100 dark:hover:bg-slate-800"
                >
                  <Share2 className="h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
                  Compartir
                </button>

                <button
                  type="button"
                  onClick={() => void handleSaveToMyVideos()}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100"
                >
                  {savedConfirmed ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <FolderArchive className="h-4 w-4" />
                  )}
                  {savedConfirmed ? 'Guardado en Mis Videos' : 'Guardar en Mis Videos'}
                </button>

                <button
                  type="button"
                  onClick={onGoToMyVideos}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100"
                >
                  <FolderArchive className="h-4 w-4" />
                  Ir a Mis Videos
                </button>

                <button
                  type="button"
                  onClick={handleStartOver}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#B47B22] bg-white px-5 py-2.5 text-sm font-bold text-[#9A6B1E] hover:bg-amber-50 dark:border-[#D4A24C] dark:bg-[#171C28] dark:text-[#EAB354]"
                >
                  <PlusCircle className="h-4 w-4" />
                  Crear otro video
                </button>
              </div>

              {shareFeedback && (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {shareFeedback}
                </p>
              )}

              <div className="flex justify-start pt-1">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-stone-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Volver para cambiar aspecto o mensaje
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Bible Verse Selector Modal */}
      <BibleVerseModal
        open={bibleModalOpen}
        onClose={() => setBibleModalOpen(false)}
        onSelect={(verse: BibleVerseEntry) => {
          setHasEditedStep2(true);
          setBibleRef(normalizeChristianCapitalization(verse.reference));
          setBibleVerseText(normalizeChristianCapitalization(verse.text));
        }}
      />
    </div>
  );
};
