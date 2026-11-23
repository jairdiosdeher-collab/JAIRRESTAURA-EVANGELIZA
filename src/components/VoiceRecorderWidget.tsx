import React, {useEffect, useRef, useState} from 'react';
import {Mic, Play, Square, Trash2, Upload} from 'lucide-react';

interface VoiceRecorderWidgetProps {
  customVoiceDataUrl?: string;
  onChangeVoice: (dataUrl?: string, mimeType?: string) => void;
}

export const VoiceRecorderWidget: React.FC<VoiceRecorderWidgetProps> = ({
  customVoiceDataUrl,
  onChangeVoice,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Tu navegador no permite grabación directa desde micrófono. Puedes subir un archivo de audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, {mimeType});
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {type: mimeType.split(';')[0]});
        const reader = new FileReader();
        reader.onloadend = () => {
          onChangeVoice(String(reader.result), blob.type);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg('No se pudo acceder al micrófono. Revisa los permisos o sube un audio grabado.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      onChangeVoice(String(reader.result), file.type || 'audio/mpeg');
    };
    reader.readAsDataURL(file);
  };

  const togglePlay = () => {
    if (!customVoiceDataUrl) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(customVoiceDataUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-[#090B10]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Tu propia voz pastoral
          </p>
          <p className="text-xs text-stone-600 dark:text-slate-400">
            Graba tu voz o sube un audio MP3/WAV para integrarlo directamente al video MP4.
          </p>
        </div>
        {isRecording && (
          <span className="font-mono-tabular text-sm font-semibold text-red-600 dark:text-red-400">
            Grabando {formatSec(seconds)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
          >
            <Mic className="h-4 w-4" />
            Grabar voz
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <Square className="h-4 w-4" />
            Detener grabación
          </button>
        )}

        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200 dark:hover:bg-slate-800">
          <Upload className="h-4 w-4" />
          Subir audio
          <input
            type="file"
            accept="audio/*"
            onChange={handleUploadAudio}
            className="sr-only"
          />
        </label>

        {customVoiceDataUrl && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? 'Detener' : 'Escuchar'}
            </button>
            <button
              type="button"
              onClick={() => onChangeVoice(undefined, undefined)}
              aria-label="Eliminar grabación de voz"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </button>
          </>
        )}
      </div>

      {customVoiceDataUrl && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Audio de voz personal cargado y listo para mezclarse en el video MP4.
        </p>
      )}

      {errorMsg && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{errorMsg}</p>
      )}
    </div>
  );
};
