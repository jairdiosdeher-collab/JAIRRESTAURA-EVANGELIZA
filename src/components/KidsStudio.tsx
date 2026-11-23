import React, {useState} from 'react';
import {BookOpen, CheckCircle2, Film, HelpCircle, Sparkles, Zap} from 'lucide-react';
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
  VideoDuration,
  VideoProject,
  VideoScene,
  VoiceType,
} from '../types/evangeliza';

interface KidsStudioProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

type KidsCategory =
  | 'Historias bíblicas'
  | 'Enseñanzas de Jesús'
  | 'Parábolas'
  | 'Valores cristianos'
  | 'Oraciones infantiles'
  | 'Canciones originales'
  | 'Preguntas interactivas';

interface KidsTemplate {
  id: string;
  category: KidsCategory;
  title: string;
  ageRange: string;
  bibleRef: string;
  bibleText: string;
  summary: string;
  imageId: SceneImageId;
  secondaryImageId: SceneImageId;
  scenesContent: Array<{onScreen: string; narration: string; imageId: SceneImageId}>;
  callToAction: string;
  quizQuestion?: string;
  quizOptions?: string[];
  quizCorrectIdx?: number;
  quizFeedback?: string;
}

const KIDS_CATEGORIES: KidsCategory[] = [
  'Historias bíblicas',
  'Enseñanzas de Jesús',
  'Parábolas',
  'Valores cristianos',
  'Oraciones infantiles',
  'Canciones originales',
  'Preguntas interactivas',
];

const KIDS_TEMPLATES: KidsTemplate[] = [
  {
    id: 'historia-david',
    category: 'Historias bíblicas',
    title: 'David y el gigante: con Dios no hay miedo',
    ageRange: '5 a 11 años',
    bibleRef: 'Salmos 56:3',
    bibleText: 'En el día que temo, yo en ti confío.',
    summary: 'Historia bíblica que enseña a los niños que el tamaño de su fe es mayor que cualquier temor.',
    imageId: 'kids_jesus_children',
    secondaryImageId: 'biblical_landscape',
    scenesContent: [
      {
        imageId: 'kids_jesus_children',
        onScreen: '¿Alguna vez sentiste un miedo muy grande?',
        narration: 'Hola amiguitos. Un joven pastor llamado David vio a un gigante muy alto, pero recordó algo maravilloso.',
      },
      {
        imageId: 'biblical_landscape',
        onScreen: 'David confiaba en el Dios Todopoderoso.',
        narration: 'David no era fuerte por su tamaño, sino porque caminaba de la mano de Dios y oraba cada día.',
      },
      {
        imageId: 'open_bible_light',
        onScreen: '«En el día que temo, yo en ti confío.» (Salmos 56:3)',
        narration: 'La Biblia nos enseña en Salmos 56:3: En el día que temo, yo en ti confío.',
      },
      {
        imageId: 'kids_good_shepherd',
        onScreen: 'Jesús cuida tu corazón de día y de noche.',
        narration: 'Cuando sientas miedo en la escuela o en la noche, cuéntaselo a Jesús en oración y Él te dará valentía.',
      },
    ],
    callToAction: 'Oremos juntos: Señor Jesús, gracias por cuidarme y quitar todo miedo de mi corazón. Amén.',
    quizQuestion: '¿Qué hizo David cuando vio un problema gigante?',
    quizOptions: [
      'Se escondió para siempre',
      'Confió en la ayuda de Dios',
      'Olvidó orar',
    ],
    quizCorrectIdx: 1,
    quizFeedback: '¡Muy bien! David confió en Dios, porque nuestro Padre celestial siempre nos acompaña.',
  },
  {
    id: 'ensenanza-jesus-ninos',
    category: 'Enseñanzas de Jesús',
    title: 'Dejad a los niños venir a mí',
    ageRange: '4 a 10 años',
    bibleRef: 'Marcos 10:14',
    bibleText: 'Dejad a los niños venir a mí, y no se lo impidáis; porque de los tales es el reino de Dios.',
    summary: 'Jesús recibió, abrazó y bendijo a los niños mostrando cuánto valen delante de Dios.',
    imageId: 'kids_jesus_children',
    secondaryImageId: 'children_bible',
    scenesContent: [
      {
        imageId: 'kids_jesus_children',
        onScreen: 'Jesús siempre tiene tiempo para los niños.',
        narration: 'Un día muchas familias llevaron a sus niños para ver a Jesús. Algunos creyeron que Jesús estaba muy ocupado.',
      },
      {
        imageId: 'jesus_teaching',
        onScreen: '«Dejad a los niños venir a mí» (Marcos 10:14)',
        narration: 'Pero Jesús sonrió y dijo: Dejad a los niños venir a mí, porque de los tales es el reino de Dios.',
      },
      {
        imageId: 'children_bible',
        onScreen: 'Eres muy amado e importante para Jesús.',
        narration: 'Tú nunca eres demasiado pequeño para hablar con Jesús, cantar para Él y aprender de la Biblia.',
      },
      {
        imageId: 'inspiring_sunrise',
        onScreen: 'Habla con Jesús hoy con alegría.',
        narration: 'Cada mañana puedes sonreír y decir: Gracias Jesús porque eres mi mejor amigo.',
      },
    ],
    callToAction: 'Acércate hoy a Jesús con una oración alegre. Él siempre escucha a cada niño.',
  },
  {
    id: 'parabola-oveja-perdida',
    category: 'Parábolas',
    title: 'La ovejita perdida y el Buen Pastor',
    ageRange: '4 a 9 años',
    bibleRef: 'Lucas 15:4-5',
    bibleText: '¿Qué hombre de vosotros, teniendo cien ovejas, si pierde una de ellas, no deja las noventa y nueve, y va tras la que se perdió, hasta encontrarla?',
    summary: 'La tierna parábola donde Jesús busca con amor a la oveja que se extravió.',
    imageId: 'kids_good_shepherd',
    secondaryImageId: 'biblical_landscape',
    scenesContent: [
      {
        imageId: 'kids_good_shepherd',
        onScreen: 'Un buen pastor conoce a cada oveja por su nombre.',
        narration: 'Había una vez un pastor muy bueno que cuidaba cien ovejas. Las contaba todas con mucho cariño.',
      },
      {
        imageId: 'biblical_landscape',
        onScreen: 'Una ovejita se alejó y se perdió entre las colinas.',
        narration: 'Una tarde faltaba una ovejita. El pastor no dijo no importa; salió enseguida a buscarla con amor.',
      },
      {
        imageId: 'open_bible_light',
        onScreen: '«Va tras la que se perdió, hasta encontrarla» (Lucas 15:4)',
        narration: 'Cuando la encontró, la puso sobre sus hombros muy feliz. Así mismo nos busca y cuida nuestro Señor Jesús.',
      },
      {
        imageId: 'kids_jesus_children',
        onScreen: 'Nunca estás olvidado: Jesús te ama y te cuida.',
        narration: 'Qué alegría saber que para Jesús cada niño y cada niña es un tesoro especial.',
      },
    ],
    callToAction: 'Da gracias hoy a Jesús, nuestro Buen Pastor, que nos guía con amor todos los días.',
  },
  {
    id: 'valores-bondad',
    category: 'Valores cristianos',
    title: 'Compartir, decir la verdad y obedecer con amor',
    ageRange: '5 a 11 años',
    bibleRef: 'Efesios 4:32',
    bibleText: 'Antes sed benignos unos con otros, misericordiosos, perdonándoos unos a otros, como Dios también os perdonó a vosotros en Cristo.',
    summary: 'Valores cristianos cotidianos para la familia, el colegio y las amistades.',
    imageId: 'children_bible',
    secondaryImageId: 'restored_family',
    scenesContent: [
      {
        imageId: 'children_bible',
        onScreen: 'Los niños que aman a Jesús reflejan su luz.',
        narration: '¿Cómo podemos mostrar el amor de Jesús en casa y en la escuela? Con pequeños gestos de bondad cada día.',
      },
      {
        imageId: 'restored_family',
        onScreen: 'Decir la verdad, ayudar y perdonar con alegría.',
        narration: 'Cuando compartimos, decimos la verdad, respetamos a papá y mamá y consolamos a un amigo triste, agradamos a Dios.',
      },
      {
        imageId: 'open_bible_light',
        onScreen: '«Sed benignos unos con otros, misericordiosos» (Efesios 4:32)',
        narration: 'Efesios 4:32 nos recuerda ser bondadosos y perdonar, así como Cristo nos ama primero.',
      },
      {
        imageId: 'kids_jesus_children',
        onScreen: 'Hoy puedes ser un instrumento de paz en tu hogar.',
        narration: 'Pide a Jesús que llene tus palabras de amabilidad y tus manos de servicio.',
      },
    ],
    callToAction: 'Señor Jesús, ayúdame hoy a amar, compartir y obedecer con un corazón alegre. Amén.',
  },
  {
    id: 'oracion-infantil-noche',
    category: 'Oraciones infantiles',
    title: 'Oración infantil antes de dormir y al despertar',
    ageRange: '3 a 9 años',
    bibleRef: 'Salmos 4:8',
    bibleText: 'En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me haces vivir confiado.',
    summary: 'Guía guiada paso a paso para que los niños aprendan a conversar con Dios con sencillez.',
    imageId: 'praying_people',
    secondaryImageId: 'kids_good_shepherd',
    scenesContent: [
      {
        imageId: 'kids_good_shepherd',
        onScreen: 'Orar es conversar con Dios como con un buen papá.',
        narration: 'Cerrar los ojitos y hablar con Dios es uno de los regalos más hermosos de cada día.',
      },
      {
        imageId: 'praying_people',
        onScreen: 'Gracias Señor por mi familia, mi comida y tu cuidado.',
        narration: 'Primero le damos gracias a Jesús por mamá, papá, los abuelos, los amigos y el pan de cada día.',
      },
      {
        imageId: 'open_bible_light',
        onScreen: '«En paz me acostaré, y asimismo dormiré» (Salmos 4:8)',
        narration: 'Salmos 4:8 promete que podemos descansar en paz porque el Señor vela nuestro sueño.',
      },
      {
        imageId: 'inspiring_sunrise',
        onScreen: 'Amado Jesús, quédate conmigo hoy y siempre. Amén.',
        narration: 'Repite conmigo: Gracias Jesús por cuidarme de día y de noche. En tus manos descanso feliz. Amén.',
      },
    ],
    callToAction: 'Ora esta noche junto a tu familia dando gracias a Dios por su fidelidad.',
  },
  {
    id: 'cancion-buen-pastor',
    category: 'Canciones originales',
    title: 'Canción original: «Jesús es mi Buen Pastor»',
    ageRange: '4 a 10 años',
    bibleRef: 'Salmos 23:1',
    bibleText: 'Jehová es mi pastor; nada me faltará.',
    summary: 'Canto rimado con melodía instrumental suave para Escuela Dominical y devocionales en casa.',
    imageId: 'kids_good_shepherd',
    secondaryImageId: 'kids_jesus_children',
    scenesContent: [
      {
        imageId: 'kids_good_shepherd',
        onScreen: '♪ Jesús es mi Buen Pastor, me cuida con dulce amor ♪',
        narration: 'Cantemos juntos con alegría: Jesús es mi Buen Pastor, me cuida con dulce amor; de día me da su paz, de noche conmigo está.',
      },
      {
        imageId: 'kids_jesus_children',
        onScreen: '♪ Cuando juego o voy a estudiar, Su mano me guiará ♪',
        narration: 'Cuando juego o voy a estudiar, Su mano me guiará; con fuerza y con bondad, Su Palabra es mi verdad.',
      },
      {
        imageId: 'open_bible_light',
        onScreen: '«Jehová es mi pastor; nada me faltará.» (Salmos 23:1)',
        narration: 'Por eso dice Salmos 23: Jehová es mi pastor, nada me faltará.',
      },
      {
        imageId: 'inspiring_sunrise',
        onScreen: '♪ Aleluya, gracias Jesús por tu luz ♪',
        narration: 'Aleluya, gracias Jesús, por llenar mi vida de luz. Enséñame a amar cada día más. Amén.',
      },
    ],
    callToAction: 'Comparte esta canción bíblica con los niños de tu familia o Escuela Dominical.',
  },
  {
    id: 'preguntas-interactivas',
    category: 'Preguntas interactivas',
    title: 'Desafío bíblico infantil: ¿Quién calma la tormenta?',
    ageRange: '6 a 12 años',
    bibleRef: 'Marcos 4:39',
    bibleText: 'Y levantándose, reprendió al viento, y dijo al mar: Calla, enmudece. Y cesó el viento, y se hizo grande bonanza.',
    summary: 'Video con pregunta participativa para detener y responder en clase o en familia.',
    imageId: 'miracles_of_jesus',
    secondaryImageId: 'children_bible',
    scenesContent: [
      {
        imageId: 'miracles_of_jesus',
        onScreen: 'Pregunta para ti: ¿Qué pasó en la barca durante la tormenta?',
        narration: '¡Hola niños! Hoy tenemos una pregunta especial. Los discípulos estaban en una barca y comenzó una tormenta fuerte.',
      },
      {
        imageId: 'children_bible',
        onScreen: 'Piensa tu respuesta antes de que termine el conteo...',
        narration: '¿Quién se levantó en la barca, habló al viento y al mar y todo quedó en completa calma?',
      },
      {
        imageId: 'jesus_teaching',
        onScreen: '¡Respuesta correcta: Jesucristo tiene poder sobre todo!',
        narration: '¡Así es! Fue Jesús. Marcos 4:39 dice que Él dijo al mar: Calla, enmudece, y vino una gran calma.',
      },
      {
        imageId: 'kids_jesus_children',
        onScreen: 'Cuando haya momentos difíciles, confía en el poder de Jesús.',
        narration: 'Así como calmó el mar, Jesús también trae calma a tu corazón cuando confías en Él.',
      },
    ],
    callToAction: 'Comenta en familia o en tu clase bíblica cómo Jesús trae paz en los días difíciles.',
    quizQuestion: '¿Quién habló al viento y al mar para traer una gran calma en Marcos 4:39?',
    quizOptions: [
      'Un pescador de la orilla',
      'Jesucristo, el Hijo de Dios',
      'Un ángel desde lejos',
    ],
    quizCorrectIdx: 1,
    quizFeedback: '¡Excelente respuesta! Jesucristo tiene autoridad sobre la creación y cuida de nosotros.',
  },
];

export const KidsStudio: React.FC<KidsStudioProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<KidsCategory>('Historias bíblicas');
  const [customTopic, setCustomTopic] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<VideoDuration>(60);
  const [voiceType, setVoiceType] = useState<VoiceType>('femenina');
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<Record<string, number>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const visibleTemplates = KIDS_TEMPLATES.filter(
    (t) => t.category === selectedCategory,
  );

  const buildTemplateProject = (template: KidsTemplate): VideoProject => {
    const baseSec = Math.max(4, Math.floor(duration / template.scenesContent.length));
    const remainder = duration - baseSec * template.scenesContent.length;
    const scenes: VideoScene[] = template.scenesContent.map((sc, idx) => ({
      id: `kid_scene_${Date.now().toString(36)}_${idx}`,
      order: idx + 1,
      durationSec: baseSec + (idx === template.scenesContent.length - 1 ? remainder : 0),
      imageId: sc.imageId,
      visualDirection: 'Escena infantil luminosa, tierna y pedagógica.',
      onScreenText: sc.onScreen,
      narrationText: sc.narration,
      bibleRef: idx === 2 ? template.bibleRef : undefined,
      transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'zoom' : 'slide',
    }));

    const rawScript: EvangelisticScript = {
      title: template.title,
      hook3s: template.scenesContent[0].narration,
      fullNarration: scenes.map((s) => s.narrationText).join(' '),
      bibleReference: template.bibleRef,
      bibleVerseText: template.bibleText,
      callToAction: template.callToAction,
      scenes,
    };

    const {script} = directScriptSequence(rawScript, {
      topic: template.title,
      productionFormat: 'infantil',
      targetDuration: duration,
      preserveCustomImages: false,
    });

    // Preserve bespoke kid scenes first
    script.scenes = script.scenes.map((sc, idx) => ({
      ...sc,
      imageId: template.scenesContent[idx]?.imageId ?? sc.imageId,
    }));

    return createProjectFromInput(
      {
        topic: template.title,
        productionFormat: 'infantil',
        audience: 'Niños',
        duration,
        aspectRatio,
        visualStyle: 'amanecer_gloria',
        voiceType,
        musicTrackId: 'esperanza_ambiental',
        customBibleRef: template.bibleRef,
        customBibleText: template.bibleText,
        customCallToAction: template.callToAction,
        ministryIdentity,
      },
      script,
    );
  };

  const handleOpenTemplate = (template: KidsTemplate) => {
    setStatusNotice(null);
    onSelectProject(buildTemplateProject(template));
  };

  const handleCustomKidsVideo = async (oneClickVoice: boolean) => {
    const cleanTopic =
      customTopic.trim() || 'Jesús ama y cuida a cada niño con ternura';
    setStatusNotice(null);

    if (oneClickVoice) {
      setIsBusy(true);
      try {
        const {project, notice} = await produceOneClickEvangelisticVideo({
          topic: cleanTopic,
          productionFormat: 'infantil',
          audience: 'Niños',
          duration,
          aspectRatio,
          visualStyle: 'amanecer_gloria',
          voiceType,
          musicTrackId: 'esperanza_ambiental',
          ministryIdentity,
        });
        if (notice) setStatusNotice(notice);
        onSelectProject(project);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const raw = generateLocalEvangelisticScript({
      topic: cleanTopic,
      productionFormat: 'infantil',
      audience: 'Niños',
      duration,
      aspectRatio,
      visualStyle: 'amanecer_gloria',
      voiceType,
      musicTrackId: 'esperanza_ambiental',
      ministryIdentity,
    });
    const {script} = directScriptSequence(raw, {
      topic: cleanTopic,
      productionFormat: 'infantil',
      targetDuration: duration,
    });
    onSelectProject(
      createProjectFromInput(
        {
          topic: cleanTopic,
          productionFormat: 'infantil',
          audience: 'Niños',
          duration,
          aspectRatio,
          visualStyle: 'amanecer_gloria',
          voiceType,
          musicTrackId: 'esperanza_ambiental',
          ministryIdentity,
        },
        script,
      ),
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Evangelismo Infantil · Escuela Dominical y Hogar
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Estudio Infantil con Jesús
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-300">
            Videos tiernos, coloridos y bíblicos para niños: historias, parábolas, valores, oraciones guiadas, canciones originales y preguntas participativas.
          </p>
        </div>

        {/* Settings Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Formato de pantalla infantil"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="16:9">16:9 Horizontal (TV · Proyector)</option>
            <option value="9:16">9:16 Vertical (WhatsApp · Reels)</option>
            <option value="1:1">1:1 Cuadrado</option>
          </select>

          <select
            aria-label="Duración de video infantil"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value={30}>30 segundos</option>
            <option value={60}>60 segundos</option>
            <option value={90}>90 segundos</option>
          </select>

          <select
            aria-label="Voz narradora infantil"
            value={voiceType}
            onChange={(e) => setVoiceType(e.target.value as VoiceType)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-100"
          >
            <option value="femenina">Voz femenina cálida</option>
            <option value="masculina">Voz masculina amable</option>
            <option value="propia">Grabar mi voz</option>
          </select>
        </div>
      </div>

      {/* Category Switcher */}
      <div className="flex flex-wrap gap-2">
        {KIDS_CATEGORIES.map((cat) => {
          const active = cat === selectedCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[44px] whitespace-nowrap shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#11151E] dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Curated Kids Templates Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {visibleTemplates.map((tpl) => {
          const scene = SCENE_MAP[tpl.imageId];
          const chosenIdx = selectedQuizAnswer[tpl.id];
          return (
            <article
              key={tpl.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#11151E]"
            >
              <div>
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                  <img
                    src={scene.src}
                    alt={tpl.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-xs font-semibold text-amber-300">
                      {tpl.category} · {tpl.ageRange} · {tpl.bibleRef}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
                      {tpl.title}
                    </h2>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <p className="text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                    {tpl.summary}
                  </p>

                  <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 dark:border-slate-800 dark:bg-[#090B10]">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                      <BookOpen className="h-3.5 w-3.5" />
                      Texto bíblico base ({tpl.bibleRef})
                    </p>
                    <p className="mt-1 text-sm italic text-stone-800 dark:text-stone-200">
                      «{tpl.bibleText}»
                    </p>
                  </div>

                  {tpl.quizQuestion && tpl.quizOptions && (
                    <div className="space-y-2.5 rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                        <HelpCircle className="h-4 w-4" />
                        Pregunta interactiva para la clase o familia
                      </p>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {tpl.quizQuestion}
                      </p>
                      <div className="space-y-1.5">
                        {tpl.quizOptions.map((opt, idx) => {
                          const isSelected = chosenIdx === idx;
                          const isCorrect = idx === tpl.quizCorrectIdx;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setSelectedQuizAnswer((prev) => ({
                                  ...prev,
                                  [tpl.id]: idx,
                                }))
                              }
                              className={`flex min-h-[42px] w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                                isSelected
                                  ? isCorrect
                                    ? 'border-emerald-600 bg-emerald-600/15 text-emerald-900 dark:text-emerald-200'
                                    : 'border-amber-600 bg-amber-600/15 text-amber-900 dark:text-amber-200'
                                  : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-200'
                              }`}
                            >
                              <span>{opt}</span>
                              {isSelected && isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {chosenIdx !== undefined && tpl.quizFeedback && (
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          {chosenIdx === tpl.quizCorrectIdx
                            ? tpl.quizFeedback
                            : '¡Buen intento! Escucha otra pista en el video y descúbrelo junto a Jesús.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-stone-200 p-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenTemplate(tpl)}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                >
                  <Film className="h-4 w-4" />
                  Producir este video infantil en el editor
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Custom Kid Story / Song Generator */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Crear otra historia, valor u oración infantil personalizada
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-400">
                Escribe un personaje bíblico, valor o enseñanza y genera automáticamente escenas infantiles con lenguaje tierno y claro.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ej. El arca de Noé y la fidelidad de Dios, o La importancia de decir la verdad..."
                className="min-h-[46px] flex-1 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleCustomKidsVideo(true)}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-5 text-sm font-semibold text-white hover:bg-[#9A6B1E] disabled:opacity-60 whitespace-nowrap shrink-0 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
              >
                <Zap className="h-4 w-4" />
                {isBusy ? 'Preparando...' : 'Crear en 1 clic'}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleCustomKidsVideo(false)}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-60 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
              >
                Editar guion
              </button>
            </div>

            {statusNotice && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {statusNotice}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
