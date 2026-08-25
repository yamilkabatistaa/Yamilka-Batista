import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, ExternalLink, Search, Trash2, ListChecks, CheckCheck } from 'lucide-react';
import { ExtractedVideo, PlaylistInfo } from '../types';

interface ResultsViewProps {
  videos: ExtractedVideo[];
  playlist: PlaylistInfo;
  onClear: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  videos,
  playlist,
  onClear,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered videos for in-page search
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase();
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.url.toLowerCase().includes(q) ||
        v.index.toString() === q
    );
  }, [videos, searchQuery]);

  // Generate plain text format for copy and download
  const generatePlainText = (items: ExtractedVideo[]) => {
    return items
      .map((v) => `${v.index}. ${v.title}\n${v.url}`)
      .join('\n\n');
  };

  const handleCopyAll = async () => {
    try {
      const text = generatePlainText(videos);
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Failed to copy all items:', err);
    }
  };

  const handleDownloadTxt = () => {
    try {
      const text = generatePlainText(videos);
      const cleanTitle = (playlist.title || 'lista_de_reproduccion_youtube')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);

      const filename = `${cleanTitle}_${videos.length}_videos.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download TXT file:', err);
    }
  };

  const handleCopySingle = async (video: ExtractedVideo) => {
    try {
      const text = `${video.index}. ${video.title}\n${video.url}`;
      await navigator.clipboard.writeText(text);
      setCopiedIndex(video.index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy single item:', err);
    }
  };

  return (
    <section id="results-section" className="w-full space-y-4 animate-in fade-in duration-300">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                <ListChecks className="w-3.5 h-3.5" />
                {videos.length} {videos.length === 1 ? 'video extraído' : 'videos extraídos'}
              </span>
              {videos.length === 100 && (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Límite máximo alcanzado (100)
                </span>
              )}
            </div>
            {playlist.title && (
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 line-clamp-1">
                {playlist.title}
              </h2>
            )}
          </div>

          {/* Action Buttons: Copiar Todo & Descargar TXT */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-copy-all"
              type="button"
              onClick={handleCopyAll}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all ${
                copiedAll
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedAll ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>¡COPIADO ({videos.length})!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPIAR TODO</span>
                </>
              )}
            </button>

            <button
              id="btn-download-txt"
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs shadow-red-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>DESCARGAR TXT</span>
            </button>

            <button
              id="btn-clear-results"
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all"
              title="Nueva búsqueda"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Filter Bar if list is long */}
        {videos.length > 5 && (
          <div className="pt-4 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-filter-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por título o número..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Mostrando {filteredVideos.length} de {videos.length}
            </p>
          </div>
        )}
      </div>

      {/* Numbered Video List */}
      <div id="video-results-list" className="space-y-2.5">
        {filteredVideos.map((video) => {
          const isCopied = copiedIndex === video.index;
          return (
            <div
              key={video.videoId + '-' + video.index}
              id={`video-item-${video.index}`}
              className="group bg-white rounded-xl border border-slate-200/80 hover:border-red-200 p-3.5 sm:p-4.5 transition-all shadow-2xs hover:shadow-sm flex items-start gap-3 sm:gap-4"
            >
              {/* Number Badge (1 to 100) */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-100 group-hover:bg-red-50 text-slate-700 group-hover:text-red-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:border-red-200 transition-colors">
                {video.index}
              </div>

              {/* Video Content: Strictly EXACT TITLE and DIRECT LINK */}
              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug break-words selection:bg-red-100 select-text">
                  {video.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-all transition-colors"
                  >
                    <span>{video.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
                  </a>
                </div>
              </div>

              {/* Quick Individual Copy Button */}
              <div className="shrink-0 pt-0.5">
                <button
                  id={`btn-copy-item-${video.index}`}
                  type="button"
                  onClick={() => handleCopySingle(video)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isCopied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                  title="Copiar título y enlace"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {filteredVideos.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm font-medium">No se encontraron videos que coincidan con "{searchQuery}".</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-red-600 font-semibold hover:underline"
            >
              Restablecer filtro
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Footer for Quick Access on Long Lists */}
      {videos.length > 8 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Total extraído: <strong className="text-slate-800">{videos.length} videos</strong>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              {copiedAll ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? '¡COPIADO TODO!' : 'COPIAR TODO'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DESCARGAR TXT</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
