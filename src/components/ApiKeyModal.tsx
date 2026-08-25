import React, { useState } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck, Info } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  savedApiKey,
  onSaveApiKey,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(savedApiKey);
  const [feedback, setFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(apiKeyInput.trim());
    setFeedback(true);
    setTimeout(() => {
      setFeedback(false);
      onClose();
    }, 800);
  };

  const handleRemove = () => {
    setApiKeyInput('');
    onSaveApiKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Key className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">
              Configuración de YouTube Data API (Opcional)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs sm:text-sm flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Nota:</strong> La herramienta funciona automáticamente extrayendo playlists públicas sin necesidad de clave API. Sin embargo, puedes proporcionar una clave de <strong>YouTube Data API v3</strong> si deseas mayor velocidad y límites oficiales de Google.
            </p>
          </div>

          <div>
            <label htmlFor="modal-api-key-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              YouTube Data API v3 Key:
            </label>
            <input
              id="modal-api-key-input"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              La clave se procesa en el servidor de forma segura para realizar la consulta.
            </p>
          </div>

          <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="font-semibold text-slate-700">¿Cómo obtener una clave gratuita?</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>Ingresa a Google Cloud Console.</li>
              <li>Habilita "YouTube Data API v3".</li>
              <li>Crea una credencial de tipo "Clave de API" (API Key).</li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-semibold mt-1"
            >
              Ir a Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            {savedApiKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mr-auto"
              >
                Eliminar clave
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-save-api-key"
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              {feedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>Guardar clave</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
