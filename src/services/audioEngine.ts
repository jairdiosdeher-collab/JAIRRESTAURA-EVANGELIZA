import type {MusicTrackId, VoiceType} from '../types/evangeliza';

export interface MusicTrackMeta {
  id: MusicTrackId;
  name: string;
  description: string;
  mood: string;
  bpm: number;
}

export const MUSIC_LIBRARY: MusicTrackMeta[] = [
  {
    id: 'piano_emotivo',
    name: 'Piano emotivo',
    description: 'Arpegios cálidos de piano suave en Do mayor con resonancia pastoral.',
    mood: 'Íntimo y cercano',
    bpm: 64,
  },
  {
    id: 'adoracion_instrumental',
    name: 'Música de adoración instrumental',
    description: 'Pad atmosférico envolvente con campanas suaves en Sol mayor.',
    mood: 'Reverente y celestial',
    bpm: 60,
  },
  {
    id: 'cinematografica',
    name: 'Música cinematográfica',
    description: 'Cuerdas profundas y crescendo inspirador para testimonios y llamados.',
    mood: 'Épico y conmovedor',
    bpm: 72,
  },
  {
    id: 'esperanza_ambiental',
    name: 'Ambientación de esperanza',
    description: 'Textura acústica luminosa con pulsos delicados de amanecer.',
    mood: 'Luminoso y sereno',
    bpm: 68,
  },
  {
    id: 'solemne_cruz',
    name: 'Música solemne para reflexiones sobre la cruz',
    description: 'Acordes menores pausados de órgano y piano para reflexión profunda.',
    mood: 'Solemne y reflexivo',
    bpm: 54,
  },
  {
    id: 'sin_musica',
    name: 'Sin música de fondo',
    description: 'Solo narración o silencio contemplativo.',
    mood: 'Silencio',
    bpm: 0,
  },
];

const TRACK_PROGRESSIONS: Record<Exclude<MusicTrackId, 'sin_musica'>, number[][]> = {
  piano_emotivo: [
    [261.63, 329.63, 392.0, 523.25],
    [196.0, 246.94, 293.66, 392.0],
    [220.0, 261.63, 329.63, 440.0],
    [174.61, 220.0, 261.63, 349.23],
  ],
  adoracion_instrumental: [
    [196.0, 246.94, 293.66, 392.0],
    [146.83, 220.0, 293.66, 369.99],
    [164.81, 246.94, 329.63, 392.0],
    [130.81, 196.0, 261.63, 329.63],
  ],
  cinematografica: [
    [146.83, 220.0, 293.66, 349.23],
    [116.54, 174.61, 233.08, 293.66],
    [174.61, 261.63, 349.23, 440.0],
    [130.81, 196.0, 261.63, 329.63],
  ],
  esperanza_ambiental: [
    [155.56, 233.08, 311.13, 392.0],
    [116.54, 174.61, 233.08, 293.66],
    [130.81, 196.0, 261.63, 311.13],
    [103.83, 155.56, 207.65, 261.63],
  ],
  solemne_cruz: [
    [164.81, 246.94, 329.63, 392.0],
    [130.81, 196.0, 261.63, 329.63],
    [110.0, 164.81, 220.0, 261.63],
    [123.47, 185.0, 246.94, 311.13],
  ],
};

function scheduleInstrumentalNotes(
  ctx: BaseAudioContext,
  destination: AudioNode,
  trackId: Exclude<MusicTrackId, 'sin_musica'>,
  durationSec: number,
  volumeGain: number,
) {
  const chords = TRACK_PROGRESSIONS[trackId];
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.linearRampToValueAtTime(volumeGain * 0.45, Math.min(1.5, durationSec * 0.15));
  if (durationSec > 2.5) {
    master.gain.setValueAtTime(volumeGain * 0.45, durationSec - 2.0);
  }
  master.gain.linearRampToValueAtTime(0.0001, durationSec);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value =
    trackId === 'solemne_cruz' ? 1100 : trackId === 'cinematografica' ? 1850 : 1550;
  filter.Q.value = 0.7;

  master.connect(filter);
  filter.connect(destination);

  const chordDur = trackId === 'solemne_cruz' ? 4.0 : trackId === 'cinematografica' ? 3.0 : 3.5;
  const totalChords = Math.ceil(durationSec / chordDur);

  for (let c = 0; c < totalChords; c++) {
    const start = c * chordDur;
    if (start >= durationSec) break;
    const chord = chords[c % chords.length];

    chord.slice(0, 3).forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const padGain = ctx.createGain();
      osc.type = trackId === 'cinematografica' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? freq * 0.5 : freq, start);

      padGain.gain.setValueAtTime(0.0001, start);
      padGain.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.09, start + 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, Math.min(durationSec, start + chordDur + 0.4));

      osc.connect(padGain);
      padGain.connect(master);
      osc.start(start);
      osc.stop(Math.min(durationSec, start + chordDur + 0.5));
    });

    const steps = trackId === 'piano_emotivo' ? 4 : trackId === 'esperanza_ambiental' ? 4 : 3;
    const stepTime = chordDur / steps;
    for (let s = 0; s < steps; s++) {
      const noteStart = start + s * stepTime;
      if (noteStart >= durationSec - 0.1) break;
      const freq = chord[(s + c) % chord.length] * (s === steps - 1 ? 2 : 1);
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, noteStart);

      const overGain = ctx.createGain();
      overGain.gain.value = 0.18;

      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.24, noteStart + 0.035);
      noteGain.gain.exponentialRampToValueAtTime(
        0.0008,
        Math.min(durationSec, noteStart + stepTime * 1.4),
      );

      osc.connect(noteGain);
      overtone.connect(overGain);
      overGain.connect(noteGain);
      noteGain.connect(master);

      osc.start(noteStart);
      overtone.start(noteStart);
      const stopAt = Math.min(durationSec, noteStart + stepTime * 1.5);
      osc.stop(stopAt);
      overtone.stop(stopAt);
    }
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Uint8Array {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Uint8Array(arrayBuffer);
}

export async function renderProjectMixAudioBuffer(options: {
  musicTrackId: MusicTrackId;
  musicVolume: number;
  narrationVolume: number;
  durationSec: number;
  voiceAudioDataUrl?: string;
}): Promise<{buffer: AudioBuffer; hasVoice: boolean}> {
  const sampleRate = 44100;
  const totalSamples = Math.max(sampleRate, Math.round(options.durationSec * sampleRate));
  const offline = new OfflineAudioContext(2, totalSamples, sampleRate);

  let hasVoice = false;

  if (options.voiceAudioDataUrl && options.narrationVolume > 0) {
    try {
      const resp = await fetch(options.voiceAudioDataUrl);
      const arrBuf = await resp.arrayBuffer();
      const decoded = await offline.decodeAudioData(arrBuf);
      let peak = 0;
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        for (let i = 0; i < data.length; i += 4) {
          const abs = Math.abs(data[i]);
          if (abs > peak) peak = abs;
        }
      }
      const normBoost = peak > 0.01 && peak < 0.48 ? Math.min(3.0, 0.72 / peak) : 1.0;
      const voiceSrc = offline.createBufferSource();
      voiceSrc.buffer = decoded;
      const voiceGain = offline.createGain();
      voiceGain.gain.value = Math.min(3.2, (options.narrationVolume / 100) * 1.15 * normBoost);
      voiceSrc.connect(voiceGain);
      voiceGain.connect(offline.destination);
      voiceSrc.start(0);
      hasVoice = true;
    } catch {
      hasVoice = false;
    }
  }

  // Gentle music ducking when spoken voice is present
  const effectiveMusicVol = hasVoice
    ? Math.min(options.musicVolume, 45) * 0.72
    : options.musicVolume;

  if (options.musicTrackId !== 'sin_musica' && effectiveMusicVol > 0) {
    scheduleInstrumentalNotes(
      offline,
      offline.destination,
      options.musicTrackId,
      options.durationSec,
      effectiveMusicVol / 100,
    );
  }

  const rendered = await offline.startRendering();
  return {buffer: rendered, hasVoice};
}

export async function renderProjectMixWav(options: {
  musicTrackId: MusicTrackId;
  musicVolume: number;
  narrationVolume: number;
  durationSec: number;
  voiceAudioDataUrl?: string;
}): Promise<{wavBytes: Uint8Array; hasVoice: boolean}> {
  const {buffer, hasVoice} = await renderProjectMixAudioBuffer(options);
  return {
    wavBytes: encodeWavFromAudioBuffer(buffer),
    hasVoice,
  };
}

export async function synthesizeServerSpanishVoice(
  text: string,
  voiceType: Exclude<VoiceType, 'propia'>,
): Promise<{audioDataUrl?: string; notice?: string}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      notice:
        'Sin conexión: se usará la voz del navegador en vista previa o tu propia voz grabada en el MP4.',
    };
  }

  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, voiceType}),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {error?: string};
      return {
        notice:
          err.error ||
          'El sintetizador de voz en línea no estuvo disponible; puedes grabar tu voz localmente.',
      };
    }

    const data = (await res.json()) as {audioDataUrl?: string};
    if (!data.audioDataUrl) {
      return {notice: 'No se recibió audio de narración.'};
    }
    return {audioDataUrl: data.audioDataUrl};
  } catch {
    return {
      notice: 'No se pudo conectar con el servicio de voz en línea.',
    };
  }
}

export class LiveAudioController {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private voiceAudio: HTMLAudioElement | null = null;

  async startMusic(trackId: MusicTrackId, volumePct: number, durationSec = 24): Promise<void> {
    this.stopMusic();
    if (trackId === 'sin_musica' || volumePct <= 0) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isPlaying = true;
    scheduleInstrumentalNotes(this.ctx, this.ctx.destination, trackId, durationSec, volumePct / 100);
  }

  playVoiceAudio(dataUrl: string, volumePct: number): void {
    this.stopVoiceAudio();
    this.voiceAudio = new Audio(dataUrl);
    this.voiceAudio.volume = Math.max(0, Math.min(1, volumePct / 100));
    void this.voiceAudio.play().catch(() => {});
  }

  stopVoiceAudio(): void {
    if (this.voiceAudio) {
      this.voiceAudio.pause();
      this.voiceAudio.currentTime = 0;
      this.voiceAudio = null;
    }
  }

  stopMusic(): void {
    this.isPlaying = false;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  stopAll(): void {
    this.stopMusic();
    this.stopVoiceAudio();
    stopSpanishSpeech();
  }

  get active(): boolean {
    return this.isPlaying;
  }
}

export function speakSpanishSpeech(text: string, voiceType: VoiceType, volumePct: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (voiceType === 'propia' || !text.trim()) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.volume = Math.max(0, Math.min(1, volumePct / 100));
  utterance.rate = 0.88;
  utterance.pitch = voiceType === 'masculina' ? 0.9 : 1.08;

  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('es'));
  if (voices.length > 0) {
    const maleHints = ['pablo', 'jorge', 'diego', 'carlos', 'raul', 'miguel', 'alonso', 'male'];
    const femaleHints = ['monica', 'paulina', 'sabina', 'helena', 'lucia', 'sofia', 'laura', 'female'];
    const hints = voiceType === 'masculina' ? maleHints : femaleHints;
    const matched = voices.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));
    utterance.voice = matched ?? voices[0];
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpanishSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
