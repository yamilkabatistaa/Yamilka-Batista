export interface ExtractedVideo {
  index: number;
  title: string;
  url: string;
  videoId: string;
}

export interface PlaylistInfo {
  id: string;
  title?: string;
  totalVideosCount?: number;
  extractedCount: number;
}

export interface ExtractResponse {
  success: boolean;
  playlist: PlaylistInfo;
  videos: ExtractedVideo[];
  source: 'api' | 'scraper';
  message?: string;
}

export interface ExtractErrorResponse {
  success: false;
  error: string;
  code?: 'INVALID_URL' | 'NOT_FOUND' | 'PRIVATE_PLAYLIST' | 'EMPTY_PLAYLIST' | 'API_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
}
