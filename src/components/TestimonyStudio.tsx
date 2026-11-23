import React, {useState} from 'react';
import {
  BookOpen,
  Film,
  Image as ImageIcon,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {MUSIC_LIBRARY, synthesizeServerSpanishVoice} from '../services/audioEngine';
import {directScriptSequence} from '../services/autoDirector';
import {createProjectFromInput} from '../services/scriptEngine';
import type {
  AspectRatio,
  BibleVerseEntry,
  EvangelisticScript,
  MinistryIdentity,
  MusicTrackId,
  SceneImageId,
  VideoDuration,
  VideoProject,
  VideoScene,
  VoiceType,
} from '../types/evangeliza';
import {BibleVerseModal} from './BibleVerseModal';
import {VoiceRecorderWidget} from './VoiceRecorderWidget';

interface TestimonyStudioProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

const NEUTRAL_TESTIMONY_SCENES: SceneImageId[] = [
  'testimony_freedom',
  'open_bible_light',
  'praying_people',
  'salvation_grace',
  'inspiring_sunrise',
];

export const TestimonyStudio: React.FC<TestimonyStudioProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [personName, setPersonName] = useState('');
  const [introContext, setIntroContext] = useState('');
  const [writtenTestimony, setWrittenTestimony] = useState('');
  const [bibleRef, setBibleRef] = useState('2 Corintios 5:17');
  const [bibleText, setBibleText] = useState(
    'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.',
  );
  const [reflectionText, setReflectionText] = useState('');
  const [christInvitation, setChristInvitation] = useState(
    'Así como Dios obró con misericordia, hoy Jesucristo también puede restaurar tu historia si abres tu corazón a Él.',
  );

  const [voiceMode, setVoiceMode] = useState<'narrado' | 'propia'>('narrado');
  const [narratorVoice, setNarratorVoice] = useState<'masculina' | 'femenina'>('masculina');
  const [customVoiceDataUrl, setCustomVoiceDataUrl] = useState<string | undefined>(undefined);
  const [customVoiceMimeType, setCustomVoiceMimeType] = useState<string | undefined>(undefined);

  const [photos, setPhotos] = useState<string[]>([]);
  const [musicTrackId, setMusicTrackId] = useState<MusicTrackId>('piano_emotivo');
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [duration, setDuration] = useState<VideoDuration>(60);

  const [bibleModalOpen, setBibleModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleUploadPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSelectVerse = (verse: BibleVerseEntry) => {
    setBibleRef(verse.reference);
    setBibleText(verse.text);
  };

  const canCreate =
    writtenTestimony.trim().length >= 12 ||
    introContext.trim().length >= 12 ||
    Boolean(customVoiceDataUrl);

  const buildTestimonyProject = (): VideoProject => {
    const authorLabel = personName.trim() || 'Testimonio compartido';
    const introClean =
      introContext.trim() ||
      `${authorLabel}: un testimonio real compartido para gloria de Jesucristo.`;
    const narrationClean =
      writtenTestimony.trim() ||
      (customVoiceDataUrl
        ? 'Escucha este testimonio real compartido con la voz de quien vivió la obra de Dios.'
        : introClean);
    const reflectionClean =
      reflectionText.trim() ||
      `La Palabra de Dios confirma esta esperanza en ${bibleRef}: ${bibleText}`;

    const sceneTemplates = [
      {
        imageId: NEUTRAL_TESTIMONY_SCENES[0],
        customPhoto: photos[0],
        onScreen: personName.trim()
          ? `Testimonio de ${personName.trim()}`
          : 'Testimonio real de vida en Cristo',
        narration: introClean,
      },
      {
        imageId: NEUTRAL_TESTIMONY_SCENES[2],
        customPhoto: photos[1],
        onScreen: narrationClean.slice(0, 140),
        narration: narrationClean,
      },
      {
        imageId: NEUTRAL_TESTIMONY_SCENES[1],
        customPhoto: photos[2],
        onScreen: `«${bibleText}» (${bibleRef})`,
        narration: reflectionClean,
        bibleRef,
      },
      {
        imageId: NEUTRAL_TESTIMONY_SCENES[3],
        customPhoto: photos[3],
        onScreen: christInvitation.trim(),
        narration: christInvitation.trim(),
      },
    ];

    const perSec = Math.max(4, Math.floor(duration / sceneTemplates.length));
    const rem = duration - perSec * sceneTemplates.length;

    const scenes: VideoScene[] = sceneTemplates.map((sc, idx) => ({
      id: `testim_sc_${Date.now().toString(36)}_${idx}`,
      order: idx + 1,
      durationSec: perSec + (idx === sceneTemplates.length - 1 ? rem : 0),
      imageId: sc.imageId,
      customImageDataUrl: sc.customPhoto,
      visualDirection: 'Relato respetuoso de testimonio real centrado en la obra de Cristo.',
      onScreenText: sc.onScreen,
      narrationText: sc.narration,
      bibleRef: sc.bibleRef,
      transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'zoom' : 'slide',
    }));

    const title = personName.trim()
      ? `Testimonio de ${personName.trim()}`
      : 'Testimonio real compartido en Cristo';

    const rawScript: EvangelisticScript = {
      title,
      hook3s: introClean,
      fullNarration: scenes.map((s) => s.narrationText).join(' '),
      bibleReference: bibleRef,
      bibleVerseText: bibleText,
      callToAction: christInvitation.trim(),
      scenes,
    };

    const {script} = directScriptSequence(rawScript, {
      topic: title,
      productionFormat: 'testimonio',
      targetDuration: duration,
      preserveCustomImages: true,
    });

    script.scenes = script.scenes.map((sc, idx) => ({
      ...sc,
      imageId: sceneTemplates[idx]?.imageId ?? sc.imageId,
      customImageDataUrl: sceneTemplates[idx]?.customPhoto,
    }));

    const resolvedVoice: VoiceType = voiceMode === 'propia' ? 'propia' : narratorVoice;

    const proj = createProjectFromInput(
      {
        topic: title,
        productionFormat: 'testimonio',
        audience: 'General',
        duration,
        aspectRatio,
        visualStyle: 'luz_hogar',
        voiceType: resolvedVoice,
        musicTrackId,
        customBibleRef: bibleRef,
        customBibleText: bibleText,
        customCallToAction: christInvitation.trim(),
        ministryIdentity,
      },
      script,
    );

    proj.showSubtitles = showSubtitles;
    if (customVoiceDataUrl) {
      proj.customVoiceDataUrl = customVoiceDataUrl;
      proj.customVoiceMimeType = customVoiceMimeType;
    }
    return proj;
  };

  const handleProduceTestimony = async (withVoice: boolean) => {
    setValidationError(null);
    setStatusNotice(null);

    if (!canCreate) {
      setValidationError(
        'Por honestidad pastoral, escribe el testimonio compartido o graba la narración real antes de crear el video.',
      );
      return;
    }

    const project = buildTestimonyProject();
    if (!withVoice || project.voiceType === 'propia') {
      onSelectProject(project);
      return;
    }

    setIsBusy(true);
    try {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const tts = await synthesizeServerSpanishVoice(
          project.script.fullNarration,
          project.voiceType,
        );
        if (tts.audioDataUrl) {
          project.synthesizedVoiceDataUrl = tts.audioDataUrl;
        } else if (tts.notice) {
          setStatusNotice(tts.notice);
        }
      } else {
        setStatusNotice(
          'Modo sin conexión: el testimonio se abrió en el editor con tus textos, fotos y música.',
        );
      }
      onSelectProject(project);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
          Estudio de Testimonios · Relatos Auténticos Escritos o Grabados
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
          Estudio de Testimonios Reales
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-stone-600 dark:text-slate-300">
          Transforma un testimonio genuino escrito o grabado en voz propia en un video respetuoso con fotografías, subtítulos, música, reflexión bíblica e invitación a Cristo.
        </p>
      </div>

      {/* Explicit Ethical Principle Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#11151E]">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B47B22] dark:text-[#EAB354]" />
        <p className="text-xs leading-relaxed text-stone-700 dark:text-slate-300">
          <span className="font-bold text-stone-900 dark:text-[#F4F1EA]">
            Integridad del testimonio cristiano:
          </span>{' '}
          este módulo trabaja únicamente con los relatos reales escritos o grabados que tú o la persona autoricen compartir. Nunca inventa testimonios ni atribuye experiencias ficticias a nadie.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Written / Recorded Testimony Content */}
        <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#11151E]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="testim-person"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Nombre de quien comparte (o «Anónimo»)
              </label>
              <input
                id="testim-person"
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Opcional si prefieres mantener anonimato"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="testim-intro"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                1. Introducción breve (situación inicial)
              </label>
              <input
                id="testim-intro"
                type="text"
                value={introContext}
                onChange={(e) => setIntroContext(e.target.value)}
                placeholder="Ej. Lo que vivía antes de conocer la paz de Cristo..."
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="testim-narrative"
              className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              2. Narración escrita del testimonio real
            </label>
            <textarea
              id="testim-narrative"
              rows={4}
              value={writtenTestimony}
              onChange={(e) => setWrittenTestimony(e.target.value)}
              placeholder="Escribe aquí exactamente las palabras del testimonio compartido por quien lo vivió (o deja solo tu grabación de voz abajo)..."
              className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3.5 text-sm leading-relaxed text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
          </div>

          {/* Voice Choice: Recorded Real Voice or Read Aloud */}
          <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-slate-800">
            <span className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
              Voz del testimonio
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setVoiceMode('propia')}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  voiceMode === 'propia'
                    ? 'border-[#B47B22] bg-[#B47B22]/10 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                    : 'border-stone-200 bg-[#FAF8F4] text-stone-700 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                }`}
              >
                Voz grabada de quien testifica
              </button>
              <button
                type="button"
                onClick={() => setVoiceMode('narrado')}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  voiceMode === 'narrado'
                    ? 'border-[#B47B22] bg-[#B47B22]/10 text-[#9A6B1E] dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]'
                    : 'border-stone-200 bg-[#FAF8F4] text-stone-700 dark:border-slate-800 dark:bg-[#090B10] dark:text-slate-300'
                }`}
              >
                Narración de lectura en español
              </button>
            </div>

            {voiceMode === 'propia' ? (
              <VoiceRecorderWidget
                customVoiceDataUrl={customVoiceDataUrl}
                onChangeVoice={(url, mime) => {
                  setCustomVoiceDataUrl(url);
                  setCustomVoiceMimeType(mime);
                }}
              />
            ) : (
              <div className="flex gap-2">
                {(['masculina', 'femenina'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setNarratorVoice(v)}
                    className={`min-h-[40px] flex-1 rounded-xl border text-xs font-semibold ${
                      narratorVoice === v
                        ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                        : 'border-stone-300 bg-[#FAF8F4] text-stone-700 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-300'
                    }`}
                  >
                    Voz {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Own Photographs */}
          <div className="space-y-2.5 border-t border-stone-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                3. Fotografías propias del testimonio (opcional, hasta 5)
              </span>
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200">
                <ImageIcon className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
                Agregar fotografías
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadPhotos}
                  className="sr-only"
                />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {photos.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video overflow-hidden rounded-lg border border-stone-300 dark:border-slate-700"
                  >
                    <img
                      src={src}
                      alt={`Fotografía testimonio ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Quitar foto ${idx + 1}`}
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 rounded bg-black/75 p-1 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Music, Subtitles, Biblical Reflection & Christ Invitation */}
        <section className="flex flex-col justify-between space-y-5 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#11151E]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                4–7. Reflexión, Música e Invitación
              </h2>
              <button
                type="button"
                onClick={() => setBibleModalOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-xs font-semibold text-stone-800 hover:bg-stone-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
                Elegir versículo
              </button>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#FAF8F4] p-3.5 dark:border-slate-800 dark:bg-[#090B10]">
              <p className="text-xs font-bold text-[#9A6B1E] dark:text-[#EAB354]">
                {bibleRef}
              </p>
              <p className="mt-1 text-xs italic leading-relaxed text-stone-800 dark:text-stone-200">
                «{bibleText}»
              </p>
            </div>

            <div>
              <label
                htmlFor="testim-reflection"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                6. Reflexión bíblica (opcional)
              </label>
              <textarea
                id="testim-reflection"
                rows={2}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Breve enseñanza bíblica que conecta este testimonio con el evangelio..."
                className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="testim-invitation"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                7. Invitación final a Jesucristo
              </label>
              <textarea
                id="testim-invitation"
                rows={2}
                value={christInvitation}
                onChange={(e) => setChristInvitation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="testim-music"
                  className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                >
                  4. Música de fondo
                </label>
                <select
                  id="testim-music"
                  value={musicTrackId}
                  onChange={(e) => setMusicTrackId(e.target.value as MusicTrackId)}
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                >
                  {MUSIC_LIBRARY.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="testim-aspect"
                  className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
                >
                  Formato y duración
                </label>
                <div className="mt-1 flex gap-1.5">
                  <select
                    id="testim-aspect"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="min-h-[42px] flex-1 rounded-xl border border-stone-300 bg-[#FAF8F4] px-2 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  >
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                  </select>
                  <select
                    aria-label="Duración testimonio"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
                    className="min-h-[42px] flex-1 rounded-xl border border-stone-300 bg-[#FAF8F4] px-2 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
                  >
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#FAF8F4] px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#090B10]">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                5. Subtítulos sincronizados en pantalla
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showSubtitles}
                onClick={() => setShowSubtitles((s) => !s)}
                className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  showSubtitles
                    ? 'bg-[#B47B22] text-white dark:bg-[#D4A24C] dark:text-[#090B10]'
                    : 'bg-stone-200 text-stone-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {showSubtitles ? 'Activados' : 'Desactivados'}
              </button>
            </div>

            {validationError && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {validationError}
              </p>
            )}

            {statusNotice && (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {statusNotice}
              </p>
            )}
          </div>

          <div className="space-y-2.5 border-t border-stone-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleProduceTestimony(true)}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              <Zap className="h-4 w-4" />
              {isBusy ? 'Preparando video del testimonio...' : 'Producir video del testimonio'}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleProduceTestimony(false)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
            >
              <Film className="h-4 w-4" />
              Abrir directo en el editor de escenas
            </button>
          </div>
        </section>
      </div>

      <BibleVerseModal
        open={bibleModalOpen}
        onClose={() => setBibleModalOpen(false)}
        onSelect={handleSelectVerse}
      />
    </div>
  );
};
