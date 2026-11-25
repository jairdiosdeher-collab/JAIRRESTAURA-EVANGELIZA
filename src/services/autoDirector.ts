import {SCENE_CATALOG} from '../data/sceneCatalog';
import type {
  CameraMotion,
  EvangelisticScript,
  MusicTrackId,
  ProductionFormat,
  SceneImageId,
  SceneTransition,
  VideoDuration,
  VideoProject,
  VideoScene,
} from '../types/evangeliza';
import {synthesizeServerSpanishVoice} from './audioEngine';
import {normalizeEvangelisticScript, normalizeVideoProject} from './orthography';
import {
  createProjectFromInput,
  generateLocalEvangelisticScript,
  PRODUCTION_FORMATS,
  type StudioGenerationInput,
} from './scriptEngine';

export const CAMERA_MOTION_LABELS: Record<CameraMotion, string> = {
  zoom_in: 'Acercamiento lento (Zoom In)',
  zoom_out: 'Alejamiento panorámico (Zoom Out)',
  pan_left: 'Desplazamiento suave a la izquierda',
  pan_right: 'Desplazamiento suave a la derecha',
  ken_burns_up: 'Elevación cinematográfica (Ken Burns)',
};

const CAMERA_SEQUENCE: CameraMotion[] = [
  'zoom_in',
  'pan_right',
  'ken_burns_up',
  'pan_left',
  'zoom_out',
  'zoom_in',
];

const TRANSITION_SEQUENCE: SceneTransition[] = ['fade', 'zoom', 'slide', 'fade', 'fade', 'fade'];

export function selectRecommendedMusic(
  topic: string,
  format: ProductionFormat = 'evangelistico_30_60',
): MusicTrackId {
  const lower = topic.toLowerCase();
  if (lower.includes('cruz') || lower.includes('calvario') || lower.includes('perdón') || lower.includes('perdon')) {
    return 'solemne_cruz';
  }
  if (lower.includes('testimon') || lower.includes('cambiar') || lower.includes('transform')) {
    return 'cinematografica';
  }
  if (lower.includes('familia') || lower.includes('matrimon') || lower.includes('hogar')) {
    return 'piano_emotivo';
  }
  if (lower.includes('iglesia') || lower.includes('culto') || lower.includes('adora')) {
    return 'adoracion_instrumental';
  }
  const preset = PRODUCTION_FORMATS.find((f) => f.id === format);
  return preset?.defaultMusic ?? 'piano_emotivo';
}

function matchBestUnusedImage(
  sceneText: string,
  preferredOrder: SceneImageId[],
  used: Set<SceneImageId>,
): SceneImageId {
  const lower = sceneText.toLowerCase();

  // Check thematic priority rules first
  const keywordPairs: Array<[RegExp, SceneImageId]> = [
    [/milagro|tormenta|mar|barca|sanid/, 'miracles_of_jesus'],
    [/par[aá]bol|sembrador|semilla|tierra|fruto/, 'parable_sower'],
    [/adolesc|colegio|identidad|comparar/, 'teens_purpose'],
    [/callej|ciudad|plaza|compartir|vecin|amig/, 'street_evangelism'],
    [/salva|cambia|nueva vida|gracia|libertad|nuevo comienzo/, 'salvation_grace'],
    [/cruz|calvario|sacrificio|crucifi/, 'calvary_cross'],
    [/resurrec|tumba|tercer d[ií]a|pascua/, 'empty_tomb'],
    [/niñ|infantil|escuela dominical/, 'children_bible'],
    [/matrimon|espos|pareja|pacto/, 'christian_marriage'],
    [/famil|hogar|padres|hijos|pr[oó]digo/, 'restored_family'],
    [/j[oó]ven|juventud/, 'youth_fellowship'],
    [/iglesia|culto|domingo|adorac|congregac/, 'church_worship'],
    [/biblia|escritura|palabra de dios|salmo|jerem[ií]as|juan|mateo|romanos|filipenses/, 'open_bible_light'],
    [/orar|oraci[oó]n|clama|rodillas/, 'praying_people'],
    [/ansiedad|temor|cansad|tormenta|esperanza/, 'finding_hope'],
    [/jes[uú]s|maestro|cristo/, 'jesus_teaching'],
  ];

  for (const [regex, id] of keywordPairs) {
    if (regex.test(lower) && !used.has(id)) {
      used.add(id);
      return id;
    }
  }

  for (const candidate of preferredOrder) {
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }

  for (const asset of SCENE_CATALOG) {
    if (!used.has(asset.id)) {
      used.add(asset.id);
      return asset.id;
    }
  }

  return preferredOrder[0] ?? 'inspiring_sunrise';
}

function rebalanceDurationsByWordCount(scenes: VideoScene[], targetDuration: number): number[] {
  if (scenes.length === 0) return [];
  if (scenes.length === 1) return [Math.max(4, targetDuration)];

  const weights = scenes.map((sc, idx) => {
    const words = Math.max(4, sc.narrationText.trim().split(/\s+/).length);
    // Keep intro hook compact (3-4s) and give closing call breathing room for ending card
    if (idx === 0) return Math.max(4, Math.min(8, words * 0.45));
    if (idx === scenes.length - 1) return Math.max(6, words * 0.65);
    return Math.max(5, words * 0.55);
  });

  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.max(3, Math.round((w / weightSum) * targetDuration)));

  const currentSum = raw.reduce((a, b) => a + b, 0);
  const diff = targetDuration - currentSum;
  if (diff !== 0) {
    const adjustIdx = raw.length >= 2 ? raw.length - 1 : 0;
    raw[adjustIdx] = Math.max(3, raw[adjustIdx] + diff);
  }
  return raw;
}

export function directScriptSequence(
  script: EvangelisticScript,
  options: {
    topic: string;
    productionFormat?: ProductionFormat;
    targetDuration: VideoDuration;
    preserveCustomImages?: boolean;
  },
): {script: EvangelisticScript; recommendedMusic: MusicTrackId} {
  const format = options.productionFormat ?? 'evangelistico_30_60';
  const preset = PRODUCTION_FORMATS.find((f) => f.id === format);
  const preferredPool: SceneImageId[] = [
    ...(preset?.recommendedScenes ?? []),
    'salvation_grace',
    'open_bible_light',
    'jesus_teaching',
    'praying_people',
    'empty_tomb',
    'inspiring_sunrise',
  ];

  const used = new Set<SceneImageId>();
  const durations = rebalanceDurationsByWordCount(script.scenes, options.targetDuration);

  const directedScenes: VideoScene[] = script.scenes.map((scene, idx) => {
    const combinedText = `${scene.narrationText} ${scene.onScreenText} ${scene.bibleRef ?? ''} ${options.topic}`;
    let imageId = scene.imageId;

    if (options.preserveCustomImages && scene.customImageDataUrl) {
      // Keep user's uploaded photo untouched
      used.add(scene.imageId);
    } else {
      imageId = matchBestUnusedImage(combinedText, preferredPool, used);
    }

    const cameraMotion: CameraMotion =
      idx === script.scenes.length - 1
        ? 'zoom_out'
        : CAMERA_SEQUENCE[idx % CAMERA_SEQUENCE.length];

    const transition: SceneTransition =
      idx === 0 || idx === script.scenes.length - 1
        ? 'fade'
        : TRANSITION_SEQUENCE[idx % TRANSITION_SEQUENCE.length];

    return {
      ...scene,
      order: idx + 1,
      durationSec: durations[idx] ?? scene.durationSec,
      imageId,
      cameraMotion,
      transition,
      visualDirection: `${scene.visualDirection.replace(/\s*\(Cámara:.*\)$/, '')} (Cámara: ${CAMERA_MOTION_LABELS[cameraMotion]})`,
    };
  });

  const recommendedMusic = selectRecommendedMusic(options.topic, format);

  return {
    script: normalizeEvangelisticScript({
      ...script,
      scenes: directedScenes,
      fullNarration: directedScenes.map((s) => s.narrationText).join(' '),
    }),
    recommendedMusic,
  };
}

export function reDirectExistingProject(project: VideoProject): VideoProject {
  const {script, recommendedMusic} = directScriptSequence(project.script, {
    topic: project.topic || project.title,
    productionFormat: project.productionFormat,
    targetDuration: project.targetDuration,
    preserveCustomImages: true,
  });

  return normalizeVideoProject({
    ...project,
    musicTrackId: project.musicTrackId === 'sin_musica' ? 'sin_musica' : recommendedMusic,
    script,
  });
}

export async function produceOneClickEvangelisticVideo(
  input: StudioGenerationInput,
  onStatus?: (message: string) => void,
): Promise<{project: VideoProject; voiceSynthesized: boolean; notice?: string}> {
  onStatus?.('1/3 Dirigiendo guion bíblico y secuencia cinematográfica...');
  const baseScript = generateLocalEvangelisticScript(input);
  const {script, recommendedMusic} = directScriptSequence(baseScript, {
    topic: input.topic,
    productionFormat: input.productionFormat,
    targetDuration: input.duration,
  });

  const project = createProjectFromInput(
    {
      ...input,
      musicTrackId: input.musicTrackId || recommendedMusic,
    },
    script,
  );

  let voiceSynthesized = false;
  let notice: string | undefined;

  if (
    project.voiceType !== 'propia' &&
    project.narrationVolume > 0 &&
    (typeof navigator === 'undefined' || navigator.onLine)
  ) {
    onStatus?.('2/3 Generando narración pastoral en español para el MP4...');
    const tts = await synthesizeServerSpanishVoice(
      project.script.fullNarration,
      project.voiceType,
    );
    if (tts.audioDataUrl) {
      project.synthesizedVoiceDataUrl = tts.audioDataUrl;
      voiceSynthesized = true;
    } else if (tts.notice) {
      notice = tts.notice;
    }
  } else if (project.voiceType !== 'propia') {
    notice = 'Modo sin conexión: el proyecto está listo y puedes grabar tu voz en el editor.';
  }

  onStatus?.('3/3 Abriendo estudio de revisión y exportación MP4...');
  return {project, voiceSynthesized, notice};
}
