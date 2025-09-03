export interface Step {
  id: string;
  title: string;
  description: string;
  image: string | number;      // URL de l'image ou clé IndexedDB.
  thumbnail: string | number;  // URL de la miniature ou clé IndexedDB.
  video?: string | number;     // URL optionnelle ou clé IndexedDB.
  audio?: string | number;     // URL optionnelle ou clé IndexedDB.
}
