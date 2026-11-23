import React, {useState} from 'react';
import {
  Calendar,
  Check,
  Film,
  Image as ImageIcon,
  MapPin,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import {SCENE_CATALOG, SCENE_MAP} from '../data/sceneCatalog';
import {synthesizeServerSpanishVoice} from '../services/audioEngine';
import {directScriptSequence} from '../services/autoDirector';
import {createProjectFromInput} from '../services/scriptEngine';
import type {
  AspectRatio,
  EvangelisticScript,
  MinistryIdentity,
  MusicTrackId,
  SceneImageId,
  TargetAudience,
  VideoDuration,
  VideoProject,
  VideoScene,
  VoiceType,
} from '../types/evangeliza';

interface ChurchInvitationsStudioProps {
  ministryIdentity: MinistryIdentity;
  onSelectProject: (project: VideoProject) => void;
}

type InvitationEventType =
  | 'Cultos evangelísticos'
  | 'Escuelas dominicales'
  | 'Campañas'
  | 'Reuniones juveniles'
  | 'Oración'
  | 'Estudios bíblicos';

interface EventPresetInfo {
  type: InvitationEventType;
  headline: string;
  bibleRef: string;
  bibleText: string;
  defaultAudience: TargetAudience;
  defaultSceneIds: [SceneImageId, SceneImageId, SceneImageId, SceneImageId];
  defaultSchedule: string;
  inviteBody: string;
}

const EVENT_PRESETS: EventPresetInfo[] = [
  {
    type: 'Cultos evangelísticos',
    headline: 'Culto Evangelístico Especial · Hay una Palabra de Dios para ti',
    bibleRef: 'Salmos 122:1',
    bibleText: 'Yo me alegré con los que me decían: A la casa de Jehová iremos.',
    defaultAudience: 'Familias',
    defaultSceneIds: [
      'church_invitation_welcome',
      'church_worship',
      'open_bible_light',
      'restored_family',
    ],
    defaultSchedule: 'Domingos 9:00 AM y 5:00 PM · Miércoles 7:00 PM',
    inviteBody: 'Ven con tu familia y amigos a escuchar un mensaje vivo de fe, oración y salvación en Jesucristo.',
  },
  {
    type: 'Escuelas dominicales',
    headline: 'Escuela Dominical para Niños y Familias',
    bibleRef: 'Proverbios 22:6',
    bibleText: 'Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.',
    defaultAudience: 'Niños',
    defaultSceneIds: [
      'kids_jesus_children',
      'children_bible',
      'kids_good_shepherd',
      'church_invitation_welcome',
    ],
    defaultSchedule: 'Domingos 9:00 AM · Clases por edades para niños y adolescentes',
    inviteBody: 'Enseñanzas bíblicas, cantos, valores cristianos y alegría para toda la familia en la casa de Dios.',
  },
  {
    type: 'Campañas',
    headline: 'Gran Campaña Evangelística · Cristo Restaura y Salva',
    bibleRef: 'Isaías 55:6',
    bibleText: 'Buscad a Jehová mientras puede ser hallado, llamadle en tanto que está cercano.',
    defaultAudience: 'General',
    defaultSceneIds: [
      'street_evangelism',
      'church_worship',
      'salvation_grace',
      'church_invitation_welcome',
    ],
    defaultSchedule: 'Viernes y Sábado 7:00 PM · Gran cierre Domingo 5:00 PM',
    inviteBody: 'Días de predicación poderosa, oración por las familias y llamado abierto a una nueva vida en Cristo.',
  },
  {
    type: 'Reuniones juveniles',
    headline: 'Reunión Juvenil · Identidad, Propósito y Fe Real',
    bibleRef: '1 Timoteo 4:12',
    bibleText: 'Sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.',
    defaultAudience: 'Jóvenes',
    defaultSceneIds: [
      'youth_worship_light',
      'youth_fellowship',
      'teens_purpose',
      'church_invitation_welcome',
    ],
    defaultSchedule: 'Sábados 5:30 PM · Alabanza, Palabra y compañerismo juvenil',
    inviteBody: 'Un espacio fresco y bíblico donde adolescentes y jóvenes encuentran propósito, amistad sana y oración.',
  },
  {
    type: 'Oración',
    headline: 'Culto Unido de Oración e Intercesión Familiar',
    bibleRef: 'Jeremías 33:3',
    bibleText: 'Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.',
    defaultAudience: 'General',
    defaultSceneIds: [
      'praying_people',
      'open_bible_light',
      'finding_hope',
      'church_invitation_welcome',
    ],
    defaultSchedule: 'Martes y Viernes 6:30 PM · Tiempo especial de clamor y consuelo',
    inviteBody: 'Si cargas una petición por tu hogar, salud o corazón, ven a orar juntos delante del Señor.',
  },
  {
    type: 'Estudios bíblicos',
    headline: 'Estudio Bíblico Doctrinal · Creciendo en la Palabra',
    bibleRef: 'Salmos 119:105',
    bibleText: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
    defaultAudience: 'Nuevos creyentes',
    defaultSceneIds: [
      'open_bible_light',
      'jesus_teaching',
      'church_worship',
      'church_invitation_welcome',
    ],
    defaultSchedule: 'Miércoles 7:00 PM · Enseñanza expositiva verso a verso',
    inviteBody: 'Aprende las verdades fundamentales de las Escrituras en un ambiente claro, cercano y fraternal.',
  },
];

const SUGGESTED_CHURCH_SCENES: SceneImageId[] = [
  'church_invitation_welcome',
  'church_worship',
  'open_bible_light',
  'praying_people',
  'kids_jesus_children',
  'youth_worship_light',
  'restored_family',
  'street_evangelism',
];

export const ChurchInvitationsStudio: React.FC<ChurchInvitationsStudioProps> = ({
  ministryIdentity,
  onSelectProject,
}) => {
  const [eventType, setEventType] =
    useState<InvitationEventType>('Cultos evangelísticos');
  const [churchName, setChurchName] = useState(
    'Iglesia Cristiana Evangélica',
  );
  const [address, setAddress] = useState('');
  const [schedules, setSchedules] = useState(EVENT_PRESETS[0].defaultSchedule);
  const [customNote, setCustomNote] = useState(EVENT_PRESETS[0].inviteBody);
  const [contactPhone, setContactPhone] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [duration, setDuration] = useState<VideoDuration>(30);
  const [voiceType, setVoiceType] = useState<VoiceType>('masculina');
  const [musicTrackId, setMusicTrackId] =
    useState<MusicTrackId>('esperanza_ambiental');
  const [selectedSceneId, setSelectedSceneId] =
    useState<SceneImageId>('church_invitation_welcome');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [churchLogoDataUrl, setChurchLogoDataUrl] = useState<string | undefined>(
    ministryIdentity.customLogoDataUrl,
  );
  const [templateAppliedMsg, setTemplateAppliedMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const currentPreset =
    EVENT_PRESETS.find((p) => p.type === eventType) ?? EVENT_PRESETS[0];

  const handleChangeEventType = (nextType: InvitationEventType) => {
    setEventType(nextType);
    const preset = EVENT_PRESETS.find((p) => p.type === nextType);
    if (preset) {
      setSchedules(preset.defaultSchedule);
      setCustomNote(preset.inviteBody);
      setSelectedSceneId(preset.defaultSceneIds[0]);
    }
  };

  const handleApplyMmmLaGaviota = () => {
    setChurchName('Iglesia MMM La Gaviota, Ibagué');
    setAddress('Barrio La Gaviota, Ibagué, Tolima');
    setSchedules(
      'Culto Evangelístico: Domingos 9:30 AM y 6:00 PM · Oración: Martes 7:00 PM · Estudio Bíblico: Jueves 7:00 PM · Escuela Dominical y Jóvenes: Fines de semana',
    );
    setCustomNote(
      'Te esperamos con los brazos abiertos en MMM La Gaviota, Ibagué. Ven con toda tu familia a recibir Palabra de Dios, oración y esperanza en Jesucristo.',
    );
    setSelectedSceneId('church_invitation_welcome');
    setTemplateAppliedMsg(
      'Plantilla MMM LA GAVIOTA, Ibagué cargada. Puedes ajustar horarios exactos, subir fotos del templo o añadir el logotipo.',
    );
  };

  const handleUploadPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedPhotos((prev) => [...prev, reader.result as string].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setChurchLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildInvitationProject = (): VideoProject => {
    const safeChurch = churchName.trim() || 'Nuestra Iglesia Local';
    const safeAddress =
      address.trim() || 'Puertas abiertas para toda tu familia';
    const safeSchedules = schedules.trim() || currentPreset.defaultSchedule;
    const safeNote = customNote.trim() || currentPreset.inviteBody;

    const sceneData = [
      {
        imageId: selectedSceneId,
        customPhoto: uploadedPhotos[0],
        onScreen: `${safeChurch} · ${eventType}`,
        narration: `Te invitamos cordialmente a ${eventType} en ${safeChurch}.`,
      },
      {
        imageId: currentPreset.defaultSceneIds[1],
        customPhoto: uploadedPhotos[1],
        onScreen: safeNote,
        narration: safeNote,
      },
      {
        imageId: currentPreset.defaultSceneIds[2],
        customPhoto: uploadedPhotos[2],
        onScreen: `Horarios: ${safeSchedules}`,
        narration: `Nuestros horarios de reunión son: ${safeSchedules}. La Biblia nos dice en ${currentPreset.bibleRef}: ${currentPreset.bibleText}`,
        bibleRef: currentPreset.bibleRef,
      },
      {
        imageId: currentPreset.defaultSceneIds[3],
        customPhoto: uploadedPhotos[3],
        onScreen: `${safeAddress}${contactPhone.trim() ? ` · Info: ${contactPhone.trim()}` : ''}`,
        narration: `Te esperamos en ${safeAddress}. Ven con tu familia y vive un encuentro con Jesucristo.`,
      },
    ];

    const perSec = Math.max(3, Math.floor(duration / sceneData.length));
    const rem = duration - perSec * sceneData.length;

    const scenes: VideoScene[] = sceneData.map((sc, idx) => ({
      id: `inv_sc_${Date.now().toString(36)}_${idx}`,
      order: idx + 1,
      durationSec: perSec + (idx === sceneData.length - 1 ? rem : 0),
      imageId: sc.imageId,
      customImageDataUrl: sc.customPhoto,
      visualDirection: 'Invitación pastoral cálida y acogedora de la congregación.',
      onScreenText: sc.onScreen,
      narrationText: sc.narration,
      bibleRef: sc.bibleRef,
      transition: idx === 0 ? 'fade' : idx % 2 === 0 ? 'zoom' : 'slide',
    }));

    const title = `${eventType} · ${safeChurch}`;
    const rawScript: EvangelisticScript = {
      title,
      hook3s: scenes[0].narrationText,
      fullNarration: scenes.map((s) => s.narrationText).join(' '),
      bibleReference: currentPreset.bibleRef,
      bibleVerseText: currentPreset.bibleText,
      callToAction: `Te esperamos en ${safeChurch} (${safeAddress}).`,
      scenes,
    };

    const {script} = directScriptSequence(rawScript, {
      topic: title,
      productionFormat: 'invitacion_culto',
      targetDuration: duration,
      preserveCustomImages: true,
    });

    // Preserve chosen scene IDs and uploaded photos
    script.scenes = script.scenes.map((sc, idx) => ({
      ...sc,
      imageId: sceneData[idx]?.imageId ?? sc.imageId,
      customImageDataUrl: sceneData[idx]?.customPhoto,
    }));

    const projectIdentity: MinistryIdentity = {
      ...ministryIdentity,
      brandName: safeChurch.toUpperCase(),
      customLogoDataUrl: churchLogoDataUrl ?? ministryIdentity.customLogoDataUrl,
    };

    return createProjectFromInput(
      {
        topic: title,
        productionFormat: 'invitacion_culto',
        audience: currentPreset.defaultAudience,
        duration,
        aspectRatio,
        visualStyle: 'dorada_esperanza',
        voiceType,
        musicTrackId,
        customBibleRef: currentPreset.bibleRef,
        customBibleText: currentPreset.bibleText,
        customCallToAction: rawScript.callToAction,
        ministryIdentity: projectIdentity,
      },
      script,
    );
  };

  const handleProduceInvitation = async (withVoice: boolean) => {
    setStatusNotice(null);
    const project = buildInvitationProject();

    if (!withVoice) {
      onSelectProject(project);
      return;
    }

    setIsBusy(true);
    try {
      if (
        project.voiceType !== 'propia' &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        const tts = await synthesizeServerSpanishVoice(
          project.script.fullNarration,
          project.voiceType,
        );
        if (tts.audioDataUrl) {
          project.synthesizedVoiceDataUrl = tts.audioDataUrl;
        } else if (tts.notice) {
          setStatusNotice(tts.notice);
        }
      } else if (project.voiceType !== 'propia') {
        setStatusNotice(
          'Modo sin conexión: invitación lista en el editor para grabar voz o exportar con música.',
        );
      }
      onSelectProject(project);
    } finally {
      setIsBusy(false);
    }
  };

  const previewScene = SCENE_MAP[selectedSceneId] ?? SCENE_CATALOG[0];
  const heroImgSrc = uploadedPhotos[0] || previewScene.src;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Invitaciones a la Iglesia · Nombre, Dirección, Horarios, Fotos y Logo
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Estudio de Invitaciones Eclesiásticas
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-300">
            Prepara invitaciones elegantes y listas para WhatsApp o redes con los datos reales de tu congregación, fotografías propias y logotipo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleApplyMmmLaGaviota}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border-2 border-[#B47B22] bg-[#B47B22]/10 px-4 py-2 text-xs font-bold text-[#9A6B1E] transition-colors hover:bg-[#B47B22]/20 whitespace-nowrap shrink-0 dark:border-[#EAB354] dark:bg-[#EAB354]/15 dark:text-[#EAB354]"
        >
          <MapPin className="h-4 w-4" />
          Cargar plantilla: MMM LA GAVIOTA, Ibagué
        </button>
      </div>

      {templateAppliedMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{templateAppliedMsg}</span>
        </div>
      )}

      {/* 6 Invitation Event Types */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {EVENT_PRESETS.map((ev) => {
          const active = ev.type === eventType;
          return (
            <button
              key={ev.type}
              type="button"
              onClick={() => handleChangeEventType(ev.type)}
              className={`min-h-[54px] rounded-xl border p-3 text-left text-xs font-semibold transition-colors ${
                active
                  ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-800 dark:bg-[#11151E] dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {ev.type}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form: Datos reales de la iglesia */}
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#11151E]">
          <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
            1. Información de tu congregación
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inv-church-name"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Nombre de la iglesia
              </label>
              <input
                id="inv-church-name"
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Ej. Iglesia MMM La Gaviota, Ibagué"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="inv-church-address"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Dirección o punto de referencia
              </label>
              <input
                id="inv-church-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej. Barrio La Gaviota, Ibagué, Tolima"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="inv-church-schedules"
              className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              Horarios de cultos y reuniones
            </label>
            <textarea
              id="inv-church-schedules"
              rows={2}
              value={schedules}
              onChange={(e) => setSchedules(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
          </div>

          <div>
            <label
              htmlFor="inv-custom-note"
              className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
            >
              Mensaje de bienvenida
            </label>
            <textarea
              id="inv-custom-note"
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-[#FAF8F4] p-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inv-phone"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                WhatsApp o contacto pastoral (opcional)
              </label>
              <input
                id="inv-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej. Escríbenos para orar por ti"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3.5 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              />
            </div>

            <div>
              <label
                htmlFor="inv-music-select"
                className="block text-xs font-semibold text-stone-700 dark:text-slate-300"
              >
                Ambientación musical
              </label>
              <select
                id="inv-music-select"
                value={musicTrackId}
                onChange={(e) => setMusicTrackId(e.target.value as MusicTrackId)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 focus:border-[#B47B22] focus:outline-none dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              >
                <option value="esperanza_ambiental">Luz de Esperanza</option>
                <option value="adoracion_instrumental">Atmósfera de Adoración</option>
                <option value="piano_emotivo">Piano de Gracia</option>
                <option value="cinematografica">Horizonte de Fe</option>
              </select>
            </div>
          </div>

          {/* Uploads: Fotografías y Logotipo */}
          <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              2. Fotografías propias y logotipo de la iglesia (opcional)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200">
                <ImageIcon className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
                Subir fotos del templo / culto ({uploadedPhotos.length}/4)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadPhotos}
                  className="sr-only"
                />
              </label>

              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200">
                <Upload className="h-4 w-4 text-[#B47B22] dark:text-[#EAB354]" />
                {churchLogoDataUrl ? 'Cambiar logotipo' : 'Subir logotipo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="sr-only"
                />
              </label>

              {churchLogoDataUrl && (
                <button
                  type="button"
                  onClick={() => setChurchLogoDataUrl(undefined)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar logo
                </button>
              )}
            </div>

            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {uploadedPhotos.map((src, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-stone-300 dark:border-slate-700"
                  >
                    <img
                      src={src}
                      alt={`Foto iglesia ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Eliminar foto ${idx + 1}`}
                      onClick={() =>
                        setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))
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

        {/* Right Preview & Production Actions */}
        <section className="flex flex-col justify-between space-y-5 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#11151E]">
          <div className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
              <img
                src={heroImgSrc}
                alt={churchName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

              {churchLogoDataUrl && (
                <img
                  src={churchLogoDataUrl}
                  alt="Logotipo de la iglesia"
                  className="absolute top-3 right-3 h-11 w-11 rounded-lg bg-white/90 object-contain p-1"
                />
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[11px] font-semibold text-amber-300">
                  {eventType} · {currentPreset.bibleRef}
                </p>
                <p className="mt-0.5 font-display text-2xl font-bold leading-tight">
                  {churchName || 'Tu Iglesia Local'}
                </p>
                {address && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-stone-200">
                    <MapPin className="h-3 w-3 shrink-0 text-amber-300" />
                    {address}
                  </p>
                )}
                <p className="mt-1 flex items-start gap-1 text-[11px] text-stone-300">
                  <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                  <span className="line-clamp-2">{schedules}</span>
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-stone-700 dark:text-slate-300">
                Escena visual de respaldo (si no subes foto)
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {SUGGESTED_CHURCH_SCENES.map((scId) => {
                  const sc = SCENE_MAP[scId];
                  const active = selectedSceneId === scId;
                  return (
                    <button
                      key={scId}
                      type="button"
                      onClick={() => setSelectedSceneId(scId)}
                      title={sc.title}
                      className={`overflow-hidden rounded-lg border transition-all ${
                        active
                          ? 'border-[#B47B22] ring-2 ring-[#B47B22]/40 dark:border-[#EAB354]'
                          : 'border-stone-200 opacity-80 hover:opacity-100 dark:border-slate-800'
                      }`}
                    >
                      <img
                        src={sc.src}
                        alt={sc.title}
                        referrerPolicy="no-referrer"
                        className="aspect-video w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                aria-label="Formato invitación"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              >
                <option value="9:16">9:16 Vertical</option>
                <option value="1:1">1:1 Cuadrado</option>
                <option value="16:9">16:9 Horizontal</option>
              </select>

              <select
                aria-label="Duración invitación"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
                className="min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              >
                <option value={15}>15 seg</option>
                <option value={30}>30 seg</option>
                <option value={60}>60 seg</option>
              </select>

              <select
                aria-label="Voz invitación"
                value={voiceType}
                onChange={(e) => setVoiceType(e.target.value as VoiceType)}
                className="min-h-[42px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-2.5 text-xs font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
              >
                <option value="masculina">Voz masculina</option>
                <option value="femenina">Voz femenina</option>
                <option value="propia">Mi voz</option>
              </select>
            </div>

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
              onClick={() => void handleProduceInvitation(true)}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] disabled:opacity-60 dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
            >
              <Zap className="h-4 w-4" />
              {isBusy ? 'Preparando invitación con voz...' : 'Crear invitación lista con voz'}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleProduceInvitation(false)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
            >
              <Film className="h-4 w-4" />
              Abrir en editor para ajustar escenas
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
