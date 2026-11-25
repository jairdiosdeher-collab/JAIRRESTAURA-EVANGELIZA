import React, {useState} from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  FolderArchive,
  Heart,
  Library,
  MapPin,
  Mic,
  PlayCircle,
  Smile,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import type {AppSection, MinistryIdentity} from '../types/evangeliza';

export type WizardEntryIntent = 'biblico' | 'voz' | 'invitacion';

interface HomeHubProps {
  ministryIdentity: MinistryIdentity;
  savedProjectsCount: number;
  onStartWizard: (intent: WizardEntryIntent) => void;
  onNavigateSection: (section: AppSection) => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  ministryIdentity,
  savedProjectsCount,
  onStartWizard,
  onNavigateSection,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const heroImage = SCENE_MAP.salvation_grace;

  const quickOptions: Array<{
    intent: WizardEntryIntent;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {
      intent: 'biblico',
      title: 'Video con mensaje bíblico',
      description: 'Elige un tema de fe o escribe el tuyo y deja que preparemos las escenas por ti.',
      imageSrc: SCENE_MAP.open_bible_light.src,
      imageAlt: 'Biblia abierta iluminada con luz cálida',
      icon: BookOpen,
    },
    {
      intent: 'voz',
      title: 'Video con mi propia voz',
      description: 'Graba tu saludo o mensaje pastoral y acompáñalo con imágenes bíblicas y música.',
      imageSrc: SCENE_MAP.praying_people.src,
      imageAlt: 'Persona orando junto a la Biblia',
      icon: Mic,
    },
    {
      intent: 'invitacion',
      title: 'Video de invitación',
      description: 'Invita a tu iglesia, culto o reunión familiar con horario y dirección claros.',
      imageSrc: SCENE_MAP.church_invitation_welcome.src,
      imageAlt: 'Iglesia iluminada dando la bienvenida',
      icon: MapPin,
    },
  ];

  const secondaryLinks: Array<{
    section: AppSection;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {
      section: 'proyectos',
      title: 'Mis Videos',
      subtitle:
        savedProjectsCount > 0
          ? `${savedProjectsCount} videos guardados en tu dispositivo`
          : 'Tus mensajes guardados y copias',
      icon: FolderArchive,
    },
    {
      section: 'predicaciones',
      title: 'Predicaciones',
      subtitle: '12 mensajes completos listos para compartir',
      icon: BookOpen,
    },
    {
      section: 'invitaciones',
      title: 'Invitaciones',
      subtitle: 'Plantillas para cultos y congregaciones',
      icon: MapPin,
    },
    {
      section: 'biblia',
      title: 'Biblioteca Bíblica',
      subtitle: 'Versículos listos para convertir en video',
      icon: Library,
    },
  ];

  const advancedTools: Array<{
    section: AppSection;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {
      section: 'estudio',
      title: 'Estudio profesional completo',
      subtitle: 'Control detallado de guion, ritmo y parámetros',
      icon: Clapperboard,
    },
    {
      section: 'editor',
      title: 'Editor escena por escena',
      subtitle: 'Ajusta imágenes individuales, movimientos y línea de tiempo',
      icon: Film,
    },
    {
      section: 'campanas',
      title: 'Series evangelísticas',
      subtitle: 'Colecciones continuas de 7, 10, 12 y 30 días',
      icon: Calendar,
    },
    {
      section: 'ninos',
      title: 'Evangelismo infantil',
      subtitle: 'Historias bíblicas tiernas y valores para niños',
      icon: Smile,
    },
    {
      section: 'jovenes',
      title: 'Evangelismo juvenil',
      subtitle: 'Mensajes cercanos para adolescentes y jóvenes',
      icon: Users,
    },
    {
      section: 'testimonios',
      title: 'Testimonios reales',
      subtitle: 'Relatos escritos o narrados con fotografías propias',
      icon: Heart,
    },
  ];

  return (
    <div className="space-y-12">
      {/* Main Hero Card */}
      <section className="grid grid-cols-1 items-stretch gap-8 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 lg:grid-cols-12 lg:p-10 dark:border-slate-800 dark:bg-[#11151E]">
        <div className="flex flex-col justify-between space-y-8 lg:col-span-7">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-[0.14em] text-[#9A6B1E] dark:text-[#EAB354]">
                {ministryIdentity.brandName || 'JAIRRESTAURA EVANGELIZA'}
              </p>
              <p className="text-sm font-medium text-stone-600 dark:text-slate-300">
                {ministryIdentity.authorLine || 'Pastor Jair Hernández'} ·{' '}
                {ministryIdentity.motto || 'ESCUCHA · ORIENTACIÓN · FE'}
              </p>
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl dark:text-[#F4F1EA] [text-wrap:balance]">
              Comparte un mensaje de Jesucristo en pocos minutos
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-slate-300">
              Elige una enseñanza bíblica, añade tu propia voz si lo deseas y descarga un video listo para enviar por WhatsApp, Facebook, Instagram o YouTube.
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onStartWizard('biblico')}
              className="inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-[#B47B22] px-8 py-4 text-base font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-[#9A6B1E] focus-visible:outline-2 focus-visible:outline-[#D4A24C] sm:w-auto dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              <PlayCircle className="h-5 w-5" />
              CREAR MI VIDEO
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Gratuito, en español y sin registro obligatorio · 5 pasos sencillos.
            </p>
          </div>
        </div>

        {/* Hero Photography */}
        <div className="relative min-h-[260px] overflow-hidden rounded-2xl bg-slate-950 lg:col-span-5">
          <img
            src={heroImage.src}
            alt={heroImage.description}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-xs font-semibold text-amber-300">
              Estudio guiado paso a paso
            </p>
            <p className="mt-1 font-display text-2xl font-bold leading-snug text-white">
              «Porque de tal manera amó Dios al mundo…»
            </p>
            <p className="mt-1 text-xs text-stone-300">
              Juan 3:16 · Imágenes, música y subtítulos incluidos
            </p>
          </div>
        </div>
      </section>

      {/* Three Simple Ways to Start */}
      <section aria-labelledby="home-three-options-title" className="space-y-5">
        <div className="space-y-1">
          <h2
            id="home-three-options-title"
            className="font-display text-2xl font-bold text-stone-900 sm:text-3xl dark:text-[#F4F1EA]"
          >
            ¿Cómo quieres empezar hoy?
          </h2>
          <p className="text-sm text-stone-600 dark:text-slate-400">
            Cualquiera de estas tres opciones te guiará paso a paso hasta descargar tu video.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {quickOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.intent}
                type="button"
                onClick={() => onStartWizard(opt.intent)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left transition-colors hover:border-[#B47B22] focus-visible:outline-2 focus-visible:outline-[#D4A24C] dark:border-slate-800 dark:bg-[#11151E] dark:hover:border-[#EAB354]"
              >
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={opt.imageSrc}
                    alt={opt.imageAlt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-4 text-white">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-display text-xl font-bold leading-tight">
                      {opt.title}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <p className="text-sm leading-relaxed text-stone-600 dark:text-slate-300">
                    {opt.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
                    Comenzar ahora
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Secondary Accesses */}
      <section aria-labelledby="home-secondary-title" className="space-y-4">
        <h2
          id="home-secondary-title"
          className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]"
        >
          Accesos rápidos
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.section}
                type="button"
                onClick={() => onNavigateSection(item.section)}
                className="flex min-h-[84px] items-start gap-3.5 rounded-2xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#11151E] dark:hover:border-[#EAB354]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[#9A6B1E] dark:bg-slate-800 dark:text-[#EAB354]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Collapsible Advanced Tools Section */}
      <section className="rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#11151E]">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className="flex min-h-[60px] w-full items-center justify-between gap-4 px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-stone-500 dark:text-slate-400" />
            <div>
              <p className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                Herramientas avanzadas
              </p>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Editor por escenas, series de varios días, niños, jóvenes y testimonios
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A6B1E] dark:text-[#EAB354] whitespace-nowrap shrink-0">
            {showAdvanced ? 'Ocultar' : 'Mostrar'}
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-3 border-t border-stone-200 p-6 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
            {advancedTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.section}
                  type="button"
                  onClick={() => onNavigateSection(tool.section)}
                  className="flex min-h-[72px] items-start gap-3 rounded-xl border border-stone-200 bg-[#FAF8F4] p-4 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#090B10] dark:hover:border-[#EAB354]"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-[#F4F1EA]">
                      {tool.title}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-600 dark:text-slate-400">
                      {tool.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
