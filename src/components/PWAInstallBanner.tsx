import React, {useState} from 'react';
import {Download, Share, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWA';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#D4A24C] dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
        Instalar App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#D4A24C] dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Share className="h-3.5 w-3.5 text-[#B47B22] dark:text-[#EAB354]" />
          Instalar en iPhone
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#11151E]">
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="ios-install-title"
                  className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]"
                >
                  Instalar en iPhone o iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Cerrar guía"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                <li>1. Toca el botón Compartir en la barra inferior de Safari.</li>
                <li>2. Desliza hacia abajo y selecciona «Agregar a pantalla de inicio».</li>
                <li>3. Confirma tocando «Agregar» para usar el estudio incluso sin conexión.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full min-h-[44px] rounded-xl bg-[#B47B22] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
