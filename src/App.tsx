import React, {useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clapperboard,
  Film,
  FolderArchive,
  Heart,
  Home,
  Library,
  MapPin,
  Moon,
  PlusCircle,
  Smile,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react';
import {BiblicalLibraryView} from './components/BiblicalLibraryView';
import {CampaignsHub} from './components/CampaignsHub';
import {ChurchInvitationsStudio} from './components/ChurchInvitationsStudio';
import {CreationStudio} from './components/CreationStudio';
import {GuidedVideoWizard} from './components/GuidedVideoWizard';
import {HomeHub, type WizardEntryIntent} from './components/HomeHub';
import {KidsStudio} from './components/KidsStudio';
import {PWAInstallButton} from './components/PWAInstallBanner';
import {ProjectsVault} from './components/ProjectsVault';
import {SermonsLibrary} from './components/SermonsLibrary';
import {TestimonyStudio} from './components/TestimonyStudio';
import {VideoEditor} from './components/VideoEditor';
import {YouthStudio} from './components/YouthStudio';
import {PREPARED_SERMONS} from './data/sermons';
import {useOnlineStatus} from './hooks/usePWA';
import {
  normalizeMinistryIdentity,
  normalizeVideoProject,
} from './services/orthography';
import {createProjectFromSermon, DEFAULT_MINISTRY_IDENTITY} from './services/scriptEngine';
import {
  deleteProjectById,
  getAllProjects,
  getAppSettings,
  migrateExistingProjectsOrthography,
  saveAppSettings,
  saveProject,
} from './services/storageDb';
import type {AppSection, MinistryIdentity, VideoProject} from './types/evangeliza';

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeSection, setActiveSection] = useState<AppSection>('inicio');
  const [wizardIntent, setWizardIntent] = useState<WizardEntryIntent>('biblico');
  const [wizardInitialProject, setWizardInitialProject] = useState<VideoProject | null>(null);
  const [wizardSessionKey, setWizardSessionKey] = useState(1);

  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [ministryIdentity, setMinistryIdentity] = useState<MinistryIdentity>(
    DEFAULT_MINISTRY_IDENTITY,
  );
  const [completedEpisodes, setCompletedEpisodes] = useState<Record<string, number[]>>({});
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    await migrateExistingProjectsOrthography();
    const [storedSettings, storedProjects] = await Promise.all([
      getAppSettings(),
      getAllProjects(),
    ]);

    setTheme(storedSettings.theme);
    setMinistryIdentity(storedSettings.ministryIdentity);
    setCompletedEpisodes(storedSettings.completedCampaignEpisodes || {});

    if (storedProjects.length > 0) {
      setProjects(storedProjects);
      setActiveProject((prev) => prev ?? storedProjects[0]);
    } else {
      // Seed one welcome starter project only when local storage is completely empty
      const starter = createProjectFromSermon(
        PREPARED_SERMONS[0],
        '9:16',
        storedSettings.ministryIdentity,
      );
      await saveProject(starter);
      setProjects([starter]);
      setActiveProject(starter);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Sync Tailwind .dark class and browser theme-color meta tag
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#090B10' : '#FAF8F4');
    }
  }, [theme]);

  const navigateSection = (section: AppSection) => {
    setActiveSection(section);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleStartWizard = (
    intent: WizardEntryIntent = 'biblico',
    presetProject: VideoProject | null = null,
  ) => {
    setWizardIntent(intent);
    setWizardInitialProject(presetProject);
    setWizardSessionKey((k) => k + 1);
    setActiveSection('asistente');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    void saveAppSettings({
      theme: nextTheme,
      ministryIdentity,
      completedCampaignEpisodes: completedEpisodes,
    });
  };

  const handleUpdateMinistryIdentity = (nextIdentity: MinistryIdentity) => {
    const normalizedIdentity = normalizeMinistryIdentity(nextIdentity);
    setMinistryIdentity(normalizedIdentity);
    void saveAppSettings({
      theme,
      ministryIdentity: normalizedIdentity,
      completedCampaignEpisodes: completedEpisodes,
    });
    if (activeProject) {
      setActiveProject({...activeProject, ministryIdentity: normalizedIdentity});
    }
  };

  const handleToggleEpisodeComplete = (campaignId: string, day: number) => {
    const current = completedEpisodes[campaignId] || [];
    const nextDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    const nextMap = {...completedEpisodes, [campaignId]: nextDays};
    setCompletedEpisodes(nextMap);
    void saveAppSettings({
      theme,
      ministryIdentity,
      completedCampaignEpisodes: nextMap,
    });
  };

  const handleOpenInEditor = async (proj: VideoProject) => {
    const normalizedProj = normalizeVideoProject(proj);
    await saveProject(normalizedProj);
    const refreshed = await getAllProjects();
    setProjects(refreshed);
    setActiveProject(refreshed.find((p) => p.id === normalizedProj.id) ?? normalizedProj);
    setActiveSection('editor');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleUpdateActiveProject = (updated: VideoProject) => {
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleSaveProject = async (proj: VideoProject) => {
    const normalizedProj = normalizeVideoProject(proj);
    await saveProject(normalizedProj);
    const refreshed = await getAllProjects();
    setProjects(refreshed);
    const saved = refreshed.find((p) => p.id === normalizedProj.id);
    if (saved) {
      setActiveProject(saved);
    }
  };

  const handleDuplicateProject = async (proj: VideoProject) => {
    const now = new Date().toISOString();
    const clone: VideoProject = normalizeVideoProject({
      ...proj,
      id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${proj.title} (Copia)`,
      createdAt: now,
      updatedAt: now,
    });
    await saveProject(clone);
    const refreshed = await getAllProjects();
    setProjects(refreshed);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectById(id);
    const refreshed = await getAllProjects();
    setProjects(refreshed);
    if (activeProject?.id === id) {
      setActiveProject(refreshed[0] ?? null);
    }
  };

  const primaryNavLinks: Array<{id: AppSection; label: string}> = [
    {id: 'inicio', label: 'Inicio'},
    {id: 'proyectos', label: 'Mis Videos'},
    {id: 'predicaciones', label: 'Predicaciones'},
    {id: 'invitaciones', label: 'Invitaciones'},
    {id: 'biblia', label: 'Biblioteca'},
  ];

  const isAdvancedSubModule =
    activeSection === 'avanzado' ||
    activeSection === 'estudio' ||
    activeSection === 'editor' ||
    activeSection === 'campanas' ||
    activeSection === 'ninos' ||
    activeSection === 'jovenes' ||
    activeSection === 'testimonios';

  const advancedModulesNav: Array<{
    id: AppSection;
    label: string;
    icon: React.ComponentType<{className?: string}>;
  }> = [
    {id: 'estudio', label: 'Estudio completo', icon: Clapperboard},
    {id: 'editor', label: 'Editor avanzado', icon: Film},
    {id: 'campanas', label: 'Series', icon: Calendar},
    {id: 'ninos', label: 'Niños', icon: Smile},
    {id: 'jovenes', label: 'Jóvenes', icon: Users},
    {id: 'testimonios', label: 'Testimonios', icon: Heart},
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#181A1F] transition-colors duration-200 dark:bg-[#090B10] dark:text-[#F4F1EA]">
      {/* Desktop & Mobile Top Navigation Header (3-Zone Contract) */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-[#FAF8F4]/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#090B10]/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateSection('inicio')}
            className="font-display text-xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 sm:text-2xl dark:text-[#F4F1EA]"
          >
            Jairrestaura Evangeliza
          </button>

          {/* Zone 2: 5 Clean Single-Line Nav Links (Desktop) */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
            {primaryNavLinks.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateSection(item.id)}
                  className={`min-h-[40px] border-b-2 px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#B47B22] text-stone-900 dark:border-[#EAB354] dark:text-[#F4F1EA]'
                      : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-stone-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleStartWizard('biblico')}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#9A6B1E] whitespace-nowrap shrink-0 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              Crear mi video
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Utility Bar (Day/Night, PWA Install, Offline Status) */}
      <div className="border-b border-stone-200/70 bg-white/70 dark:border-slate-800/70 dark:bg-[#11151E]/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-stone-700 dark:text-slate-300">
            Pastor Jair Hernández · Escucha · Orientación · Fe
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <WifiOff className="h-3.5 w-3.5" />
                Sin conexión · Tus videos y mensajes bíblicos siguen disponibles
              </span>
            )}

            <PWAInstallButton />

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#D4A24C] dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#EAB354]" />
                  Modo Día
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#9A6B1E]" />
                  Modo Noche
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Back Strip ONLY when user opens an Advanced Tool */}
      {isAdvancedSubModule && (
        <div className="border-b border-stone-200/60 bg-[#FAF8F4] dark:border-slate-800/60 dark:bg-[#090B10]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigateSection('inicio')}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-800 hover:bg-stone-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#11151E] dark:text-stone-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio
              </button>
              {advancedModulesNav.map((mod) => {
                const Icon = mod.icon;
                const active = activeSection === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => navigateSection(mod.id)}
                    className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                        : 'text-stone-700 hover:bg-stone-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mod.label}
                  </button>
                );
              })}
            </div>
            <span className="hidden text-[11px] text-stone-500 sm:inline whitespace-nowrap shrink-0 dark:text-slate-400">
              Herramientas avanzadas
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 md:pb-14 lg:px-8">
        {!isLoaded ? (
          <div className="py-20 text-center text-sm text-stone-500 dark:text-slate-400">
            Preparando estudio evangelístico...
          </div>
        ) : (
          <>
            {activeSection === 'inicio' && (
              <HomeHub
                ministryIdentity={ministryIdentity}
                savedProjectsCount={projects.length}
                onStartWizard={(intent) => handleStartWizard(intent)}
                onNavigateSection={navigateSection}
              />
            )}

            {activeSection === 'asistente' && (
              <GuidedVideoWizard
                key={wizardSessionKey}
                ministryIdentity={ministryIdentity}
                initialIntent={wizardIntent}
                initialProject={wizardInitialProject}
                onSaveProject={handleSaveProject}
                onOpenAdvancedEditor={(proj) => void handleOpenInEditor(proj)}
                onGoToMyVideos={() => navigateSection('proyectos')}
                onCancel={() => navigateSection('inicio')}
              />
            )}

            {activeSection === 'avanzado' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h1 className="font-display text-3xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                    Herramientas avanzadas
                  </h1>
                  <p className="text-sm text-stone-600 dark:text-slate-400">
                    Módulos especializados para edición detallada, series de varios días, niños, jóvenes y testimonios.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {advancedModulesNav.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => navigateSection(tool.id)}
                        className="flex min-h-[92px] items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-[#B47B22] dark:border-slate-800 dark:bg-[#11151E] dark:hover:border-[#EAB354]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[#B47B22] dark:bg-slate-800 dark:text-[#EAB354]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
                          {tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'estudio' && (
              <CreationStudio
                ministryIdentity={ministryIdentity}
                savedProjectsCount={projects.length}
                onUpdateMinistryIdentity={handleUpdateMinistryIdentity}
                onProjectCreated={(proj) => void handleOpenInEditor(proj)}
                onOpenSermons={() => navigateSection('predicaciones')}
                onNavigateSection={navigateSection}
              />
            )}

            {activeSection === 'predicaciones' && (
              <SermonsLibrary
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'campanas' && (
              <CampaignsHub
                ministryIdentity={ministryIdentity}
                completedEpisodes={completedEpisodes}
                onToggleEpisodeComplete={handleToggleEpisodeComplete}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'ninos' && (
              <KidsStudio
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'jovenes' && (
              <YouthStudio
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'invitaciones' && (
              <ChurchInvitationsStudio
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'testimonios' && (
              <TestimonyStudio
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'biblia' && (
              <BiblicalLibraryView
                ministryIdentity={ministryIdentity}
                onSelectProject={(proj) => void handleOpenInEditor(proj)}
              />
            )}

            {activeSection === 'editor' && activeProject && (
              <VideoEditor
                project={activeProject}
                onUpdateProject={handleUpdateActiveProject}
                onSaveProject={handleSaveProject}
              />
            )}

            {activeSection === 'editor' && !activeProject && (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#11151E]">
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                  No hay un video abierto en el editor
                </h2>
                <p className="mt-2 text-sm text-stone-600 dark:text-slate-400">
                  Crea un video nuevo o elige uno de tus videos guardados.
                </p>
                <button
                  type="button"
                  onClick={() => handleStartWizard('biblico')}
                  className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white dark:bg-[#D4A24C] dark:text-[#090B10]"
                >
                  Crear mi video
                </button>
              </div>
            )}

            {activeSection === 'proyectos' && (
              <ProjectsVault
                projects={projects}
                ministryIdentity={ministryIdentity}
                onUpdateMinistryIdentity={handleUpdateMinistryIdentity}
                onOpenProject={(proj) => {
                  setActiveProject(proj);
                  navigateSection('editor');
                }}
                onDuplicateProject={(proj) => void handleDuplicateProject(proj)}
                onDeleteProject={(id) => void handleDeleteProject(id)}
                onCreateNew={() => handleStartWizard('biblico')}
                onRefreshData={loadWorkspaceData}
              />
            )}
          </>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="hidden border-t border-stone-200 py-8 text-center text-xs text-stone-600 md:block dark:border-slate-800 dark:text-slate-300">
        <div className="mx-auto max-w-7xl px-6">
          JAIRRESTAURA EVANGELIZA · Pastor Jair Hernández · ESCUCHA · ORIENTACIÓN · FE · Acceso gratuito y sin registro obligatorio para compartir el mensaje de Jesucristo.
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Tab Bar (<= 15% viewport height) */}
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-stone-200 bg-[#FAF8F4]/95 px-1 pb-safe backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#090B10]/95"
      >
        {[
          {id: 'inicio' as AppSection, label: 'Inicio', icon: Home, onClick: () => navigateSection('inicio')},
          {id: 'asistente' as AppSection, label: 'Crear', icon: PlusCircle, onClick: () => handleStartWizard('biblico')},
          {id: 'proyectos' as AppSection, label: 'Mis Videos', icon: FolderArchive, onClick: () => navigateSection('proyectos')},
          {id: 'predicaciones' as AppSection, label: 'Mensajes', icon: BookOpen, onClick: () => navigateSection('predicaciones')},
          {id: 'avanzado' as AppSection, label: 'Más', icon: Library, onClick: () => navigateSection('avanzado')},
        ].map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg px-1 py-1 transition-colors ${
                active
                  ? 'text-[#9A6B1E] dark:text-[#EAB354]'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 truncate text-[10px] font-semibold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
