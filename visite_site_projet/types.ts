export interface Slide {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  commentary?: string;
  audioUrl?: string;
}

export interface GpsCoords {
  lat: number;
  lon: number;
}