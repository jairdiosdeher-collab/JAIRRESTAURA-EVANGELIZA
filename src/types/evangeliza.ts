export type AspectRatio = '9:16' | '1:1' | '16:9';

export type VideoDuration = 15 | 30 | 60 | 90 | 180;

export type ProductionFormat =
  | 'microvideo_15s'
  | 'evangelistico_30_60'
  | 'predicacion_3min'
  | 'testimonio'
  | 'invitacion_culto'
  | 'infantil'
  | 'adolescentes'
  | 'matrimonios'
  | 'campana_evangelistica';

export type VisualStyle =
  | 'dorada_esperanza'
  | 'solemne_calvario'
  | 'amanecer_gloria'
  | 'nocturno_contemplativo'
  | 'luz_hogar';

export type VoiceType = 'masculina' | 'femenina' | 'propia';

export type MusicTrackId =
  | 'piano_emotivo'
  | 'adoracion_instrumental'
  | 'cinematografica'
  | 'esperanza_ambiental'
  | 'solemne_cruz'
  | 'sin_musica';

export type SceneTransition = 'fade' | 'slide' | 'zoom' | 'cut';

export type CameraMotion =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'ken_burns_up';

export type TargetAudience =
  | 'General'
  | 'Jóvenes'
  | 'Adolescentes'
  | 'Niños'
  | 'Familias'
  | 'Matrimonios'
  | 'Personas con ansiedad'
  | 'Nuevos creyentes';

export type SceneCategory =
  | 'Vida de Jesús'
  | 'Milagros de Jesús'
  | 'Parábolas'
  | 'Crucifixión'
  | 'Resurrección'
  | 'Salvación'
  | 'Oración'
  | 'Familia'
  | 'Niños'
  | 'Adolescentes'
  | 'Jóvenes'
  | 'Matrimonios'
  | 'Evangelismo callejero'
  | 'Iglesia y adoración';

export type SceneImageId =
  | 'biblical_landscape'
  | 'jesus_teaching'
  | 'miracles_of_jesus'
  | 'parable_sower'
  | 'praying_people'
  | 'restored_family'
  | 'calvary_cross'
  | 'empty_tomb'
  | 'salvation_grace'
  | 'finding_hope'
  | 'inspiring_sunrise'
  | 'children_bible'
  | 'kids_good_shepherd'
  | 'kids_jesus_children'
  | 'teens_purpose'
  | 'youth_fellowship'
  | 'youth_worship_light'
  | 'christian_marriage'
  | 'street_evangelism'
  | 'church_worship'
  | 'church_invitation_welcome'
  | 'open_bible_light'
  | 'testimony_freedom';

export type BiblicalCategory =
  | 'Evangelios'
  | 'Milagros'
  | 'Parábolas'
  | 'Enseñanzas'
  | 'Promesas'
  | 'Salvación'
  | 'Fe'
  | 'Perdón'
  | 'Oración'
  | 'Vida cristiana';

export interface SceneAsset {
  id: SceneImageId;
  title: string;
  category: SceneCategory;
  description: string;
  src: string;
  fallbackGradient: string;
  tags: string[];
}

export interface VideoScene {
  id: string;
  order: number;
  durationSec: number;
  imageId: SceneImageId;
  customImageDataUrl?: string;
  visualDirection: string;
  onScreenText: string;
  narrationText: string;
  bibleRef?: string;
  transition: SceneTransition;
  cameraMotion?: CameraMotion;
}

export interface EvangelisticScript {
  title: string;
  hook3s: string;
  fullNarration: string;
  bibleReference: string;
  bibleVerseText: string;
  callToAction: string;
  scenes: VideoScene[];
}

export interface MinistryIdentity {
  enabled: boolean;
  brandName: string;
  authorLine: string;
  motto: string;
  customLogoDataUrl?: string;
}

export interface VideoProject {
  id: string;
  title: string;
  topic: string;
  productionFormat?: ProductionFormat;
  audience: TargetAudience;
  targetDuration: VideoDuration;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  voiceType: VoiceType;
  musicTrackId: MusicTrackId;
  musicVolume: number; // 0 to 100
  narrationVolume: number; // 0 to 100
  showSubtitles: boolean;
  showLogo: boolean;
  ministryIdentity: MinistryIdentity;
  customVoiceDataUrl?: string;
  customVoiceMimeType?: string;
  synthesizedVoiceDataUrl?: string;
  script: EvangelisticScript;
  createdAt: string;
  updatedAt: string;
  sourceSermonId?: string;
  campaignId?: string;
  campaignDay?: number;
}

export interface PreparedSermon {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  bibleReference: string;
  bibleText: string;
  introduction: string;
  development: string;
  reflection: string;
  callToChrist: string;
  defaultImageId: SceneImageId;
  secondaryImageId: SceneImageId;
  tertiaryImageId?: SceneImageId;
  quaternaryImageId?: SceneImageId;
  defaultMusicId: MusicTrackId;
  suggestedDuration: VideoDuration;
}

export interface CampaignEpisode {
  day: number;
  title: string;
  topic: string;
  bibleRef: string;
  bibleText: string;
  summary: string;
  callToAction: string;
  imageId: SceneImageId;
}

export interface CampaignSeries {
  id: string;
  title: string;
  description: string;
  daysCount: number;
  audience: TargetAudience;
  aspectRatio: AspectRatio;
  visualStyle?: VisualStyle;
  continuityNote?: string;
  defaultMusicId: MusicTrackId;
  episodes: CampaignEpisode[];
}

export interface BibleVerseEntry {
  id: string;
  reference: string;
  text: string;
  theme: string;
  category: BiblicalCategory;
  recommendedImageId: SceneImageId;
}

export type AppSection =
  | 'estudio'
  | 'predicaciones'
  | 'campanas'
  | 'ninos'
  | 'jovenes'
  | 'invitaciones'
  | 'testimonios'
  | 'biblia'
  | 'editor'
  | 'proyectos';
