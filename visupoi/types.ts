
export interface POI {
  id: number;
  title: string;
  location: string;
  comment: string;
  image: boolean;
  video: boolean;
  audio: boolean;
  details: number;
}

export interface VisitData {
  name: string;
  pois: POI[];
}

export interface MediaData {
  [poiId: number]: {
    image?: string;
    video?: string;
    audio?: string;
  };
}
