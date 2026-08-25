import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function to extract YouTube Playlist ID from various formats
function extractPlaylistId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleanInput = input.trim();

  // If user provided direct playlist ID (starts with PL, RD, UU, FL, LL, OLAK, etc.)
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(cleanInput) && !cleanInput.includes('http') && !cleanInput.includes('/') && !cleanInput.includes('.')) {
    return cleanInput;
  }

  try {
    let urlObj: URL;
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      urlObj = new URL(cleanInput);
    } else if (cleanInput.includes('youtube.com') || cleanInput.includes('youtu.be')) {
      urlObj = new URL(`https://${cleanInput}`);
    } else {
      const listMatch = cleanInput.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch && listMatch[1]) return listMatch[1];
      return null;
    }

    const listParam = urlObj.searchParams.get('list');
    if (listParam) {
      return listParam;
    }
  } catch {
    const match = cleanInput.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Decode HTML entities helper
function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
      String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
    );
}

// Direct YouTube Playlist extractor without requiring any API Key or Google Cloud credentials
async function extractPlaylistVideosDirect(playlistId: string) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}&hl=es`;

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NOT_FOUND: La lista de reproducción no existe en YouTube.');
    }
    throw new Error(`HTTP_ERROR: No se pudo conectar a YouTube (Código: ${response.status}).`);
  }

  const html = await response.text();

  // Validate private or not found states
  if (
    html.includes('Esta lista de reproducción es privada') ||
    html.includes('This playlist is private') ||
    html.includes('La playlist es privada')
  ) {
    throw new Error('PRIVATE_PLAYLIST: La lista de reproducción es privada. Debe ser pública o no listada para que sus videos puedan ser extraídos.');
  }

  if (
    html.includes('Esta lista de reproducción no existe') ||
    html.includes('The playlist does not exist') ||
    html.includes('Esta página no está disponible') ||
    html.includes('Video no disponible')
  ) {
    throw new Error('NOT_FOUND: La lista de reproducción no existe o el ID de la playlist es incorrecto.');
  }

  // Extract playlist title
  let playlistTitle = 'Lista de reproducción de YouTube';
  const ogTitleMatch =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/<title>([^<]+)<\/title>/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    playlistTitle = decodeHTMLEntities(ogTitleMatch[1].replace(' - YouTube', '').trim());
  }

  // Extract JSON payload (ytInitialData)
  let ytInitialData: any = null;
  const scriptRegex = /var\s+ytInitialData\s*=\s*({.+?});<\/script>/s;
  const match = html.match(scriptRegex);

  if (match && match[1]) {
    try {
      ytInitialData = JSON.parse(match[1]);
    } catch {
      const windowRegex = /window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/s;
      const match2 = html.match(windowRegex);
      if (match2 && match2[1]) {
        try {
          ytInitialData = JSON.parse(match2[1]);
        } catch (err) {
          console.warn('Failed to parse ytInitialData JSON', err);
        }
      }
    }
  }

  // Extract INNERTUBE API key and Client Version for continuation (pagination up to 100)
  let apiKeyFromPage: string | null = null;
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    apiKeyFromPage = apiKeyMatch[1];
  }

  let clientVersion = '2.20240301.00.00';
  const clientVerMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
  if (clientVerMatch && clientVerMatch[1]) {
    clientVersion = clientVerMatch[1];
  }

  const videos: Array<{ title: string; url: string; videoId: string }> = [];
  const seenVideoIds = new Set<string>();
  let continuationToken: string | null = null;

  if (ytInitialData) {
    try {
      const headerTitle =
        ytInitialData?.header?.playlistHeaderRenderer?.title?.simpleText ||
        ytInitialData?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
        ytInitialData?.metadata?.playlistMetadataRenderer?.title;
      if (headerTitle) {
        playlistTitle = decodeHTMLEntities(headerTitle);
      }

      // Traverse tabs and contents
      const tabs = ytInitialData?.contents?.twoColumnBrowseResultsRenderer?.tabs;
      const tabContent = tabs?.[0]?.tabRenderer?.content;
      const sectionList = tabContent?.sectionListRenderer?.contents;
      const itemSection = sectionList?.[0]?.itemSectionRenderer?.contents;
      const playlistVideoList = itemSection?.[0]?.playlistVideoListRenderer?.contents || [];

      for (const item of playlistVideoList) {
        if (item.playlistVideoRenderer) {
          const v = item.playlistVideoRenderer;
          const videoId = v.videoId;
          let title = '';
          if (v.title?.runs && v.title.runs.length > 0) {
            title = v.title.runs.map((r: any) => r.text).join('');
          } else if (v.title?.simpleText) {
            title = v.title.simpleText;
          }

          if (videoId && title && !seenVideoIds.has(videoId)) {
            seenVideoIds.add(videoId);
            videos.push({
              title: decodeHTMLEntities(title.trim()),
              url: `https://www.youtube.com/watch?v=${videoId}`,
              videoId,
            });
          }
        } else if (item.continuationItemRenderer) {
          continuationToken =
            item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
        }

        if (videos.length >= 100) break;
      }
    } catch (e) {
      console.warn('Error traversing ytInitialData:', e);
    }
  }

  // Handle continuation if playlist has more items and we need up to 100 videos
  if (videos.length < 100 && continuationToken && apiKeyFromPage) {
    try {
      const browseUrl = `https://www.youtube.com/youtubei/v1/browse?key=${apiKeyFromPage}&prettyPrint=false`;
      const browseRes = await fetch(browseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': headers['User-Agent'],
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': clientVersion,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion,
              hl: 'es',
              gl: 'ES',
            },
          },
          continuation: continuationToken,
        }),
      });

      if (browseRes.ok) {
        const continuationData = await browseRes.json();
        const actions = continuationData?.onResponseReceivedActions || [];
        for (const action of actions) {
          const continuationItems = action?.appendContinuationItemsAction?.continuationItems || [];
          for (const item of continuationItems) {
            if (item.playlistVideoRenderer) {
              const v = item.playlistVideoRenderer;
              const videoId = v.videoId;
              let title = '';
              if (v.title?.runs && v.title.runs.length > 0) {
                title = v.title.runs.map((r: any) => r.text).join('');
              } else if (v.title?.simpleText) {
                title = v.title.simpleText;
              }

              if (videoId && title && !seenVideoIds.has(videoId)) {
                seenVideoIds.add(videoId);
                videos.push({
                  title: decodeHTMLEntities(title.trim()),
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  videoId,
                });
              }

              if (videos.length >= 100) break;
            }
          }
          if (videos.length >= 100) break;
        }
      }
    } catch (cErr) {
      console.warn('Continuation pagination error (non-fatal):', cErr);
    }
  }

  // Regex fallback 1: playlistVideoRenderer
  if (videos.length === 0) {
    const videoRegex = /"playlistVideoRenderer":\s*\{"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
    let rMatch;
    while ((rMatch = videoRegex.exec(html)) !== null && videos.length < 100) {
      const vidId = rMatch[1];
      const vidTitle = rMatch[2];
      if (vidId && vidTitle && !seenVideoIds.has(vidId)) {
        seenVideoIds.add(vidId);
        videos.push({
          title: decodeHTMLEntities(vidTitle.trim()),
          url: `https://www.youtube.com/watch?v=${vidId}`,
          videoId: vidId,
        });
      }
    }
  }

  // Regex fallback 2: simpleText titles
  if (videos.length === 0) {
    const compactRegex = /"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"simpleText":"([^"]+)"\}/g;
    let cMatch;
    while ((cMatch = compactRegex.exec(html)) !== null && videos.length < 100) {
      const vidId = cMatch[1];
      const vidTitle = cMatch[2];
      if (vidId && vidTitle && !seenVideoIds.has(vidId)) {
        seenVideoIds.add(vidId);
        videos.push({
          title: decodeHTMLEntities(vidTitle.trim()),
          url: `https://www.youtube.com/watch?v=${vidId}`,
          videoId: vidId,
        });
      }
    }
  }

  // Regex fallback 3: compact playlist panel items
  if (videos.length === 0) {
    const panelRegex = /"playlistPanelVideoRenderer":\s*\{"title":\{"simpleText":"([^"]+)"\}.*?"videoId":"([^"]+)"/g;
    let pMatch;
    while ((pMatch = panelRegex.exec(html)) !== null && videos.length < 100) {
      const vidTitle = pMatch[1];
      const vidId = pMatch[2];
      if (vidId && vidTitle && !seenVideoIds.has(vidId)) {
        seenVideoIds.add(vidId);
        videos.push({
          title: decodeHTMLEntities(vidTitle.trim()),
          url: `https://www.youtube.com/watch?v=${vidId}`,
          videoId: vidId,
        });
      }
    }
  }

  if (videos.length === 0) {
    throw new Error('EMPTY_PLAYLIST: No se encontraron videos accesibles en esta lista de reproducción o está vacía.');
  }

  return {
    playlistTitle,
    videos: videos.slice(0, 100),
  };
}

// API Route: Extract playlist directly from URL (No API key needed)
app.post('/api/extract-playlist', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, introduce el enlace de una lista de reproducción de YouTube.',
        code: 'INVALID_URL',
      });
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo identificar una lista de reproducción válida en el enlace. Asegúrate de incluir el enlace con "list=..." (ej: https://www.youtube.com/playlist?list=PLbQgrsYtJs8k...).',
        code: 'INVALID_URL',
      });
    }

    const result = await extractPlaylistVideosDirect(playlistId);

    // Number videos strictly 1 to N (max 100)
    const indexedVideos = result.videos.map((v, i) => ({
      index: i + 1,
      title: v.title,
      url: v.url,
      videoId: v.videoId,
    }));

    return res.json({
      success: true,
      playlist: {
        id: playlistId,
        title: result.playlistTitle,
        extractedCount: indexedVideos.length,
      },
      videos: indexedVideos,
      source: 'direct',
    });
  } catch (error: any) {
    console.error('Playlist extraction error:', error);
    const msg = error?.message || 'Error al procesar la lista de reproducción.';

    let code: 'NOT_FOUND' | 'PRIVATE_PLAYLIST' | 'EMPTY_PLAYLIST' | 'NETWORK_ERROR' | 'UNKNOWN' = 'UNKNOWN';
    let userMessage = msg;

    if (msg.startsWith('NOT_FOUND:')) {
      code = 'NOT_FOUND';
      userMessage = msg.replace('NOT_FOUND:', '').trim();
    } else if (msg.startsWith('PRIVATE_PLAYLIST:')) {
      code = 'PRIVATE_PLAYLIST';
      userMessage = msg.replace('PRIVATE_PLAYLIST:', '').trim();
    } else if (msg.startsWith('EMPTY_PLAYLIST:')) {
      code = 'EMPTY_PLAYLIST';
      userMessage = msg.replace('EMPTY_PLAYLIST:', '').trim();
    } else if (msg.startsWith('HTTP_ERROR:')) {
      code = 'NETWORK_ERROR';
      userMessage = msg.replace('HTTP_ERROR:', '').trim();
    }

    return res.status(500).json({
      success: false,
      error: userMessage,
      code,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
  });
}

startServer();
