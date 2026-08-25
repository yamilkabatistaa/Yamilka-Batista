import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function to extract YouTube Playlist ID from various formats
function extractPlaylistId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleanInput = input.trim();

  // If user provided direct playlist ID (usually starts with PL, RD, UU, FL, LL, OLAK, etc.)
  if (/^[a-zA-Z0-9_-]{10,60}$/.test(cleanInput) && !cleanInput.includes('http') && !cleanInput.includes('/')) {
    return cleanInput;
  }

  try {
    // Check if it's a URL
    let urlObj: URL;
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      urlObj = new URL(cleanInput);
    } else if (cleanInput.includes('youtube.com') || cleanInput.includes('youtu.be')) {
      urlObj = new URL(`https://${cleanInput}`);
    } else {
      // Try regex search for list parameter
      const listMatch = cleanInput.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch && listMatch[1]) return listMatch[1];
      return null;
    }

    const listParam = urlObj.searchParams.get('list');
    if (listParam) {
      return listParam;
    }
  } catch (err) {
    // Regex fallback
    const match = cleanInput.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Fetch playlist via official YouTube Data API v3
async function fetchViaYouTubeAPI(playlistId: string, apiKey: string) {
  let videos: Array<{ title: string; url: string; videoId: string }> = [];
  let playlistTitle = 'Lista de reproducción';
  let nextPageToken: string | undefined = undefined;

  // First, get playlist title
  try {
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    );
    if (plRes.ok) {
      const plData = await plRes.json();
      if (plData.items && plData.items.length > 0) {
        playlistTitle = plData.items[0]?.snippet?.title || playlistTitle;
      }
    }
  } catch (e) {
    console.warn('Could not fetch playlist snippet metadata:', e);
  }

  // Fetch playlist items (up to 100 max: 2 pages of 50)
  for (let page = 0; page < 2; page++) {
    const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}${pageParam}`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const reason = errorData?.error?.errors?.[0]?.reason || errorData?.error?.message || `HTTP ${res.status}`;
      
      if (res.status === 404 || reason.includes('playlistNotFound')) {
        throw new Error('NOT_FOUND: La lista de reproducción no existe o no se encontró.');
      } else if (res.status === 403 || reason.includes('quotaExceeded') || reason.includes('forbidden')) {
        throw new Error(`API_FORBIDDEN: ${reason}`);
      }
      throw new Error(`API_ERROR: ${reason}`);
    }

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      const title = snippet?.title;

      // Skip private or deleted placeholders if empty/inaccessible, or keep exact title
      if (videoId && title && title !== 'Private video' && title !== 'Deleted video') {
        videos.push({
          title: title.trim(),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId
        });
      } else if (videoId && title) {
        videos.push({
          title: title.trim(),
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId: videoId
        });
      }

      if (videos.length >= 100) break;
    }

    nextPageToken = data.nextPageToken;
    if (!nextPageToken || videos.length >= 100) {
      break;
    }
  }

  return {
    playlistTitle,
    videos: videos.slice(0, 100)
  };
}

// Scraper fallback when no API key is provided or quota exceeded
async function fetchViaWebScraper(playlistId: string) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}&hl=es`;
  
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('NOT_FOUND: La lista de reproducción no existe en YouTube.');
    }
    throw new Error(`HTTP_ERROR: No se pudo conectar a YouTube (Código: ${response.status}).`);
  }

  const html = await response.text();

  // Check common indicators
  if (html.includes('Esta lista de reproducción es privada') || html.includes('This playlist is private')) {
    throw new Error('PRIVATE_PLAYLIST: La lista de reproducción es privada. Debe ser pública o no listada para extraer sus videos.');
  }

  if (html.includes('Esta lista de reproducción no existe') || html.includes('The playlist does not exist') || html.includes('Esta página no está disponible')) {
    throw new Error('NOT_FOUND: La lista de reproducción no existe o fue eliminada.');
  }

  // Extract ytInitialData
  let ytInitialData: any = null;
  const scriptRegex = /var\s+ytInitialData\s*=\s*({.+?});<\/script>/s;
  const match = html.match(scriptRegex);

  if (match && match[1]) {
    try {
      ytInitialData = JSON.parse(match[1]);
    } catch (e) {
      // Try secondary pattern
      const windowRegex = /window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/s;
      const match2 = html.match(windowRegex);
      if (match2 && match2[1]) {
        try {
          ytInitialData = JSON.parse(match2[1]);
        } catch (err) {
          console.error('Failed to parse window.ytInitialData', err);
        }
      }
    }
  }

  // Also try extracting INNERTUBE API key and continuation token for loading up to 100 videos
  let apiKeyFromPage: string | null = null;
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    apiKeyFromPage = apiKeyMatch[1];
  }

  let playlistTitle = 'Lista de reproducción';
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    playlistTitle = ogTitleMatch[1].replace(' - YouTube', '').trim();
  }

  const videos: Array<{ title: string; url: string; videoId: string }> = [];
  let continuationToken: string | null = null;

  if (ytInitialData) {
    try {
      // Extract title from ytInitialData if available
      const headerTitle = ytInitialData?.header?.playlistHeaderRenderer?.title?.simpleText ||
        ytInitialData?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
        ytInitialData?.metadata?.playlistMetadataRenderer?.title;
      if (headerTitle) {
        playlistTitle = headerTitle;
      }

      // Find playlist video contents
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

          if (videoId && title) {
            videos.push({
              title: title.trim(),
              url: `https://www.youtube.com/watch?v=${videoId}`,
              videoId: videoId
            });
          }
        } else if (item.continuationItemRenderer) {
          continuationToken = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
        }

        if (videos.length >= 100) break;
      }
    } catch (err) {
      console.warn('Error traversing ytInitialData structure:', err);
    }
  }

  // If we found fewer than 100 videos and have a continuation token + API key from page, fetch continuation!
  if (videos.length > 0 && videos.length < 100 && continuationToken && apiKeyFromPage) {
    try {
      const browseUrl = `https://www.youtube.com/youtubei/v1/browse?key=${apiKeyFromPage}&prettyPrint=false`;
      const browseRes = await fetch(browseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': headers['User-Agent'],
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20240301.00.00',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240301.00.00',
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

              if (videoId && title) {
                videos.push({
                  title: title.trim(),
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  videoId: videoId,
                });
              }

              if (videos.length >= 100) break;
            }
          }
          if (videos.length >= 100) break;
        }
      }
    } catch (contErr) {
      console.warn('Continuation fetch encountered non-fatal error:', contErr);
    }
  }

  // Fallback regex if ytInitialData parsing failed to yield videos
  if (videos.length === 0) {
    const videoRegex = /"playlistVideoRenderer":\s*\{"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
    let rMatch;
    const seenIds = new Set<string>();

    while ((rMatch = videoRegex.exec(html)) !== null && videos.length < 100) {
      const vidId = rMatch[1];
      const vidTitle = rMatch[2];
      if (vidId && vidTitle && !seenIds.has(vidId)) {
        seenIds.add(vidId);
        videos.push({
          title: vidTitle.replace(/\\u[\dA-F]{4}/gi, (match) =>
            String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
          ).trim(),
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

// API Route for extracting YouTube playlist videos
app.post('/api/extract-playlist', async (req, res) => {
  try {
    const { url, apiKey: userApiKey } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, ingresa una URL válida de una lista de reproducción de YouTube.',
        code: 'INVALID_URL',
      });
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo identificar un ID de lista de reproducción válido en el enlace proporcionado. Asegúrate de que contenga "list=..." o sea una URL de playlist de YouTube.',
        code: 'INVALID_URL',
      });
    }

    // Determine if we should use Google YouTube API Key
    const apiKey = (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
                   process.env.YOUTUBE_API_KEY ||
                   process.env.GOOGLE_API_KEY ||
                   '';

    let result: { playlistTitle: string; videos: Array<{ title: string; url: string; videoId: string }> };
    let source: 'api' | 'scraper' = 'scraper';

    if (apiKey && apiKey.trim().length > 10) {
      try {
        result = await fetchViaYouTubeAPI(playlistId, apiKey.trim());
        source = 'api';
      } catch (apiErr: any) {
        console.warn('YouTube API failed, falling back to server scraper:', apiErr?.message);
        // Fallback to web scraper
        result = await fetchViaWebScraper(playlistId);
        source = 'scraper';
      }
    } else {
      result = await fetchViaWebScraper(playlistId);
      source = 'scraper';
    }

    // Number results 1 to N
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
      source,
    });
  } catch (error: any) {
    console.error('Playlist extraction error:', error);
    const msg = error?.message || 'Error desconocido al procesar la lista de reproducción.';
    
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
    console.log(`Extractor de Listas de YouTube corriendo en http://localhost:${PORT}`);
  });
}

startServer();
