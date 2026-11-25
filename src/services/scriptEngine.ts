import {OFFLINE_BIBLE_VERSES} from '../data/bibleVerses';
import {SCENE_CATALOG} from '../data/sceneCatalog';
import {
  normalizeChristianCapitalization,
  normalizeEvangelisticScript,
  normalizeMinistryIdentity,
  normalizeVideoProject,
} from './orthography';
import type {
  AspectRatio,
  CampaignEpisode,
  CampaignSeries,
  EvangelisticScript,
  MinistryIdentity,
  MusicTrackId,
  PreparedSermon,
  ProductionFormat,
  SceneImageId,
  TargetAudience,
  VideoDuration,
  VideoProject,
  VideoScene,
  VisualStyle,
  VoiceType,
} from '../types/evangeliza';

export const DEFAULT_MINISTRY_IDENTITY: MinistryIdentity = {
  enabled: true,
  brandName: 'JAIRRESTAURA EVANGELIZA',
  authorLine: 'Pastor Jair Hernández',
  motto: 'ESCUCHA · ORIENTACIÓN · FE',
};

export interface ProductionFormatPreset {
  id: ProductionFormat;
  title: string;
  subtitle: string;
  defaultDuration: VideoDuration;
  defaultAspectRatio: AspectRatio;
  defaultAudience: TargetAudience;
  defaultMusic: MusicTrackId;
  recommendedScenes: SceneImageId[];
  defaultTopic: string;
}

export const PRODUCTION_FORMATS: ProductionFormatPreset[] = [
  {
    id: 'microvideo_15s',
    title: 'Microvideo 15 segundos',
    subtitle: 'Impacto rápido para Estados de WhatsApp, Reels y TikTok',
    defaultDuration: 15,
    defaultAspectRatio: '9:16',
    defaultAudience: 'General',
    defaultMusic: 'esperanza_ambiental',
    recommendedScenes: ['inspiring_sunrise', 'calvary_cross', 'finding_hope'],
    defaultTopic: 'Dios no se ha olvidado de ti hoy',
  },
  {
    id: 'evangelistico_30_60',
    title: 'Evangelístico 30 y 60s',
    subtitle: 'Mensaje bíblico completo con gancho, promesa y llamado a Cristo',
    defaultDuration: 60,
    defaultAspectRatio: '9:16',
    defaultAudience: 'General',
    defaultMusic: 'piano_emotivo',
    recommendedScenes: [
      'calvary_cross',
      'jesus_teaching',
      'open_bible_light',
      'praying_people',
      'empty_tomb',
    ],
    defaultTopic: 'El amor de Jesucristo transforma tu historia',
  },
  {
    id: 'predicacion_3min',
    title: 'Predicación de 3 minutos',
    subtitle: 'Enseñanza expositiva profunda para YouTube, Facebook y cultos',
    defaultDuration: 180,
    defaultAspectRatio: '16:9',
    defaultAudience: 'General',
    defaultMusic: 'adoracion_instrumental',
    recommendedScenes: [
      'open_bible_light',
      'jesus_teaching',
      'biblical_landscape',
      'calvary_cross',
      'empty_tomb',
      'church_worship',
    ],
    defaultTopic: 'De la ansiedad a la paz que sobrepasa todo entendimiento',
  },
  {
    id: 'testimonio',
    title: 'Testimonios de vida',
    subtitle: 'Narrativa emotiva de restauración, sanidad interior y libertad en Cristo',
    defaultDuration: 60,
    defaultAspectRatio: '9:16',
    defaultAudience: 'Personas con ansiedad',
    defaultMusic: 'cinematografica',
    recommendedScenes: [
      'finding_hope',
      'praying_people',
      'open_bible_light',
      'testimony_freedom',
      'inspiring_sunrise',
    ],
    defaultTopic: 'Cómo Cristo sanó mi corazón y me dio libertad',
  },
  {
    id: 'invitacion_culto',
    title: 'Invitaciones a cultos',
    subtitle: 'Cálida invitación comunitaria para domingos, oración y eventos',
    defaultDuration: 30,
    defaultAspectRatio: '9:16',
    defaultAudience: 'Familias',
    defaultMusic: 'esperanza_ambiental',
    recommendedScenes: ['church_worship', 'restored_family', 'open_bible_light', 'jesus_teaching'],
    defaultTopic: 'Te esperamos este domingo en la casa de Dios',
  },
  {
    id: 'infantil',
    title: 'Videos infantiles',
    subtitle: 'Lenguaje tierno y claro para niños y Escuela Dominical',
    defaultDuration: 60,
    defaultAspectRatio: '16:9',
    defaultAudience: 'Niños',
    defaultMusic: 'esperanza_ambiental',
    recommendedScenes: [
      'children_bible',
      'jesus_teaching',
      'biblical_landscape',
      'restored_family',
      'inspiring_sunrise',
    ],
    defaultTopic: 'Jesús es el mejor amigo de los niños',
  },
  {
    id: 'adolescentes',
    title: 'Videos para adolescentes',
    subtitle: 'Mensajes directos sobre identidad, propósito, ansiedad y fe real',
    defaultDuration: 30,
    defaultAspectRatio: '9:16',
    defaultAudience: 'Adolescentes',
    defaultMusic: 'cinematografica',
    recommendedScenes: [
      'youth_fellowship',
      'finding_hope',
      'open_bible_light',
      'testimony_freedom',
    ],
    defaultTopic: 'Tu valor y propósito verdadero están en Jesús',
  },
  {
    id: 'matrimonios',
    title: 'Mensajes para matrimonios',
    subtitle: 'Consejería bíblica sobre perdón, pacto, escucha y oración conyugal',
    defaultDuration: 60,
    defaultAspectRatio: '1:1',
    defaultAudience: 'Matrimonios',
    defaultMusic: 'piano_emotivo',
    recommendedScenes: [
      'christian_marriage',
      'praying_people',
      'open_bible_light',
      'restored_family',
      'inspiring_sunrise',
    ],
    defaultTopic: 'El perdón y la oración fortalecen el matrimonio',
  },
  {
    id: 'campana_evangelistica',
    title: 'Campañas evangelísticas',
    subtitle: 'Formato misionero seriado para compartir cada día en redes',
    defaultDuration: 30,
    defaultAspectRatio: '9:16',
    defaultAudience: 'General',
    defaultMusic: 'adoracion_instrumental',
    recommendedScenes: ['calvary_cross', 'empty_tomb', 'church_worship', 'inspiring_sunrise'],
    defaultTopic: 'Hoy es el día de salvación y esperanza en Cristo',
  },
];

export interface StudioGenerationInput {
  topic: string;
  productionFormat?: ProductionFormat;
  audience: TargetAudience;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  voiceType: VoiceType;
  musicTrackId: MusicTrackId;
  customBibleRef?: string;
  customBibleText?: string;
  customCallToAction?: string;
  ministryIdentity?: MinistryIdentity;
}

const VALID_IMAGE_IDS: SceneImageId[] = SCENE_CATALOG.map((s) => s.id);

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pickBestVerse(
  topic: string,
  format: ProductionFormat,
  customRef?: string,
  customText?: string,
) {
  if (customRef?.trim() && customText?.trim()) {
    return {
      reference: customRef.trim(),
      text: customText.trim(),
      recommendedImageId: matchImageByKeywords(topic),
    };
  }
  const normalized = topic.toLowerCase();
  const matched = OFFLINE_BIBLE_VERSES.find(
    (v) =>
      normalized.includes(v.theme.toLowerCase().split(' ')[0]) ||
      normalized.includes(v.reference.toLowerCase()) ||
      (normalized.includes('ansiedad') && v.id === 'filipenses-4-6-7') ||
      (normalized.includes('paz') && v.id === 'filipenses-4-6-7') ||
      (normalized.includes('famil') && v.id === 'josue-24-15') ||
      (normalized.includes('matrimon') && v.id === 'efesios-4-32') ||
      (normalized.includes('perd') && v.id === '1-juan-1-9') ||
      (normalized.includes('cruz') && v.id === '1-corintios-15-3-4') ||
      (normalized.includes('resurrec') && v.id === '1-corintios-15-3-4') ||
      ((normalized.includes('cambia') || normalized.includes('transform') || normalized.includes('nueva vida')) && v.id === '2-corintios-5-17') ||
      ((normalized.includes('parábol') || normalized.includes('parabol') || normalized.includes('sembrador')) && v.id === 'mateo-13-8') ||
      ((normalized.includes('oración') || normalized.includes('oracion') || normalized.includes('orar')) && v.id === 'jeremias-33-3') ||
      (normalized.includes('amor') && v.id === 'juan-3-16') ||
      (normalized.includes('esperan') && v.id === 'jeremias-29-11') ||
      (normalized.includes('comienzo') && v.id === 'lamentaciones-3-22-23') ||
      (normalized.includes('salva') && v.id === 'romanos-10-9') ||
      (normalized.includes('pródigo') && v.id === 'lucas-15-20') ||
      (normalized.includes('prodigo') && v.id === 'lucas-15-20'),
  );

  if (matched) return matched;

  if (format === 'matrimonios') {
    return OFFLINE_BIBLE_VERSES.find((v) => v.id === 'efesios-4-32') ?? OFFLINE_BIBLE_VERSES[0];
  }
  if (format === 'adolescentes') {
    return OFFLINE_BIBLE_VERSES.find((v) => v.id === 'jeremias-29-11') ?? OFFLINE_BIBLE_VERSES[0];
  }
  if (format === 'testimonio') {
    return OFFLINE_BIBLE_VERSES.find((v) => v.id === '2-corintios-5-17') ?? OFFLINE_BIBLE_VERSES[0];
  }
  if (format === 'infantil') {
    return OFFLINE_BIBLE_VERSES.find((v) => v.id === 'salmo-23-1-3') ?? OFFLINE_BIBLE_VERSES[0];
  }

  if (customRef?.trim()) {
    return {
      reference: customRef.trim(),
      text: 'La palabra de Dios permanece para siempre y trae luz, consuelo y salvación a todo el que cree.',
      recommendedImageId: matchImageByKeywords(topic),
    };
  }

  return OFFLINE_BIBLE_VERSES[0];
}

export function matchImageByKeywords(text: string): SceneImageId {
  const lower = text.toLowerCase();
  for (const asset of SCENE_CATALOG) {
    if (asset.tags.some((t) => lower.includes(t))) {
      return asset.id;
    }
  }
  return 'inspiring_sunrise';
}

function pickDistinctImages(preferred: SceneImageId[], count: number): SceneImageId[] {
  const result: SceneImageId[] = [];
  const used = new Set<SceneImageId>();
  for (const img of preferred) {
    if (!used.has(img)) {
      used.add(img);
      result.push(img);
    }
    if (result.length >= count) return result;
  }
  for (const fallback of VALID_IMAGE_IDS) {
    if (!used.has(fallback)) {
      used.add(fallback);
      result.push(fallback);
    }
    if (result.length >= count) return result;
  }
  return result;
}

function distributeDurations(total: VideoDuration, count: number): number[] {
  if (count <= 1) return [total];
  const hookSec = total <= 15 ? 3 : 4;
  const remaining = Math.max(count - 1, total - hookSec);
  const base = Math.floor(remaining / (count - 1));
  let rem = remaining - base * (count - 1);
  const arr = [hookSec];
  for (let i = 1; i < count; i++) {
    arr.push(base + (rem > 0 ? 1 : 0));
    if (rem > 0) rem--;
  }
  return arr;
}

function audienceTonePhrase(audience: TargetAudience): string {
  switch (audience) {
    case 'Niños':
      return 'Dios cuida cada paso tuyo con ternura, como un Padre bueno que siempre te escucha.';
    case 'Adolescentes':
      return 'No necesitas compararte ni esconder lo que sientes: en Jesús tienes identidad y futuro.';
    case 'Jóvenes':
      return 'En medio de tantas voces y presiones de esta generación, Cristo te llama con propósito real.';
    case 'Familias':
      return 'Dentro de tu hogar, incluso cuando ha habido silencios o heridas, Dios puede traer unidad y paz.';
    case 'Matrimonios':
      return 'Cuando dos vidas deciden orar juntas y perdonar con humildad, la gracia de Dios sostiene el pacto.';
    case 'Personas con ansiedad':
      return 'Cuando los pensamientos no te dejan descansar y el pecho siente peso, la paz de Cristo guarda tu mente.';
    case 'Nuevos creyentes':
      return 'Al dar tus primeros pasos caminando con Jesús, su Espíritu te fortalece cada mañana.';
    default:
      return 'Aun en medio de los días difíciles que nadie conoce, Dios no es indiferente a tu historia.';
  }
}

function formatInlineTopicClause(rawTopic: string): string {
  const normalized = normalizeChristianCapitalization(rawTopic.trim());
  if (!normalized) return 'el amor de Dios';
  const keepLeadingUpper =
    /^(?:Dios|Jesús|Jesucristo|Cristo|Biblia|Espíritu|Día\s+\d+|David|Moisés|Abraham|Elías|Salmos?|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|Corintios|Efesios|Filipenses|Jeremías|Isaías|Apocalipsis|MMM)\b/u;
  if (keepLeadingUpper.test(normalized)) {
    return normalized;
  }
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

export function generateLocalEvangelisticScript(input: StudioGenerationInput): EvangelisticScript {
  const format = input.productionFormat ?? 'evangelistico_30_60';
  const cleanTopic = normalizeChristianCapitalization(
    input.topic.trim() || 'Jesús te ama y tiene esperanza para ti',
  );
  const inlineTopic = formatInlineTopicClause(cleanTopic);
  const verse = pickBestVerse(cleanTopic, format, input.customBibleRef, input.customBibleText);
  const formatPreset = PRODUCTION_FORMATS.find((f) => f.id === format);

  const keywordImg = matchImageByKeywords(cleanTopic);
  const preferredPool: SceneImageId[] = [
    keywordImg,
    ...(formatPreset?.recommendedScenes ?? []),
    verse.recommendedImageId,
    'open_bible_light',
    'praying_people',
    'empty_tomb',
    'inspiring_sunrise',
  ];

  const sceneCount =
    input.duration <= 15 ? 3 : input.duration <= 30 ? 4 : input.duration <= 90 ? 5 : 6;
  const durations = distributeDurations(input.duration, sceneCount);
  const distinctImages = pickDistinctImages(preferredPool, sceneCount);

  const callToAction = normalizeChristianCapitalization(
    input.customCallToAction?.trim() ||
      (format === 'invitacion_culto'
        ? 'Te esperamos con los brazos abiertos en nuestra iglesia. Ven con tu familia y vive un encuentro con Dios.'
        : format === 'infantil'
          ? 'Habla hoy con Jesús en una oración sencilla. Él siempre escucha a los niños con alegría.'
          : format === 'matrimonios'
            ? 'Tomen hoy sus manos, pidan perdón si hace falta y entreguen su matrimonio a Jesucristo.'
            : 'Hoy abre tu corazón a Jesucristo. Ora con fe, recíbelo como tu Salvador y permite que su paz restaure tu vida.'),
  );

  const hookByFormat: Record<ProductionFormat, string> = {
    microvideo_15s: `Detente un momento: Dios tiene una palabra urgente sobre ${inlineTopic}.`,
    evangelistico_30_60: `¿Alguna vez sentiste que nadie comprende lo que cargas? Escucha esto sobre ${inlineTopic}.`,
    predicacion_3min: `Hoy meditaremos juntos a la luz de la Biblia sobre ${inlineTopic}.`,
    testimonio: `Lo que parecía un final sin salida se convirtió en el comienzo de una vida nueva en Cristo.`,
    invitacion_culto: `Este fin de semana hay un lugar especial preparado para ti y toda tu familia.`,
    infantil: `¡Hola! Hoy vamos a descubrir una historia maravillosa de la Biblia sobre ${inlineTopic}.`,
    adolescentes: `¿Te has sentido presionado por encajar o ansioso por el futuro? Escucha esto hoy.`,
    matrimonios: `Ningún hogar es perfecto, pero todo matrimonio puede renovarse cuando invita a Cristo al centro.`,
    campana_evangelistica: `Un mensaje diario de fe y esperanza para tu corazón sobre ${inlineTopic}.`,
  };

  const hook3s = normalizeChristianCapitalization(hookByFormat[format]);
  const audienceLead = audienceTonePhrase(input.audience);

  const rawBlueprints: Array<Omit<VideoScene, 'id' | 'order' | 'durationSec' | 'imageId'>> = [
    {
      visualDirection: 'Plano de apertura cinematográfico con luz cálida y título legible.',
      onScreenText: cleanTopic.slice(0, 68),
      narrationText: hook3s,
      transition: 'fade',
    },
    {
      visualDirection: 'Escena cercana conectando con la realidad emocional y espiritual de la audiencia.',
      onScreenText: audienceLead,
      narrationText: `${audienceLead} Jesucristo te mira con compasión y quiere hablar verdad a tu corazón.`,
      transition: 'zoom',
    },
    {
      visualDirection: 'Plano central destacando la Escritura bíblica con iluminación serena.',
      onScreenText: `«${verse.text}» (${verse.reference})`,
      narrationText: `La Palabra de Dios nos enseña en ${verse.reference}: ${verse.text}`,
      bibleRef: verse.reference,
      transition: 'fade',
    },
    {
      visualDirection: 'Secuencia de transformación mostrando alivio, oración y restauración.',
      onScreenText:
        format === 'infantil'
          ? 'Jesús siempre nos ama, nos cuida y escucha nuestras oraciones.'
          : 'En Cristo la culpa queda atrás y comienza una paz verdadera.',
      narrationText:
        format === 'infantil'
          ? 'Cuando oramos y confiamos en Jesús, Él llena nuestro corazón de alegría, valentía y amor para compartir con otros.'
          : 'No tienes que cargar tus temores ni tu pasado a solas. La gracia de Dios perdona, sana las heridas del alma y renueva tus fuerzas.',
      transition: 'slide',
    },
    {
      visualDirection: 'Escena reflexiva que prepara el corazón para la decisión de fe.',
      onScreenText: 'Solo basta una oración sincera desde donde estás hoy.',
      narrationText:
        'Aun en silencio, Dios escucha el clamor humilde de todo corazón que decide acercarse a Él con sinceridad.',
      transition: 'fade',
    },
    {
      visualDirection: 'Cierre luminoso con llamado claro a Cristo y firma del ministerio.',
      onScreenText: callToAction,
      narrationText: callToAction,
      transition: 'fade',
    },
  ];

  // For 3, 4, or 5 scenes, ensure the last scene is ALWAYS the closing call to action
  const selectedBlueprints = rawBlueprints.slice(0, sceneCount);
  if (sceneCount < 6) {
    selectedBlueprints[selectedBlueprints.length - 1] = rawBlueprints[5];
  }

  const scenes: VideoScene[] = selectedBlueprints.map((bp, idx) => ({
    ...bp,
    id: createId('scene'),
    order: idx + 1,
    durationSec: durations[idx],
    imageId: distinctImages[idx],
  }));

  return normalizeEvangelisticScript({
    title: cleanTopic,
    hook3s,
    fullNarration: scenes.map((s) => s.narrationText).join(' '),
    bibleReference: verse.reference,
    bibleVerseText: verse.text,
    callToAction,
    scenes,
  });
}

export async function generateOnlineGeminiScript(
  input: StudioGenerationInput,
): Promise<{script: EvangelisticScript; usedOnline: boolean; notice?: string}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      script: generateLocalEvangelisticScript(input),
      usedOnline: false,
      notice: 'Sin conexión a internet: se generó el guion completo con el motor bíblico local.',
    };
  }

  try {
    const res = await fetch('/api/gemini/script', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        topic: input.topic,
        productionFormat: input.productionFormat,
        audience: input.audience,
        durationSec: input.duration,
        bibleRef: input.customBibleRef,
        callToAction: input.customCallToAction,
      }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {error?: string};
      return {
        script: generateLocalEvangelisticScript(input),
        usedOnline: false,
        notice:
          errData.error ||
          'El servicio en línea no está disponible; se usó el generador autónomo local.',
      };
    }

    const data = (await res.json()) as {script?: Record<string, unknown>};
    const raw = data.script;
    if (!raw || !Array.isArray(raw.scenes) || raw.scenes.length === 0) {
      return {
        script: generateLocalEvangelisticScript(input),
        usedOnline: false,
        notice: 'Se utilizó el generador autónomo local para asegurar la estructura de escenas.',
      };
    }

    const usedImages = new Set<SceneImageId>();
    const scenes: VideoScene[] = raw.scenes.map((s: Record<string, unknown>, idx: number) => {
      const candidateImg = String(s.imageId || '');
      let imageId: SceneImageId = VALID_IMAGE_IDS.includes(candidateImg as SceneImageId)
        ? (candidateImg as SceneImageId)
        : VALID_IMAGE_IDS[idx % VALID_IMAGE_IDS.length];

      if (usedImages.has(imageId)) {
        const unused = VALID_IMAGE_IDS.find((id) => !usedImages.has(id));
        if (unused) imageId = unused;
      }
      usedImages.add(imageId);

      return {
        id: createId('scene'),
        order: idx + 1,
        durationSec: Math.max(3, Math.min(60, Number(s.durationSec) || 8)),
        imageId,
        visualDirection: String(s.visualDirection || 'Toma cinematográfica pastoral'),
        onScreenText: String(s.onScreenText || ''),
        narrationText: String(s.narrationText || ''),
        bibleRef: s.bibleRef ? String(s.bibleRef) : undefined,
        transition: idx % 2 === 0 ? 'fade' : 'zoom',
      };
    });

    return {
      script: normalizeEvangelisticScript({
        title: String(raw.title || input.topic),
        hook3s: String(raw.hook3s || scenes[0]?.narrationText || ''),
        fullNarration: String(
          raw.fullNarration || scenes.map((s) => s.narrationText).join(' '),
        ),
        bibleReference: String(raw.bibleReference || input.customBibleRef || 'Juan 3:16'),
        bibleVerseText: String(raw.bibleVerseText || input.customBibleText || ''),
        callToAction: String(raw.callToAction || 'Busca hoy a Jesucristo en oración.'),
        scenes,
      }),
      usedOnline: true,
    };
  } catch {
    return {
      script: generateLocalEvangelisticScript(input),
      usedOnline: false,
      notice: 'Modo autónomo activado: guion generado localmente sin conexión externa.',
    };
  }
}

export function createProjectFromInput(
  input: StudioGenerationInput,
  script: EvangelisticScript,
  extras?: {sourceSermonId?: string; campaignId?: string; campaignDay?: number},
): VideoProject {
  const now = new Date().toISOString();
  const normalizedScript = normalizeEvangelisticScript(script);
  return normalizeVideoProject({
    id: createId('proj'),
    title: normalizedScript.title,
    topic: normalizeChristianCapitalization(input.topic),
    productionFormat: input.productionFormat ?? 'evangelistico_30_60',
    audience: input.audience,
    targetDuration: input.duration,
    aspectRatio: input.aspectRatio,
    visualStyle: input.visualStyle,
    voiceType: input.voiceType,
    musicTrackId: input.musicTrackId,
    musicVolume: 36,
    narrationVolume: 94,
    showSubtitles: true,
    showLogo: true,
    ministryIdentity: normalizeMinistryIdentity(
      input.ministryIdentity ?? {...DEFAULT_MINISTRY_IDENTITY},
    ),
    script: normalizedScript,
    createdAt: now,
    updatedAt: now,
    ...extras,
  });
}

export function createProjectFromSermon(
  sermon: PreparedSermon,
  aspectRatio: AspectRatio = '9:16',
  ministryIdentity: MinistryIdentity = DEFAULT_MINISTRY_IDENTITY,
): VideoProject {
  const durations = distributeDurations(sermon.suggestedDuration, 5);
  const distinctImages = pickDistinctImages(
    [
      sermon.defaultImageId,
      sermon.secondaryImageId,
      sermon.tertiaryImageId ?? 'open_bible_light',
      sermon.quaternaryImageId ?? 'praying_people',
      'inspiring_sunrise',
    ],
    5,
  );

  const scenes: VideoScene[] = [
    {
      id: createId('scene'),
      order: 1,
      durationSec: durations[0],
      imageId: distinctImages[0],
      visualDirection: 'Apertura cinematográfica con título pastoral elegante.',
      onScreenText: sermon.title,
      narrationText: `${sermon.title}. ${sermon.subtitle}`,
      transition: 'fade',
    },
    {
      id: createId('scene'),
      order: 2,
      durationSec: durations[1],
      imageId: distinctImages[1],
      visualDirection: 'Plano suave conectando con la necesidad humana cotidiana.',
      onScreenText: sermon.introduction,
      narrationText: sermon.introduction,
      transition: 'zoom',
    },
    {
      id: createId('scene'),
      order: 3,
      durationSec: durations[2],
      imageId: distinctImages[2],
      visualDirection: 'Versículo bíblico destacado con fondo sereno.',
      onScreenText: `«${sermon.bibleText}» (${sermon.bibleReference})`,
      narrationText: `${sermon.bibleReference}. ${sermon.bibleText}`,
      bibleRef: sermon.bibleReference,
      transition: 'fade',
    },
    {
      id: createId('scene'),
      order: 4,
      durationSec: durations[3],
      imageId: distinctImages[3],
      visualDirection: 'Escena pastoral reflexiva que invita a la paz interior.',
      onScreenText: `${sermon.development} ${sermon.reflection}`,
      narrationText: `${sermon.development} ${sermon.reflection}`,
      transition: 'slide',
    },
    {
      id: createId('scene'),
      order: 5,
      durationSec: durations[4],
      imageId: distinctImages[4],
      visualDirection: 'Amanecer luminoso con invitación clara a Cristo.',
      onScreenText: sermon.callToChrist,
      narrationText: sermon.callToChrist,
      transition: 'fade',
    },
  ];

  const script: EvangelisticScript = {
    title: sermon.title,
    hook3s: sermon.subtitle,
    fullNarration: scenes.map((s) => s.narrationText).join(' '),
    bibleReference: sermon.bibleReference,
    bibleVerseText: sermon.bibleText,
    callToAction: sermon.callToChrist,
    scenes,
  };

  return createProjectFromInput(
    {
      topic: sermon.title,
      productionFormat: sermon.suggestedDuration >= 180 ? 'predicacion_3min' : 'evangelistico_30_60',
      audience: 'General',
      duration: sermon.suggestedDuration,
      aspectRatio,
      visualStyle: 'dorada_esperanza',
      voiceType: 'masculina',
      musicTrackId: sermon.defaultMusicId,
      ministryIdentity,
    },
    script,
    {sourceSermonId: sermon.id},
  );
}

export function createProjectFromCampaignEpisode(
  campaign: CampaignSeries,
  episode: CampaignEpisode,
  ministryIdentity: MinistryIdentity = DEFAULT_MINISTRY_IDENTITY,
  aspectRatioOverride?: AspectRatio,
): VideoProject {
  const input: StudioGenerationInput = {
    topic: episode.title,
    productionFormat:
      campaign.id === 'invitaciones-cultos'
        ? 'invitacion_culto'
        : campaign.id === '7-mensajes-adolescentes'
          ? 'adolescentes'
          : 'campana_evangelistica',
    audience: campaign.audience,
    duration: 30,
    aspectRatio: aspectRatioOverride ?? campaign.aspectRatio,
    visualStyle: campaign.visualStyle ?? 'dorada_esperanza',
    voiceType: 'masculina',
    musicTrackId: campaign.defaultMusicId,
    customBibleRef: episode.bibleRef,
    customBibleText: episode.bibleText,
    customCallToAction: episode.callToAction,
    ministryIdentity,
  };
  const script = generateLocalEvangelisticScript(input);
  const cameras = ['zoom_in', 'pan_right', 'ken_burns_up', 'zoom_out'] as const;
  script.scenes = script.scenes.map((sc, idx) => ({
    ...sc,
    imageId: idx === 0 ? episode.imageId : sc.imageId,
    cameraMotion: cameras[idx % cameras.length],
    onScreenText:
      idx === 0
        ? `${campaign.title} (${episode.day}/${campaign.daysCount}) · ${episode.title}`
        : sc.onScreenText,
    narrationText:
      idx === 0
        ? `${campaign.title}, capítulo ${episode.day} de ${campaign.daysCount}. ${episode.title}. ${episode.summary}`
        : sc.narrationText,
  }));
  script.fullNarration = script.scenes.map((s) => s.narrationText).join(' ');
  return createProjectFromInput(input, script, {
    campaignId: campaign.id,
    campaignDay: episode.day,
  });
}
