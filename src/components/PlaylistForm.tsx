import React, { useState } from 'react';
import { Search, Clipboard, X, Play, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface PlaylistFormProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onClear: () => void;
}

export const PlaylistForm: React.FC<PlaylistFormProps> = ({
  url,
  setUrl,
  onSubmit,
  isLoading,
  onClear,
}) => {
  const [pasteFeedback, setPasteFeedback] = useState(false);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          setPasteFeedback(true);
          setTimeout(() => setPasteFeedback(false), 1500);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed or permission denied:', err);
    }
  };

  const loadSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 transition-all">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="playlist-url-input"
            className="block text-sm font-semibold text-slate-800 mb-2"
          >
            URL de la Lista de Reproducción de YouTube:
          </label>

          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>

            <input
              id="playlist-url-input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=PL..."
              disabled={isLoading}
              className="w-full pl-11 pr-24 sm:pr-28 py-3.5 sm:py-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              autoComplete="off"
              spellCheck="false"
            />

            <div className="absolute right-2.5 flex items-center gap-1">
              {url && !isLoading && (
                <button
                  id="btn-clear-url"
                  type="button"
                  onClick={onClear}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Limpiar campo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                id="btn-paste-url"
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-50"
                title="Pegar desde el portapapeles"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>{pasteFeedback ? '¡Pegado!' : 'Pegar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="font-medium text-slate-700">Formatos aceptados:</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
              youtube.com/playlist?list=...
            </span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
              watch?v=...&list=...
            </span>
          </div>

          <button
            id="btn-extract-videos"
            type="submit"
            disabled={isLoading || !url.trim()}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/30 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>EXTRAYENDO VIDEOS...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>EXTRAER VIDEOS</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Links */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400">Probar con ejemplos:</span>
            <button
              type="button"
              onClick={() => loadSample('https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj')}
              className="text-red-600 hover:text-red-700 font-medium underline underline-offset-2 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
            >
              Pop Music Hits
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => loadSample('https://www.youtube.com/playlist?list=PLlVlyGVtvuVnj_SjW1_5Xkuhj4G_D1R7q')}
              className="text-red-600 hover:text-red-700 font-medium underline underline-offset-2 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
            >
              Documentales de Ciencia
            </button>
          </div>
          <span className="text-slate-400 font-medium">Límite: 100 videos</span>
        </div>
      </form>
    </div>
  );
};
