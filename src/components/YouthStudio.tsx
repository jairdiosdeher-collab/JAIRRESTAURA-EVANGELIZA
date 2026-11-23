import React, {useState} from 'react';
import {BookOpen, Film, Sparkles, Zap} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {produceOneClickEvangelisticVideo, directScriptSequence} from '../services/autoDirector';
import {
  createProjectFromInput,
  generateLocalEvangelisticScript,
} from '../services/scriptEngine';
import type {
  AspectRatio,
  EvangelisticScript,
  MinistryIdentity,
  SceneImageId,
  TargetAudience,
  VideoDuration,
  VideoProject,
  VideoScene,
  VoiceType,
} from '../types/evangeliza';

interface YouthStudioProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

type YouthTopicCategory =
  | 'Identidad en Cristo'
  | 'Propósito de vida'
  | 'Presión social'
  | 'Amistades'
  | 'Familia'
  | 'Esperanza'
  | 'Fe'
  | 'Decisiones'
  | 'Restauración personal';

interface YouthModuleBlueprint {
  category: YouthTopicCategory;
  title: string;
  hook: string;
  bibleRef: string;
  bibleText: string;
  reflection: string;
  callToAction: string;
  imageId: SceneImageId;
  secondaryImageId: SceneImageId;
}

const YOUTH_TOPICS: YouthModuleBlueprint[] = [
  {
    category: 'Identidad en Cristo',
    title: 'Tu identidad no depende de redes sociales ni etiquetas',
    hook: 'A veces miras una pantalla y sientes que no eres suficiente. Detente: quien te creó te llama hijo amado.',
    bibleRef: 'Efesios 2:10',
    bibleText: 'Porque somos hechura suya, creados en Cristo Jesús para buenas obras, las cuales Dios preparó de antemano.',
    reflection: 'El mundo mide tu valor por apariencia o popularidad; Jesucristo lo definió en la cruz amándote primero.',
    callToAction: 'Hoy deja atrás la comparación y camina seguro en quien eres en Cristo Jesús.',
    imageId: 'teens_purpose',
    secondaryImageId: 'youth_worship_light',
  },
  {
    category: 'Propósito de vida',
    title: 'Fuiste diseñado con un propósito eterno en Dios',
    hook: '¿Te preocupa el futuro o sientes que avanzas sin dirección clara? Dios tiene planes de bien para tu vida.',
    bibleRef: 'Jeremías 29:11',
    bibleText: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    reflection: 'Tu historia no es un accidente. Cuando entregas tus metas y talentos a Jesús, todo cobra sentido.',
    callToAction: 'Ora hoy: Señor, muéstrame tu propósito y guía cada paso de mi juventud.',
    imageId: 'youth_fellowship',
    secondaryImageId: 'inspiring_sunrise',
  },
  {
    category: 'Presión social',
    title: 'Firme ante la presión del grupo y las voces externas',
    hook: 'Decir no cuando todos dicen sí cuesta valor, pero caminar con convicción en Cristo protege tu paz.',
    bibleRef: 'Romanos 12:2',
    bibleText: 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.',
    reflection: 'No necesitas imitar caminos que destruyen el alma solo para pertenecer. Jesús te da carácter para marcar diferencia.',
    callToAction: 'Pide a Dios valentía hoy para vivir íntegro delante de Él, aun cuando nadie esté mirando.',
    imageId: 'youth_worship_light',
    secondaryImageId: 'open_bible_light',
  },
  {
    category: 'Amistades',
    title: 'Amistades verdaderas que edifican tu corazón',
    hook: 'Las personas con quienes caminas influyen hacia dónde vas. Pide a Dios amigos que amen la verdad.',
    bibleRef: 'Proverbios 17:17',
    bibleText: 'En todo tiempo ama el amigo, y es como un hermano en tiempo de angustia.',
    reflection: 'Rodéate de una comunidad de fe donde puedas hablar con sinceridad, orar y crecer sin máscaras.',
    callToAction: 'Sé hoy ese amigo fiel que anima, escucha y acerca a otros a la paz de Jesucristo.',
    imageId: 'youth_fellowship',
    secondaryImageId: 'teens_purpose',
  },
  {
    category: 'Familia',
    title: 'Honrar, sanar y dialogar en casa con la gracia de Dios',
    hook: 'Aunque a veces parezca difícil entenderse en casa, Dios puede construir puentes de respeto y perdón.',
    bibleRef: 'Colosenses 3:13',
    bibleText: 'Soportándoos unos a otros, y perdonándoos unos a otros si alguno tuviere queja contra otro. De la manera que Cristo os perdonó, así también hacedlo vosotros.',
    reflection: 'Orar por tus padres y hermanos cambia la atmósfera del hogar más rápido que cualquier discusión.',
    callToAction: 'Hoy da un paso de humildad, escucha con respeto y ora en silencio por tu familia.',
    imageId: 'restored_family',
    secondaryImageId: 'praying_people',
  },
  {
    category: 'Esperanza',
    title: 'Cuando la ansiedad pesa, Cristo sostiene tu mente',
    hook: 'Si por fuera sonríes pero por dentro cargas cansancio o tristeza, no tienes que fingir delante de Dios.',
    bibleRef: '1 Pedro 5:7',
    bibleText: 'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.',
    reflection: 'Jesús comprende cada lágrima y cada batalla silenciosa. Su paz guarda tus pensamientos hoy.',
    callToAction: 'Entrega hoy tus cargas a Jesús en oración y busca consejo pastoral y familiar sano.',
    imageId: 'finding_hope',
    secondaryImageId: 'praying_people',
  },
  {
    category: 'Fe',
    title: 'Una fe joven, viva y valiente en medio de esta generación',
    hook: 'Ninguno tenga en poco tu juventud: Dios sigue llamando jóvenes con un corazón apasionado por Su Palabra.',
    bibleRef: '1 Timoteo 4:12',
    bibleText: 'Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.',
    reflection: 'La fe no es una costumbre antigua; es caminar diariamente en amistad real con el Señor vivo.',
    callToAction: 'Abre tu Biblia hoy cinco minutos y habla con Dios con total sinceridad.',
    imageId: 'open_bible_light',
    secondaryImageId: 'youth_worship_light',
  },
  {
    category: 'Decisiones',
    title: 'Decisiones sabias hoy que cuidan tu mañana',
    hook: 'Cada elección que tomas hoy está escribiendo el capítulo de los próximos años. Consulta a Dios antes de dar el paso.',
    bibleRef: 'Proverbios 3:5-6',
    bibleText: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.',
    reflection: 'Equivocarse duele menos cuando aprendes a escuchar la dirección bíblica antes de actuar por impulso.',
    callToAction: 'Pon hoy tus estudios, relaciones y proyectos bajo la sabiduría de Jesucristo.',
    imageId: 'street_evangelism',
    secondaryImageId: 'jesus_teaching',
  },
  {
    category: 'Restauración personal',
    title: 'Nunca has caído tan hondo que la gracia de Cristo no te alcance',
    hook: 'Tal vez sientes culpa por errores pasados y piensas que ya arruinaste tu historia. En Jesús siempre hay perdón y nuevo comienzo.',
    bibleRef: '2 Corintios 5:17',
    bibleText: 'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.',
    reflection: 'La cruz de Cristo borra el pasado acusador y te levanta con dignidad para empezar de nuevo.',
    callToAction: 'Arrepiéntete con sinceridad, recibe el perdón de Jesús y comienza hoy una vida restaurada.',
    imageId: 'testimony_freedom',
    secondaryImageId: 'salvation_grace',
  },
];

export const YouthStudio: React.FC<YouthStudioProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [selectedBlueprint, setSelectedBlueprint] = useState<YouthModuleBlueprint>(
    YOUTH_TOPICS[0],
  );
  const [audience, setAudience] = useState<TargetAudience>('Adolescentes');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [voiceType, setVoiceType] = useState<VoiceType>('masculina');
  const [customTopic, setCustomTopic] = useState('');
  const [isProducing, setIsProducing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const buildBlueprintProject = (bp: YouthModuleBlueprint): VideoProject => {
    const rawScenes = [
      {
        imageId: bp.imageId,
        onScreen: bp.title,
        narration: bp.hook,
      },
      {
        imageId: 'open_bible_light' as SceneImageId,
        onScreen: `«${bp.bibleText}» (${bp.bibleRef})`,
        narration: `La Palabra de Dios dice en ${bp.bibleRef}: ${bp.bibleText}`,
        bibleRef: bp.bibleRef,
      },
      {
        imageId: bp.secondaryImageId,
        onScreen: bp.reflection,
        narration: bp.reflection,
      },
      {
        imageId: 'salvation_grace' as SceneImageId,
        onScreen: bp.callToAction,
        narration: bp.callToAction,
      },
    ];

    const perSec = Math.max(4, Math.floor(duration / rawScenes.length));
    const rem = duration - perSec * rawScenes.length;

    const scenes: VideoScene[] = rawScenes.map((sc, idx) => ({
      id: `youth_sc_${Date.now().toString(36)}_${idx}`,
      order: idx + 1,
      durationSec: perSec + (idx === rawScenes.length - 1 ? rem : 0),
      imageId: sc.imageId,
      visualDirection: 'Encuadre juvenil cercano, auténtico y lleno de esperanza.',
      onScreenText: sc.onScreen,
      narrationText: sc.narration,
      bibleRef: sc.bibleRef,
      transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'zoom' : 'slide',
    }));

    const baseScript: EvangelisticScript = {
      title: bp.title,
      hook3s: bp.hook,
      fullNarration: scenes.map((s) => s.narrationText).join(' '),
      bibleReference: bp.bibleRef,
      bibleVerseText: bp.bibleText,
      callToAction: bp.callToAction,
      scenes,
    };

    const {script} = directScriptSequence(baseScript, {
      topic: bp.title,
      productionFormat: 'adolescentes',
      targetDuration: duration,
    });
    script.scenes = script.scenes.map((sc, idx) => ({
      ...sc,
      imageId: rawScenes[idx]?.imageId ?? sc.imageId,
    }));

    return createProjectFromInput(
      {
        topic: bp.title,
        productionFormat: 'adolescentes',
        audience,
        duration,
        aspectRatio,
        visualStyle: 'dorada_esperanza',
        voiceType,
        musicTrackId: 'cinematografica',
        customBibleRef: bp.bibleRef,
        customBibleText: bp.bibleText,
        customCallToAction: bp.callToAction,
        ministryIdentity,
      },
      script,
    );
  };

  const handleProduceTopic = async (
    bp: YouthModuleBlueprint,
    withOneClickVoice: boolean,
  ) => {
    setStatusNotice(null);
    if (!withOneClickVoice) {
      onSelectProject(buildBlueprintProject(bp));
      return;
    }
    setIsProducing(true);
    try {
      const {project, notice} = await produceOneClickEvangelisticVideo({
        topic: bp.title,
        productionFormat: 'adolescentes',
        audience,
        duration,
        aspectRatio,
        visualStyle: 'dorada_esperanza',
        voiceType,
        musicTrackId: 'cinematografica',
        customBibleRef: bp.bibleRef,
        customBibleText: bp.bibleText,
        customCallToAction: bp.callToAction,
        ministryIdentity,
      });
      if (notice) setStatusNotice(notice);
      onSelectProject(project);
    } finally {
      setIsProducing(false);
    }
  };

  const handleProduceCustomYouth = async () => {
    const clean =
      customTopic.trim() || 'Tu propósito y valor verdadero están en Jesucristo';
    setStatusNotice(null);
    setIsProducing(true);
    try {
      const {project, notice} = await produceOneClickEvangelisticVideo({
        topic: clean,
        productionFormat: 'adolescentes',
        audience,
        duration,
        aspectRatio,
        visualStyle: 'dorada_esperanza',
        voiceType,
        musicTrackId: 'cinematografica',
        ministryIdentity,
      });
      if (notice) setStatusNotice(notice);
      onSelectProject(project);
    } finally {
      setIsProducing(false);
    }
  };

  const handleOpenCustomEditor = () => {
    const clean =
      customTopic.trim() || 'Tu propósito y valor verdadero están en Jesucristo';
    const raw = generateLocalEvangelisticScript({
      topic: clean,
      productionFormat: 'adolescentes',
      audience,
      duration,
      aspectRatio,
      visualStyle: 'dorada_esperanza',
      voiceType,
      musicTrackId: 'cinematografica',
      ministryIdentity,
    });
    const {script} = directScriptSequence(raw, {
      topic: clean,
      productionFormat: 'adolescentes',
      targetDuration: duration,
    });
    onSelectProject(
      createProjectFromInput(
        {
          topic: clean,
          productionFormat: 'adolescentes',
          audience,
          duration,
          aspectRatio,
          visualStyle: 'dorada_esperanza',
          voiceType,
          musicTrackId: 'cinematografica',
          ministryIdentity,
        },
        script,
      ),
    );
  };

  const featuredScene = SCENE_MAP[selectedBlueprint.imageId];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Evangelismo Juvenil y Adolescentes · Lenguaje Cercano y Bíblico
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Estudio Juvenil en Cristo
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-300">
            Videos breves y profundos sobre identidad, propósito, presión social, amistades, esperanza, decisiones y restauración en Jesucristo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Audiencia juvenil"
            value={audience}
            onChange={(e) => setAudience(e.target.value as TargetAudience)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="Adolescentes">Público: Adolescentes</option>
            <option value="Jóvenes">Público: Jóvenes</option>
          </select>

          <select
            aria-label="Formato juvenil"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="9:16">9:16 Vertical (TikTok · Reels · WA)</option>
            <option value="1:1">1:1 Cuadrado</option>
            <option value="16:9">16:9 Horizontal (YouTube)</option>
          </select>

          <select
            aria-label="Duración juvenil"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value={30}>30 segundos</option>
            <option value={60}>60 segundos</option>
            <option value={90}>90 segundos</option>
          </select>

          <select
            aria-label="Voz juvenil"
            value={voiceType}
            onChange={(e) => setVoiceType(e.target.value as VoiceType)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="masculina">Voz masculina</option>
            <option value="femenina">Voz femenina</option>
            <option value="propia">Mi propia voz</option>
          </select>
        </div>
      </div>

      {/* 9 Youth Topic Cards + Detail Studio Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
          {YOUTH_TOPICS.map((item) => {
            const active = item.category === selectedBlueprint.category;
            return (
              <button
                key={item.category}
                type="button"
                onClick={() => {
                  setSelectedBlueprint(item);
                  setStatusNotice(null);
                }}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-[#B47B22] bg-white dark:border-[#EAB354] dark:bg-[#171C28]'
                    : 'border-stone-200 bg-white hover:border-stone-300 dark:border-slate-800 dark:bg-[#11151E]'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                    {item.category} · {item.bibleRef}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-stone-900 dark:text-[#F4F1EA]">
                    {item.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <section className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white lg:col-span-7 dark:border-slate-800 dark:bg-[#11151E]">
          <div>
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
              <img
                src={featuredScene.src}
                alt={selectedBlueprint.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-xs font-semibold text-amber-300">
                  {selectedBlueprint.category} · {selectedBlueprint.bibleRef}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold leading-snug sm:text-3xl">
                  {selectedBlueprint.title}
                </h2>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                  Gancho inicial
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                  {selectedBlueprint.hook}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-4 dark:border-slate-800 dark:bg-[#090B10]">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                  <BookOpen className="h-3.5 w-3.5" />
                  Fundamento bíblico ({selectedBlueprint.bibleRef})
                </p>
                <p className="mt-1 text-sm italic text-stone-800 dark:text-stone-200">
                  «{selectedBlueprint.bibleText}»
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                  Reflexión y llamado
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                  {selectedBlueprint.reflection} {selectedBlueprint.callToAction}
                </p>
              </div>

              {statusNotice && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {statusNotice}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-stone-200 p-5 dark:border-slate-800">
            <button
              type="button"
              disabled={isProducing}
              onClick={() => void handleProduceTopic(selectedBlueprint, true)}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              <Zap className="h-4 w-4" />
              {isProducing ? 'Preparando video...' : 'Crear en 1 clic con voz'}
            </button>

            <button
              type="button"
              disabled={isProducing}
              onClick={() => void handleProduceTopic(selectedBlueprint, false)}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
            >
              <Film className="h-4 w-4" />
              Personalizar en editor
            </button>
          </div>
        </section>
      </div>

      {/* Custom Youth Topic */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Escribir otro tema para jóvenes o adolescentes
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-400">
                Redacta cualquier inquietud actual de la juventud y recibe un guion bíblico cercano, respetuoso y listo para exportar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ej. Cómo cuidar el corazón en el noviazgo cristiano, o Vencer la comparación en redes..."
                className="min-h-[46px] flex-1 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
              <button
                type="button"
                disabled={isProducing}
                onClick={() => void handleProduceCustomYouth()}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-5 text-sm font-semibold text-white hover:bg-[#9A6B1E] disabled:opacity-60 whitespace-nowrap shrink-0 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
              >
                <Zap className="h-4 w-4" />
                1 Clic juvenil
              </button>
              <button
                type="button"
                disabled={isProducing}
                onClick={handleOpenCustomEditor}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-60 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
              >
                Editar guion
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
