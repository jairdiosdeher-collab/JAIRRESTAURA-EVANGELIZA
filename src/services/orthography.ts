import type {
  EvangelisticScript,
  MinistryIdentity,
  VideoProject,
  VideoScene,
} from '../types/evangeliza';

const UNAMBIGUOUS_PROPER_NOUNS: Array<[RegExp, string]> = [
  [/(?<![\p{L}\p{N}_])jesucristo(?![\p{L}\p{N}_])/giu, 'Jesucristo'],
  [/(?<![\p{L}\p{N}_])jes[uú]s(?![\p{L}\p{N}_])/giu, 'Jesús'],
  [/(?<![\p{L}\p{N}_])cristo(?![\p{L}\p{N}_])/giu, 'Cristo'],
  [/(?<![\p{L}\p{N}_])biblia(?![\p{L}\p{N}_])/giu, 'Biblia'],
  [/(?<![\p{L}\p{N}_])esp[ií]ritu\s+santo(?![\p{L}\p{N}_])/giu, 'Espíritu Santo'],
  [/(?<![\p{L}\p{N}_])g[eé]nesis(?![\p{L}\p{N}_])/giu, 'Génesis'],
  [/(?<![\p{L}\p{N}_])[eé]xodo(?![\p{L}\p{N}_])/giu, 'Éxodo'],
  [/(?<![\p{L}\p{N}_])lev[ií]tico(?![\p{L}\p{N}_])/giu, 'Levítico'],
  [/(?<![\p{L}\p{N}_])deuteronomio(?![\p{L}\p{N}_])/giu, 'Deuteronomio'],
  [/(?<![\p{L}\p{N}_])josu[eé](?![\p{L}\p{N}_])/giu, 'Josué'],
  [/(?<![\p{L}\p{N}_])esdras(?![\p{L}\p{N}_])/giu, 'Esdras'],
  [/(?<![\p{L}\p{N}_])nehem[ií]as(?![\p{L}\p{N}_])/giu, 'Nehemías'],
  [/(?<![\p{L}\p{N}_])eclesiast[eé]s(?![\p{L}\p{N}_])/giu, 'Eclesiastés'],
  [/(?<![\p{L}\p{N}_])isa[ií]as(?![\p{L}\p{N}_])/giu, 'Isaías'],
  [/(?<![\p{L}\p{N}_])jerem[ií]as(?![\p{L}\p{N}_])/giu, 'Jeremías'],
  [/(?<![\p{L}\p{N}_])ezequiel(?![\p{L}\p{N}_])/giu, 'Ezequiel'],
  [/(?<![\p{L}\p{N}_])daniel(?![\p{L}\p{N}_])/giu, 'Daniel'],
  [/(?<![\p{L}\p{N}_])oseas(?![\p{L}\p{N}_])/giu, 'Oseas'],
  [/(?<![\p{L}\p{N}_])abd[ií]as(?![\p{L}\p{N}_])/giu, 'Abdías'],
  [/(?<![\p{L}\p{N}_])jon[aá]s(?![\p{L}\p{N}_])/giu, 'Jonás'],
  [/(?<![\p{L}\p{N}_])miqueas(?![\p{L}\p{N}_])/giu, 'Miqueas'],
  [/(?<![\p{L}\p{N}_])nah[uú]m(?![\p{L}\p{N}_])/giu, 'Nahúm'],
  [/(?<![\p{L}\p{N}_])habacuc(?![\p{L}\p{N}_])/giu, 'Habacuc'],
  [/(?<![\p{L}\p{N}_])sofon[ií]as(?![\p{L}\p{N}_])/giu, 'Sofonías'],
  [/(?<![\p{L}\p{N}_])hageo(?![\p{L}\p{N}_])/giu, 'Hageo'],
  [/(?<![\p{L}\p{N}_])zacar[ií]as(?![\p{L}\p{N}_])/giu, 'Zacarías'],
  [/(?<![\p{L}\p{N}_])malaqu[ií]as(?![\p{L}\p{N}_])/giu, 'Malaquías'],
  [/(?<![\p{L}\p{N}_])mateo(?![\p{L}\p{N}_])/giu, 'Mateo'],
  [/(?<![\p{L}\p{N}_])lucas(?![\p{L}\p{N}_])/giu, 'Lucas'],
  [/(?<![\p{L}\p{N}_])juan(?![\p{L}\p{N}_])/giu, 'Juan'],
  [/(?<![\p{L}\p{N}_])corintios(?![\p{L}\p{N}_])/giu, 'Corintios'],
  [/(?<![\p{L}\p{N}_])g[aá]latas(?![\p{L}\p{N}_])/giu, 'Gálatas'],
  [/(?<![\p{L}\p{N}_])efesios(?![\p{L}\p{N}_])/giu, 'Efesios'],
  [/(?<![\p{L}\p{N}_])filipenses(?![\p{L}\p{N}_])/giu, 'Filipenses'],
  [/(?<![\p{L}\p{N}_])colosenses(?![\p{L}\p{N}_])/giu, 'Colosenses'],
  [/(?<![\p{L}\p{N}_])tesalonicenses(?![\p{L}\p{N}_])/giu, 'Tesalonicenses'],
  [/(?<![\p{L}\p{N}_])timoteo(?![\p{L}\p{N}_])/giu, 'Timoteo'],
  [/(?<![\p{L}\p{N}_])filem[oó]n(?![\p{L}\p{N}_])/giu, 'Filemón'],
  [/(?<![\p{L}\p{N}_])santiago(?![\p{L}\p{N}_])/giu, 'Santiago'],
  [/(?<![\p{L}\p{N}_])pedro(?![\p{L}\p{N}_])/giu, 'Pedro'],
  [/(?<![\p{L}\p{N}_])judas(?![\p{L}\p{N}_])/giu, 'Judas'],
  [/(?<![\p{L}\p{N}_])apocalipsis(?![\p{L}\p{N}_])/giu, 'Apocalipsis'],
  [/(?<![\p{L}\p{N}_])david(?![\p{L}\p{N}_])/giu, 'David'],
  [/(?<![\p{L}\p{N}_])mois[eé]s(?![\p{L}\p{N}_])/giu, 'Moisés'],
  [/(?<![\p{L}\p{N}_])abraham(?![\p{L}\p{N}_])/giu, 'Abraham'],
  [/(?<![\p{L}\p{N}_])el[ií]as(?![\p{L}\p{N}_])/giu, 'Elías'],
  [/(?<![\p{L}\p{N}_])samuel(?![\p{L}\p{N}_])/giu, 'Samuel'],
  [/(?<![\p{L}\p{N}_])rut(?![\p{L}\p{N}_])/giu, 'Rut'],
];

const CONTEXTUAL_BIBLE_BOOKS: Array<[string, string]> = [
  ['salmos', 'Salmos'],
  ['salmo', 'Salmo'],
  ['hechos', 'Hechos'],
  ['reyes', 'Reyes'],
  ['cr[oó]nicas', 'Crónicas'],
  ['jueces', 'Jueces'],
  ['n[uú]meros', 'Números'],
  ['cantares', 'Cantares'],
  ['proverbios', 'Proverbios'],
  ['lamentaciones', 'Lamentaciones'],
  ['marcos', 'Marcos'],
  ['romanos', 'Romanos'],
  ['hebreos', 'Hebreos'],
  ['tito', 'Tito'],
  ['job', 'Job'],
  ['ester', 'Ester'],
  ['am[oó]s', 'Amós'],
  ['joel', 'Joel'],
];

const PAGAN_IDOL_BEFORE = /\b(?:falso|falsos|pagano|paganos|griego|romano|egipcio|ajeno|extraño)\s+$/iu;
const PAGAN_IDOL_AFTER = /^\s+(?:falso|pagano|griego|romano|egipcio|ajeno|extraño|inventado)\b/iu;

function isAllUpperCasePhrase(text: string): boolean {
  const hasLetters = /\p{L}/u.test(text);
  return hasLetters && text === text.toUpperCase() && text !== text.toLowerCase();
}

/**
 * Normaliza la ortografía y mayúsculas cristianas en textos en español:
 * - «dios» -> «Dios» (respetando límites de palabra Unicode y sin alterar «adiós», «diosa», «dioses», etc.)
 * - «día» al inicio o ante número de capítulo/episodio -> «Día» («Día 1: Dios te conoce...»)
 * - Nombres bíblicos propios («Jesús», «Jesucristo», «Cristo», «Biblia» y libros de la Biblia)
 */
export function normalizeChristianCapitalization(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Preserve intentional ALL-CAPS banners/identities (e.g., "JAIRRESTAURA EVANGELIZA")
  if (isAllUpperCasePhrase(text)) {
    return text;
  }

  let out = text;

  // 1. Capitalize «dios» -> «Dios» strictly on Unicode word boundaries, excluding idol contexts & pure "DIOS"
  out = out.replace(
    /(?<![\p{L}\p{N}_])dios(?![\p{L}\p{N}_])/giu,
    (match, offset: number, full: string) => {
      if (match === 'DIOS') return match;
      const before = full.slice(Math.max(0, offset - 20), offset);
      const after = full.slice(offset + match.length, offset + match.length + 20);
      if (PAGAN_IDOL_BEFORE.test(before) || PAGAN_IDOL_AFTER.test(after)) {
        return match;
      }
      return 'Dios';
    },
  );

  // 2. Capitalize «día» at title/sentence start or when followed by episode/day number («Día 1»)
  out = out.replace(
    /^(\s*[«"¡¿(\[]*\s*)d[ií]a(?![\p{L}\p{N}_])/iu,
    (_m, prefix: string) => `${prefix}Día`,
  );
  out = out.replace(
    /(?<![\p{L}\p{N}_])d[ií]a(?=\s+\d+\b)/giu,
    'Día',
  );

  // 3. Unambiguous proper biblical/Christian names
  for (const [pattern, replacement] of UNAMBIGUOUS_PROPER_NOUNS) {
    out = out.replace(pattern, (match) => (match === match.toUpperCase() ? match : replacement));
  }

  // 4. Context-aware Bible book names (followed by chapter number or preceded by ordinal/book indicator)
  for (const [patternStr, replacement] of CONTEXTUAL_BIBLE_BOOKS) {
    const afterNumberRegex = new RegExp(
      `(?<![\\p{L}\\p{N}_])${patternStr}(?=\\s+\\d+)`,
      'giu',
    );
    out = out.replace(afterNumberRegex, replacement);

    const precededContextRegex = new RegExp(
      `((?:\\b(?:1|2|3|1ª|2ª|3ª)|libro\\s+de(?:\\s+los)?|evangelio\\s+(?:de|seg[uú]n)|(?:carta|ep[ií]stola)\\s+a(?:\\s+los)?|san)\\s+)${patternStr}(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    out = out.replace(precededContextRegex, (_m, prefix: string) => `${prefix}${replacement}`);
  }

  return out;
}

export function normalizeMinistryIdentity(identity: MinistryIdentity): MinistryIdentity {
  return {
    ...identity,
    brandName: normalizeChristianCapitalization(identity.brandName),
    authorLine: normalizeChristianCapitalization(identity.authorLine),
    motto: normalizeChristianCapitalization(identity.motto),
  };
}

export function normalizeVideoScene(scene: VideoScene): VideoScene {
  return {
    ...scene,
    visualDirection: normalizeChristianCapitalization(scene.visualDirection),
    onScreenText: normalizeChristianCapitalization(scene.onScreenText),
    narrationText: normalizeChristianCapitalization(scene.narrationText),
    bibleRef: scene.bibleRef ? normalizeChristianCapitalization(scene.bibleRef) : scene.bibleRef,
  };
}

export function normalizeEvangelisticScript(script: EvangelisticScript): EvangelisticScript {
  return {
    ...script,
    title: normalizeChristianCapitalization(script.title),
    hook3s: normalizeChristianCapitalization(script.hook3s),
    fullNarration: normalizeChristianCapitalization(script.fullNarration),
    bibleReference: normalizeChristianCapitalization(script.bibleReference),
    bibleVerseText: normalizeChristianCapitalization(script.bibleVerseText),
    callToAction: normalizeChristianCapitalization(script.callToAction),
    scenes: Array.isArray(script.scenes) ? script.scenes.map(normalizeVideoScene) : [],
  };
}

export function normalizeVideoProject(project: VideoProject): VideoProject {
  return {
    ...project,
    title: normalizeChristianCapitalization(project.title),
    topic: normalizeChristianCapitalization(project.topic),
    ministryIdentity: project.ministryIdentity
      ? normalizeMinistryIdentity(project.ministryIdentity)
      : project.ministryIdentity,
    script: project.script ? normalizeEvangelisticScript(project.script) : project.script,
  };
}
