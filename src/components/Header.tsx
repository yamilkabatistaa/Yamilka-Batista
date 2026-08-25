import React from 'react';
import { ListVideo, Key, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  hasCustomKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasCustomKey }) => {
  return (
    <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
            <ListVideo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Extractor de Listas de Reproducción de YouTube
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                Máx. 100 videos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
              Extrae exclusivamente el título y enlace directo de cada video al instante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              id="btn-settings-api-key"
              onClick={onOpenSettings}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                hasCustomKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title="Configurar clave API opcional"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden md:inline">API Key</span>
              {hasCustomKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
