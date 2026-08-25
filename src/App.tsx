/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PlaylistForm } from './components/PlaylistForm';
import { ResultsView } from './components/ResultsView';
import { ErrorAlert } from './components/ErrorAlert';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExtractedVideo, PlaylistInfo, ExtractResponse, ExtractErrorResponse } from './types';
import { ListVideo, CheckCircle2, Shield, Zap, FileText } from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ExtractErrorResponse['code'] | undefined>(undefined);
  
  const [videos, setVideos] = useState<ExtractedVideo[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');

  // Load custom API key from localStorage if available
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('yt_custom_api_key');
      if (savedKey) {
        setCustomApiKey(savedKey);
      }
    } catch (e) {
      console.warn('localStorage is not accessible:', e);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    try {
      if (key) {
        localStorage.setItem('yt_custom_api_key', key);
      } else {
        localStorage.removeItem('yt_custom_api_key');
      }
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    setErrorCode(undefined);
    setVideos([]);
    setPlaylist(null);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(undefined);
    setVideos([]);
    setPlaylist(null);

    try {
      const response = await fetch('/api/extract-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          apiKey: customApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Ocurrió un error al intentar extraer los videos de la playlist.');
        setErrorCode(data.code || 'UNKNOWN');
        return;
      }

      const resData = data as ExtractResponse;
      setVideos(resData.videos);
      setPlaylist(resData.playlist);

      // Smooth scroll to results on mobile/desktop
      setTimeout(() => {
        const resultsEl = document.getElementById('results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Network or fetch error:', err);
      setError('No se pudo establecer conexión con el servidor. Por favor, verifica tu conexión e inténtalo nuevamente.');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasCustomKey={Boolean(customApiKey)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Intro Hero Box (Compact & Informative) */}
        <div className="text-center max-w-2xl mx-auto space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 fill-red-600" />
            <span>Extracción rápida y directa de hasta 100 videos</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Extrae títulos y enlaces de cualquier Playlist
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Pega la URL de una lista de reproducción de YouTube pública o no listada para obtener instantáneamente la lista limpia con el título y enlace exacto de cada video.
          </p>
        </div>

        {/* Input Form */}
        <PlaylistForm
          url={url}
          setUrl={setUrl}
          onSubmit={handleExtract}
          isLoading={isLoading}
          onClear={handleClear}
        />

        {/* Error Alert */}
        {error && (
          <ErrorAlert
            error={error}
            code={errorCode}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Results Section */}
        {videos.length > 0 && playlist && (
          <ResultsView
            videos={videos}
            playlist={playlist}
            onClear={handleClear}
          />
        )}

        {/* Informational Guidance Cards when no results yet */}
        {!isLoading && videos.length === 0 && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs mb-3 border border-red-100">
                1
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Pega el enlace
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Copia la URL de cualquier lista de reproducción pública desde YouTube y pégala en el campo de arriba.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs mb-3 border border-red-100">
                2
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Extracción limpia
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Se extraen hasta 100 videos mostrando exclusivamente el título exacto y su enlace directo sin distracciones.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs mb-3 border border-red-100">
                3
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">
                Copia o Descarga TXT
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Copia todos los datos con un solo clic al portapapeles o genera un archivo .txt formateado al instante.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Extractor de Listas de Reproducción de YouTube — Herramienta de productividad.
          </p>
          <p className="text-slate-400 text-[11px]">
            Límite por extracción: 100 videos • Formato puro de texto y enlaces
          </p>
        </div>
      </footer>

      {/* Optional API Key Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        savedApiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
