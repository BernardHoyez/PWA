
export interface MediaFile {
  name: string;
  dataUrl: string;
  file: File;
  type: string;
}

export interface GpsCoordinates {
  lat: number;
  lon: number;
}

export interface Slide {
  id: string;
  title: string;
  comment: string;
  image?: MediaFile;
  video?: MediaFile;
  audio?: MediaFile;
  gps: GpsCoordinates | null;
}

export type Visit = Slide[];
