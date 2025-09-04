
import type { Visit, Slide, MediaFile } from './types';

declare const JSZip: any;

(blob, filename) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

(visit) => {
    return visit.map(slide => {
        const newSlide = { ...slide };
        if (newSlide.image)
            newSlide.image = { name: newSlide.image.name, type: newSlide.image.type };
        if (newSlide.video)
            newSlide.video = { name: newSlide.video.name, type: newSlide.video.type };
        if (newSlide.audio)
            newSlide.audio = { name: newSlide.audio.name, type: newSlide.audio.type };
        delete newSlide.image?.dataUrl;
        delete newSlide.video?.dataUrl;
        delete newSlide.audio?.dataUrl;
        delete newSlide.image?.file;
        delete newSlide.video?.file;
        delete newSlide.audio?.file;
        return newSlide;
    });
}

// --- START FILE CONTENTS ---
const indexHtmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visitons</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#317EFB"/>
  <script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "react": "https://aistudiocdn.com/react@^19.1.1",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/"
  }
}
</script>
</head>
  <body class="bg-slate-100 text-slate-800">
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }
    </script>
  </body>
</html>`;
const manifestJsonContent = `
{
  "short_name": "Visitons",
  "name": "Visitons - Your Tour Guide Creator",
  "icons": [
    {
      "src": "https://picsum.photos/192",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "https://picsum.photos/512",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#f1f5f9"
}`;
const swJsContent = `
// A simple, no-op service worker that satisfies PWA installability requirements.
// You can extend this to cache assets for offline use.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Force the waiting service worker to become the active service worker.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A basic network-first strategy.
  event.respondWith(
    fetch(event.request).catch(() => {
      // You can return a fallback offline page here if you have one cached.
      // For this app, we'll just let the fetch fail.
    })
  );
});`;
const indexTsxContent = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
const appTsxContent = `
import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { ToggleSwitch } from './components/ToggleSwitch';
import type { Visit, Slide, MediaFile } from './types';
import { AppIcon } from './components/Icons';

// Helper to fetch a media file from the local /media/ folder and construct the MediaFile object
const fetchMediaAsMediaFile = async (name: string, type: string): Promise<MediaFile> => {
    const response = await fetch(`/media/${name}`);
    const blob = await response.blob();
    const file = new File([blob], name, { type });
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    return { name, dataUrl, file, type };
};


const App: React.FC = () => {
  const [mode, setMode] = useState<'editor' | 'viewer'>('editor');
  const [visit, setVisit] = useState<Visit>([]);

  useEffect(() => {
    const loadInitialVisit = async () => {
        try {
            const res = await fetch('/visit.json');
            if (!res.ok) {
                // This is not an error, it just means we are in a fresh editor environment.
                console.info('visit.json not found, starting a new visit.');
                return;
            }
            const visitData: Omit<Slide, 'image'|'video'|'audio'>[] = await res.json();
            
            const reconstructedVisit = await Promise.all(
                visitData.map(async (slideData: any) => {
                    const newSlide: Slide = {
                        ...slideData,
                        id: slideData.id || crypto.randomUUID(),
                        image: undefined,
                        video: undefined,
                        audio: undefined,
                    };

                    if (slideData.image) {
                        newSlide.image = await fetchMediaAsMediaFile(slideData.image.name, slideData.image.type);
                    }
                    if (slideData.video) {
                        newSlide.video = await fetchMediaAsMediaFile(slideData.video.name, slideData.video.type);
                    }
                    if (slideData.audio) {
                        newSlide.audio = await fetchMediaAsMediaFile(slideData.audio.name, slideData.audio.type);
                    }

                    return newSlide;
                })
            );
            setVisit(reconstructedVisit);

        } catch (error) {
            console.error("Failed to load and reconstruct visit data:", error);
        }
    };

    loadInitialVisit();
  }, []);

  const handleModeChange = useCallback((isEditor: boolean) => {
    setMode(isEditor ? 'editor' : 'viewer');
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AppIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Visitons</h1>
        </div>
        <ToggleSwitch
          label="Mode"
          option1="Édition"
          option2="Visualisation"
          isOption1Active={mode === 'editor'}
          onToggle={handleModeChange}
        />
      </header>
      <main className="p-4 md:p-8">
        {mode === 'editor' ? (
          <Editor visit={visit} setVisit={setVisit} />
        ) : (
          <Viewer visit={visit} />
        )}
      </main>
    </div>
  );
};

export default App;
`;
const typesTsContent = `
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
`;
const metadataJsonContent = `
{
  "name": "Visitons",
  "description": "An application to create and follow guided tour itineraries. In editor mode, you can build a tour with images, videos, audio, and text for each stop. In viewer mode, a tourist can follow the created itinerary.",
  "requestFramePermissions": [
    "geolocation"
  ]
}
`;
const useGeolocationTsContent = `
import { useState, useEffect } from 'react';
import type { GpsCoordinates } from '@/types';

export const useGeolocation = () => {
  const [coordinates, setCoordinates] = useState<GpsCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, []);

  return { coordinates, error };
};
`;
const iconsTsxContent = `
import React from 'react';

export const AppIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export const VideoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
  </svg>
);

export const AudioIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const GpsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);
`;
const toggleSwitchTsxContent = `
import React from 'react';

interface ToggleSwitchProps {
  label: string;
  option1: string;
  option2: string;
  isOption1Active: boolean;
  onToggle: (isOption1Active: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, option1, option2, isOption1Active, onToggle }) => {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="relative inline-flex items-center cursor-pointer bg-slate-200 rounded-full p-1">
        <button
          onClick={() => onToggle(true)}
          className={`px-4 py-1 text-sm rounded-full transition-colors duration-300 ease-in-out ${
            isOption1Active ? 'bg-blue-600 text-white shadow' : 'text-slate-700'
          }`}
        >
          {option1}
        </button>
        <button
          onClick={() => onToggle(false)}
          className={`px-4 py-1 text-sm rounded-full transition-colors duration-300 ease-in-out ${
            !isOption1Active ? 'bg-blue-600 text-white shadow' : 'text-slate-700'
          }`}
        >
          {option2}
        </button>
      </div>
    </div>
  );
};
`;
const carouselTsxContent = `
import React, { useState, useRef } from 'react';
import type { Visit, Slide } from '@/types';
import { ImageIcon, PlusIcon, TrashIcon, VideoIcon } from './Icons';

interface CarouselProps {
  visit: Visit;
  setVisit: React.Dispatch<React.SetStateAction<Visit>>;
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
}

const CarouselItem: React.FC<{ slide: Slide; isSelected: boolean; onSelect: () => void; onDelete: () => void }> = ({ slide, isSelected, onSelect, onDelete }) => {
  const mediaType = slide.image ? 'image' : slide.video ? 'video' : 'none';
  const background = slide.image?.dataUrl ?? '';

  return (
    <div
      onClick={onSelect}
      className={`relative flex-shrink-0 w-32 h-24 bg-slate-300 rounded-lg cursor-pointer overflow-hidden shadow-md transition-all duration-200 border-4 ${isSelected ? 'border-blue-500 scale-105' : 'border-transparent hover:border-blue-300'}`}
      style={{
        backgroundImage: mediaType === 'image' ? `url(${background})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {mediaType === 'video' && (
        <div className="w-full h-full bg-slate-600 flex items-center justify-center">
          <VideoIcon className="w-8 h-8 text-white" />
        </div>
      )}
      {mediaType === 'none' && (
        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-500" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
        {slide.title || 'Sans titre'}
      </div>
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full z-10"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const Carousel: React.FC<CarouselProps> = ({ visit, setVisit, selectedSlideId, onSelectSlide, onAddSlide }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };
  
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newVisit = [...visit];
      const draggedItemContent = newVisit.splice(dragItem.current, 1)[0];
      newVisit.splice(dragOverItem.current, 0, draggedItemContent);
      setVisit(newVisit);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDelete = (id: string) => {
    setVisit(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner mt-6">
      <h3 className="text-lg font-semibold mb-3">Diapositives</h3>
      <div className="flex items-center gap-4 overflow-x-auto pb-3">
        {visit.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            <CarouselItem
              slide={slide}
              isSelected={selectedSlideId === slide.id}
              onSelect={() => onSelectSlide(slide.id)}
              onDelete={() => handleDelete(slide.id)}
            />
          </div>
        ))}
        <button
          onClick={onAddSlide}
          className="flex-shrink-0 w-32 h-24 bg-slate-200 hover:bg-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-600 transition-colors"
        >
          <PlusIcon className="w-8 h-8 mb-1" />
          <span className="text-sm font-medium">Ajouter</span>
        </button>
      </div>
    </div>
  );
};
`;
const editorTsxContent = `
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Visit, Slide, MediaFile, GpsCoordinates } from '@/types';
import { useGeolocation } from '../hooks/useGeolocation';
import { Carousel } from './Carousel';
import { createProjectZip, createViewerZip } from '../services/zipService';
import { ImageIcon, VideoIcon, AudioIcon, SaveIcon, GpsIcon } from './Icons';

interface EditorProps {
  visit: Visit;
  setVisit: React.Dispatch<React.SetStateAction<Visit>>;
}

const GpsDisplay: React.FC<{ coords: GpsCoordinates | null, error: string | null }> = ({ coords, error }) => {
    return (
        <div className="bg-slate-200 p-3 rounded-lg flex items-center gap-3">
            <GpsIcon className="w-6 h-6 text-slate-600" />
            <div>
                <span className="font-mono text-sm text-slate-700">
                    {coords ? `Lat ${coords.lat.toFixed(5)}N, Lon ${coords.lon.toFixed(5)}E` : 'En attente des coordonnées...'}
                </span>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        </div>
    );
};


export const Editor: React.FC<EditorProps> = ({ visit, setVisit }) => {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const { coordinates, error: geoError } = useGeolocation();
  const [isSaving, setIsSaving] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedSlideId && visit.length > 0) {
      setSelectedSlideId(visit[0].id);
    }
    if (visit.length === 0) {
        setSelectedSlideId(null);
    }
  }, [visit, selectedSlideId]);

  const currentSlide = visit.find(s => s.id === selectedSlideId);

  const updateCurrentSlide = useCallback((data: Partial<Slide>) => {
    if (!selectedSlideId) return;
    setVisit(prev =>
      prev.map(s => (s.id === selectedSlideId ? { ...s, ...data } : s))
    );
  }, [selectedSlideId, setVisit]);

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      title: `Diapositive ${visit.length + 1}`,
      comment: '',
      gps: coordinates,
    };
    setVisit(prev => [...prev, newSlide]);
    setSelectedSlideId(newSlide.id);
  };
  
  const handleFileChange = <T extends 'image' | 'video' | 'audio'>(
    event: React.ChangeEvent<HTMLInputElement>,
    type: T
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const mediaFile: MediaFile = { name: file.name, dataUrl, file, type: file.type };
      
      const update: Partial<Slide> = { image: undefined, video: undefined };
      if (type === 'image') update.image = mediaFile;
      if (type === 'video') update.video = mediaFile;
      if (type === 'audio') update.audio = mediaFile;
      
      updateCurrentSlide(update);
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input
  };
  
  const handleSave = async (type: 'project' | 'viewer') => {
      setIsSaving(true);
      try {
          if (type === 'project') {
              await createProjectZip(visit);
          } else {
              await createViewerZip(visit);
          }
      } catch (e) {
          console.error("Failed to create zip:", e);
          alert("Une erreur est survenue lors de la création du fichier zip.");
      } finally {
          setIsSaving(false);
      }
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Preview */}
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px]">
            {currentSlide?.image && <img src={currentSlide.image.dataUrl} alt={currentSlide.title} className="max-w-full max-h-96 object-contain rounded-md" />}
            {currentSlide?.video && <video src={currentSlide.video.dataUrl} controls className="max-w-full max-h-96 rounded-md" />}
            {!currentSlide?.image && !currentSlide?.video && (
                <div className="text-center text-slate-500">
                    <ImageIcon className="w-24 h-24 mx-auto text-slate-300" />
                    <p>Aucune image ou vidéo sélectionnée</p>
                    <p className="text-sm">Sélectionnez une diapositive et ajoutez un média.</p>
                </div>
            )}
        </div>

        {/* Right Panel: Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div className="flex justify-between items-start">
                <GpsDisplay coords={coordinates} error={geoError} />
                <button
                    onClick={() => updateCurrentSlide({ gps: coordinates })}
                    disabled={!currentSlide || !coordinates}
                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                    Capturer GPS
                </button>
            </div>

            <div className="flex gap-2">
                <input type="file" accept="image/*" ref={imageInputRef} onChange={(e) => handleFileChange(e, 'image')} className="hidden" />
                <input type="file" accept="video/*" ref={videoInputRef} onChange={(e) => handleFileChange(e, 'video')} className="hidden" />
                <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => handleFileChange(e, 'audio')} className="hidden" />

                <button onClick={() => imageInputRef.current?.click()} disabled={!currentSlide} className="flex-1 btn-media"><ImageIcon className="w-5 h-5 mr-2" />Image</button>
                <button onClick={() => videoInputRef.current?.click()} disabled={!currentSlide} className="flex-1 btn-media"><VideoIcon className="w-5 h-5 mr-2" />Vidéo</button>
                <button onClick={() => audioInputRef.current?.click()} disabled={!currentSlide} className="flex-1 btn-media"><AudioIcon className="w-5 h-5 mr-2" />Audio</button>
            </div>
            {currentSlide?.audio && <p className="text-sm text-slate-600 text-center">Audio: {currentSlide.audio.name}</p>}
            
            <div>
              <label htmlFor="slideTitle" className="block text-sm font-medium text-slate-700">Titre de la diapositive</label>
              <input type="text" id="slideTitle" value={currentSlide?.title || ''} onChange={(e) => updateCurrentSlide({ title: e.target.value })} disabled={!currentSlide} className="mt-1 block w-full input-style" />
            </div>
            
            <div>
              <label htmlFor="slideComment" className="block text-sm font-medium text-slate-700">Commentaire textuel</label>
              <textarea id="slideComment" value={currentSlide?.comment || ''} onChange={(e) => updateCurrentSlide({ comment: e.target.value })} disabled={!currentSlide} rows={4} className="mt-1 block w-full input-style"></textarea>
            </div>

            <div className="flex gap-4 pt-4 border-t">
                 <button onClick={() => handleSave('project')} disabled={isSaving || visit.length === 0} className="w-full btn-save bg-green-600 hover:bg-green-700">
                    <SaveIcon className="w-5 h-5 mr-2"/>
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder le Projet'}
                </button>
                <button onClick={() => handleSave('viewer')} disabled={isSaving || visit.length === 0} className="w-full btn-save bg-indigo-600 hover:bg-indigo-700">
                    <SaveIcon className="w-5 h-5 mr-2"/>
                    {isSaving ? 'Exportation...' : 'Exporter la Visite'}
                </button>
            </div>

        </div>
      </div>
      
      <Carousel visit={visit} setVisit={setVisit} selectedSlideId={selectedSlideId} onSelectSlide={setSelectedSlideId} onAddSlide={handleAddSlide} />
      
      <style>{`
        .btn-media { @apply flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors; }
        .input-style { @apply px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-slate-100; }
        .btn-save { @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white disabled:opacity-50 disabled:cursor-not-allowed; }
      `}</style>
    </div>
  );
};
`;
const viewerTsxContent = `
import React, { useState, useEffect } from 'react';
import type { Visit } from '@/types';
import { ImageIcon } from './Icons';

interface ViewerProps {
  visit: Visit;
}

export const Viewer: React.FC<ViewerProps> = ({ visit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [visit]);

  if (!visit || visit.length === 0) {
    return (
      <div className="text-center p-10 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-slate-700">Aucune visite à afficher.</h2>
        <p className="text-slate-500 mt-2">Passez en mode Édition pour créer un itinéraire.</p>
      </div>
    );
  }

  const currentSlide = visit[currentIndex];
  if (!currentSlide) return null;

  const goToNext = () => {
    setCurrentIndex(prev => (prev < visit.length - 1 ? prev + 1 : prev));
  };

  const goToPrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
      <div className="relative w-full aspect-video bg-slate-900 flex items-center justify-center">
        {currentSlide.image && (
          <img src={currentSlide.image.dataUrl} alt={currentSlide.title} className="w-full h-full object-contain" />
        )}
        {currentSlide.video && (
          <video src={currentSlide.video.dataUrl} controls className="w-full h-full object-contain" />
        )}
        {!currentSlide.image && !currentSlide.video && (
          <div className="text-center text-slate-400">
            <ImageIcon className="w-24 h-24 mx-auto" />
            <p>Aucun média pour cette diapositive</p>
          </div>
        )}
      </div>
      <div className="p-8">
        <h2 className="text-3xl font-bold text-slate-900">{currentSlide.title}</h2>
        <p className="text-slate-600 mt-4 text-base leading-relaxed">{currentSlide.comment}</p>
        
        {currentSlide.audio && (
          <div className="mt-6">
            <audio src={currentSlide.audio.dataUrl} controls className="w-full" />
          </div>
        )}
        
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Précédent
          </button>
          <div className="text-sm font-medium text-slate-500">
            {`${currentIndex + 1} / ${visit.length}`}
          </div>
          <button
            onClick={goToNext}
            disabled={currentIndex === visit.length - 1}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};
`;
// --- END FILE CONTENTS ---

async (visit) => {
    if (!visit || visit.length === 0) {
        alert("La visite est vide. Ajoutez au moins une diapositive.");
        return;
    }
    const zip = new JSZip();
    // Add App Source Files
    zip.file('index.html', indexHtmlContent);
    zip.file('manifest.json', manifestJsonContent);
    zip.file('sw.js', swJsContent);
    zip.file('index.tsx', indexTsxContent);
    zip.file('App.tsx', appTsxContent);
    zip.file('types.ts', typesTsContent);
    zip.file('metadata.json', metadataJsonContent);
    const components = zip.folder('components');
    if (components) {
        components.file('Carousel.tsx', carouselTsxContent);
        components.file('Editor.tsx', editorTsxContent);
        components.file('Icons.tsx', iconsTsxContent);
        components.file('ToggleSwitch.tsx', toggleSwitchTsxContent);
        components.file('Viewer.tsx', viewerTsxContent);
    }
    const hooks = zip.folder('hooks');
    if (hooks) {
        hooks.file('useGeolocation.ts', useGeolocationTsContent);
    }
    const services = zip.folder('services');
    if (services) {
        // Note: This includes the source of the zip service itself at the time of export.
        // To avoid recursion, we rebuild the content string here.
        const servicesZipServiceTsContent = `
import type { Visit, Slide, MediaFile } from './types';

declare const JSZip: any;

${downloadBlob.toString()}

${sanitizeVisitForJSON.toString()}

// --- START FILE CONTENTS ---
const indexHtmlContent = \`${indexHtmlContent}\`;
const manifestJsonContent = \`${manifestJsonContent}\`;
const swJsContent = \`${swJsContent}\`;
const indexTsxContent = \`${indexTsxContent}\`;
const appTsxContent = \`${appTsxContent}\`;
const typesTsContent = \`${typesTsContent}\`;
const metadataJsonContent = \`${metadataJsonContent}\`;
const useGeolocationTsContent = \`${useGeolocationTsContent}\`;
const iconsTsxContent = \`${iconsTsxContent}\`;
const toggleSwitchTsxContent = \`${toggleSwitchTsxContent}\`;
const carouselTsxContent = \`${carouselTsxContent}\`;
const editorTsxContent = \`${editorTsxContent}\`;
const viewerTsxContent = \`${viewerTsxContent}\`;
// --- END FILE CONTENTS ---

${createProjectZip.toString()}
${createViewerZip.toString()}

const viewerHTML = \`${viewerHTML}\`;
const viewerJS = \`${viewerJS}\`;
`;
        services.file('zipService.ts', servicesZipServiceTsContent);
    }
    // Add Visit Data
    const sanitizedVisit = sanitizeVisitForJSON(visit);
    zip.file('visit.json', JSON.stringify(sanitizedVisit, null, 2));
    const mediaFolder = zip.folder('media');
    if (mediaFolder) {
        visit.forEach(slide => {
            if (slide.image)
                mediaFolder.file(slide.image.name, slide.image.file);
            if (slide.video)
                mediaFolder.file(slide.video.name, slide.video.file);
            if (slide.audio)
                mediaFolder.file(slide.audio.name, slide.audio.file);
        });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'visitons-projet.zip');
}
async (visit) => {
    if (!visit || visit.length === 0) {
        alert("La visite est vide. Ajoutez au moins une diapositive.");
        return;
    }
    const zip = new JSZip();
    // Create sanitized data and add it
    const sanitizedVisit = sanitizeVisitForJSON(visit);
    zip.file('visit.json', JSON.stringify(sanitizedVisit, null, 2));
    // Add media files
    const mediaFolder = zip.folder('media');
    if (mediaFolder) {
        visit.forEach(slide => {
            if (slide.image)
                mediaFolder.file(slide.image.name, slide.image.file);
            if (slide.video)
                mediaFolder.file(slide.video.name, slide.video.file);
            if (slide.audio)
                mediaFolder.file(slide.audio.name, slide.audio.file);
        });
    }
    // Add HTML, JS, CSS for the viewer
    zip.file('index.html', viewerHTML);
    zip.file('viewer.js', viewerJS);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'visitons-viewer.zip');
}

const viewerHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visite Guidée</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-800 text-white flex items-center justify-center min-h-screen font-sans">
    <div id="viewer-root" class="w-full max-w-4xl p-4"></div>
    <script src="viewer.js"></script>
</body>
</html>
`;
const viewerJS = `
document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('viewer-root');
    if (!root) return;

    try {
        const response = await fetch('visit.json');
        const visit = await response.json();
        
        if (!visit || visit.length === 0) {
            root.innerHTML = '<p class="text-center text-red-400">Impossible de charger les données de la visite.</p>';
            return;
        }

        let currentIndex = 0;

        const renderSlide = (index) => {
            const slide = visit[index];
            if (!slide) return;
            
            let mediaHTML = '';
            if (slide.image) {
                mediaHTML = `<img src="media/${slide.image.name}" alt="${slide.title}" class="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg mb-4"/>`;
            } else if (slide.video) {
                mediaHTML = `<video src="media/${slide.video.name}" controls class="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg mb-4"></video>`;
            } else {
                mediaHTML = '<div class="w-full h-[60vh] bg-slate-700 rounded-lg flex items-center justify-center"><p class="text-slate-400">Aucun média</p></div>';
            }

            let audioHTML = '';
            if (slide.audio) {
                audioHTML = `<audio src="media/${slide.audio.name}" controls class="w-full mt-4"></audio>`;
            }

            root.innerHTML = `
                <div class="flex flex-col items-center">
                    ${mediaHTML}
                    <div class="text-center w-full">
                        <h2 class="text-3xl font-bold mb-2">${slide.title}</h2>
                        <p class="text-slate-300 mb-4">${slide.comment}</p>
                        ${audioHTML}
                    </div>
                    <div class="flex justify-between w-full mt-6">
                        <button id="prevBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed">Précédent</button>
                        <span class="text-lg">${index + 1} / ${visit.length}</span>
                        <button id="nextBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed">Suivant</button>
                    </div>
                </div>
            `;

            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if(prevBtn) {
                prevBtn.disabled = index === 0;
                prevBtn.onclick = () => {
                    if (currentIndex > 0) {
                        currentIndex--;
                        renderSlide(currentIndex);
                    }
                };
            }

            if(nextBtn) {
                nextBtn.disabled = index === visit.length - 1;
                nextBtn.onclick = () => {
                    if (currentIndex < visit.length - 1) {
                        currentIndex++;
                        renderSlide(currentIndex);
                    }
                };
            }
        };

        renderSlide(currentIndex);

    } catch (error) {
        console.error('Error loading visit:', error);
        root.innerHTML = '<p class="text-center text-red-400">Erreur: Impossible de charger le fichier visit.json.</p>';
    }
});
`;
