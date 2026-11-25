import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  ArrowRight,
  Mic,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface VoiceRecorderWidgetProps {
  customVoiceDataUrl?: string;
  onChangeVoice: (dataUrl?: string, mimeType?: string) => void;
  onContinue?: () => void;
  showContinueButton?: boolean;
}

export const VoiceRecorderWidget: React.FC<VoiceRecorderWidgetProps> = ({
  customVoiceDataUrl,
  onChangeVoice,
  onContinue,
  showContinueButton = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const discardNextStopRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore already stopped track
        }
      });
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      discardNextStopRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
      }
      stopAllTracks();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stopAllTracks]);

  const startRecording = async () => {
    setErrorMsg(null);
    setPermissionBlocked(false);

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        'Este navegador no permite grabar directo con el micrófono. Puedes subir un archivo de audio o elegir una voz narrada.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;

      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm';

      const recorder = new MediaRecorder(stream, {mimeType});
      chunksRef.current = [];
      discardNextStopRef.current = false;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stopAllTracks();
        if (discardNextStopRef.current) {
          chunksRef.current = [];
          return;
        }
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
    } catch (err) {
      stopAllTracks();
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setPermissionBlocked(true);
        setErrorMsg(
          'El permiso del micrófono está bloqueado en tu navegador.',
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMsg(
          'No encontramos ningún micrófono conectado en este dispositivo. Puedes conectar uno o subir un audio ya grabado.',
        );
      } else {
        setErrorMsg(
          'No fue posible iniciar la grabación. Revisa que tu micrófono esté disponible o elige una voz narrada.',
        );
      }
    }
  };

  const stopRecording = () => {
    discardNextStopRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopAllTracks();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    discardNextStopRef.current = true;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopAllTracks();
    }
    setIsRecording(false);
    setSeconds(0);
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setPermissionBlocked(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      onChangeVoice(String(reader.result), file.type || 'audio/mpeg');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-[#FAF8F4] p-5 dark:border-slate-800 dark:bg-[#090B10]">
      <div className="space-y-1">
        <p className="text-base font-bold text-stone-900 dark:text-[#F4F1EA]">
          Graba tu propia voz
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-slate-300">
          Utilizaremos tu micrófono para grabar la narración de este video. Tu grabación permanece en este dispositivo y no se envía a servicios externos.
        </p>
      </div>

      {/* Live Recording Indicator */}
      {isRecording && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/35"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600">
              <span className="h-2 w-2 animate-ping rounded-full bg-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">
                Grabando tu narración
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                Habla cerca del micrófono con voz clara y serena.
              </p>
            </div>
          </div>
          <span className="font-mono-tabular text-lg font-bold text-red-800 dark:text-red-200">
            {formatSec(seconds)}
          </span>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
          >
            {customVoiceDataUrl ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Volver a grabar
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Grabar mi voz
              </>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Detener
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </>
        )}

        {!isRecording && customVoiceDataUrl && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-100 dark:hover:bg-slate-800"
            >
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Detener audio' : 'Escuchar'}
            </button>

            <button
              type="button"
              onClick={() => onChangeVoice(undefined, undefined)}
              aria-label="Eliminar grabación de voz"
              className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </button>

            {showContinueButton && onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}

        {!isRecording && (
          <label className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#171C28] dark:text-stone-200 dark:hover:bg-slate-800">
            <Upload className="h-4 w-4" />
            Subir un audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleUploadAudio}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {customVoiceDataUrl && !isRecording && (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Tu voz quedó grabada y lista. Puedes escucharla o continuar al siguiente paso.
        </p>
      )}

      {errorMsg && (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2.5 font-semibold">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {permissionBlocked && (
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <li>Toca el icono del candado o de ajustes que aparece junto a la dirección web arriba en tu navegador.</li>
              <li>Busca la opción «Micrófono» y cámbiala a «Permitir».</li>
              <li>Recarga o vuelve a pulsar «Grabar mi voz». Si prefieres, también puedes continuar eligiendo voz masculina, voz femenina o sin narración.</li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
};
