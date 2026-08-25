import React from 'react';
import { AlertCircle, AlertTriangle, Lock, SearchX, WifiOff } from 'lucide-react';
import { ExtractErrorResponse } from '../types';

interface ErrorAlertProps {
  error: string;
  code?: ExtractErrorResponse['code'];
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, code, onDismiss }) => {
  let Icon = AlertCircle;
  let title = 'No se pudo procesar la lista de reproducción';
  let tip = '';

  if (code === 'INVALID_URL') {
    Icon = AlertTriangle;
    title = 'Enlace o URL no válida';
    tip = 'Verifica que hayas pegado un enlace que contenga "list=..." o pertenezca a youtube.com/playlist.';
  } else if (code === 'PRIVATE_PLAYLIST') {
    Icon = Lock;
    title = 'Lista de reproducción privada';
    tip = 'Esta lista está configurada como privada en YouTube. Cámbiala a "Pública" o "No listada" para poder extraer los videos.';
  } else if (code === 'NOT_FOUND') {
    Icon = SearchX;
    title = 'Lista no encontrada';
    tip = 'La lista de reproducción no existe en YouTube o fue eliminada por su creador.';
  } else if (code === 'EMPTY_PLAYLIST') {
    Icon = AlertCircle;
    title = 'Lista vacía o sin videos accesibles';
    tip = 'La lista de reproducción no contiene videos o todos sus elementos están bloqueados o eliminados.';
  } else if (code === 'NETWORK_ERROR') {
    Icon = WifiOff;
    title = 'Problema de conexión';
    tip = 'Hubo un inconveniente al comunicarse con YouTube. Intenta de nuevo en unos segundos.';
  }

  return (
    <div
      id="error-alert-container"
      role="alert"
      className="w-full bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-5 text-rose-900 shadow-xs animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-rose-950 text-sm sm:text-base leading-tight">
            {title}
          </h3>
          <p className="text-sm text-rose-800 mt-1 leading-relaxed">
            {error}
          </p>
          {tip && (
            <p className="text-xs text-rose-700 mt-2 font-medium bg-rose-100/60 rounded-md p-2 border border-rose-200/60">
              💡 <span className="font-semibold">Consejo:</span> {tip}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-100/80 transition-colors"
            title="Cerrar mensaje"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
