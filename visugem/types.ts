
export interface Poi {
  id: number;
  title: string;
  location: string;
  comment: string;
  image: boolean;
  video: boolean;
  audio: boolean;
  details: number;
}

export interface Visit {
  name: string;
  pois: Poi[];
}

export interface MediaData {
  [poiId: number]: {
    image: string | null;
    video: string | null;
    audio: string | null;
  };
}

export interface ProcessedData {
  visit: Visit;
  mediaData: MediaData;
  objectUrls: string[];
}
