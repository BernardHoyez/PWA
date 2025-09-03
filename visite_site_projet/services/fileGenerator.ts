// This file contains the logic for generating exports from the editor.
// It is included in the exported project for reference.
function generateViewerHTML(slides) {
    const slidesJson = JSON.stringify(slides);
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visite Viewer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: sans-serif; }
    </style>
</head>
<body class="bg-gray-900 text-white flex flex-col h-screen">

    <main class="flex-grow flex flex-col relative">
        <div id="main-display" class="w-full flex-grow bg-black flex items-center justify-center relative">
            <!-- Media will be injected here -->
        </div>
    </main>

    <footer class="bg-gray-800 shadow-inner p-4 z-10 h-48">
        <div class="max-w-7xl mx-auto h-full flex flex-col">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-grow mr-4 min-w-0">
                    <h2 id="slide-name" class="text-lg font-semibold truncate"></h2>
                    <p id="slide-commentary" class="text-sm text-gray-300 mt-1"></p>
                </div>
                <div id="audio-player-container"></div>
            </div>
            <div id="carousel" class="flex-grow flex items-center gap-4 overflow-x-auto pb-2">
                <!-- Thumbnails will be injected here -->
            </div>
        </div>
    </footer>

    <script>
        const slides = ${slidesJson};
        let currentIndex = 0;

        const mainDisplay = document.getElementById('main-display');
        const slideNameEl = document.getElementById('slide-name');
        const slideCommentaryEl = document.getElementById('slide-commentary');
        const carouselEl = document.getElementById('carousel');
        const audioContainer = document.getElementById('audio-player-container');

        function renderSlide(index) {
            if (index < 0 || index >= slides.length) return;
            currentIndex = index;
            const slide = slides[index];

            // Render main media
            mainDisplay.innerHTML = '';
            if (slide.type === 'image') {
                const img = document.createElement('img');
                img.src = slide.url;
                img.alt = slide.name;
                img.className = 'max-h-full max-w-full object-contain';
                mainDisplay.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.src = slide.url;
                video.controls = true;
                video.className = 'max-h-full max-w-full object-contain';
                mainDisplay.appendChild(video);
            }
            
            // Render audio
            audioContainer.innerHTML = '';
            if(slide.audioUrl) {
                const audio = document.createElement('audio');
                audio.src = slide.audioUrl;
                audio.controls = true;
                audio.autoplay = true;
                audioContainer.appendChild(audio);
            }

            // Update info
            slideNameEl.textContent = slide.name;
            slideCommentaryEl.textContent = slide.commentary || '';
            slideCommentaryEl.style.display = slide.commentary ? 'block' : 'none';

            // Update carousel active state
            Array.from(carouselEl.children).forEach((child, i) => {
                child.classList.toggle('ring-4', i === index);
                child.classList.toggle('ring-emerald-500', i === index);
            });
        }

        function renderCarousel() {
            carouselEl.innerHTML = '';
            slides.forEach((slide, index) => {
                const thumb = document.createElement('div');
                thumb.className = 'relative flex-shrink-0 w-32 h-24 rounded-lg cursor-pointer overflow-hidden ring-2 ring-transparent';
                thumb.onclick = () => renderSlide(index);
                
                if (slide.type === 'image') {
                    const img = document.createElement('img');
                    img.src = slide.url;
                    img.className = 'w-full h-full object-cover';
                    thumb.appendChild(img);
                } else {
                    const video = document.createElement('video');
                    video.src = slide.url;
                    video.className = 'w-full h-full object-cover bg-black';
                    thumb.appendChild(video);
                }
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 bg-black bg-opacity-30 flex items-end p-1";
                const p = document.createElement('p');
                p.className = "text-white text-xs truncate";
                p.textContent = slide.name;
                overlay.appendChild(p);
                thumb.appendChild(overlay);

                carouselEl.appendChild(thumb);
            });
        }
        
        renderCarousel();
        renderSlide(0);

    </script>
</body>
</html>
    `;
}
async function generateProjectZip(slides) {
    const zip = new JSZip();
    // --- Hardcoded source files ---
    const indexHtmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visite Site</title>
    <script src="https://cdn.tailwindcss.com"></script>
    
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#34D399">
<script type="importmap">
{
  "imports": {
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/",
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "react": "https://aistudiocdn.com/react@^19.1.1"
  }
}
</script>
</head>
<body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
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
    const indexTsxContent = `import React from 'react';
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
    let appTsxContent = `import React, { useState, useCallback } from 'react';
import { Slide } from './types';
import GpsDisplay from './components/GpsDisplay';
import MediaCarousel from './components/MediaCarousel';
import AudioRecorder from './components/AudioRecorder';
import { generateViewerHTML, generateProjectZip } from './services/fileGenerator';
import { CameraIcon, EyeIcon, PencilIcon, SaveIcon, DownloadIcon } from './components/Icons';

const DEFAULT_SLIDES: Slide[] = [];

// In the exported project, we directly use the embedded slides.
const getInitialSlides = (): Slide[] => DEFAULT_SLIDES;

const App: React.FC = () => {
  const [isEditorMode, setIsEditorMode] = useState(true);
  const [slides, setSlides] = useState<Slide[]>(getInitialSlides());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const currentSlide = slides[currentSlideIndex];

  const handleSetAudio = (audioUrl: string) => {
    setSlides(prevSlides => {
      const newSlides = [...prevSlides];
      newSlides[currentSlideIndex].audioUrl = audioUrl;
      return newSlides;
    });
  };

  const handleSetCommentary = (text: string) => {
    setSlides(prevSlides => {
      const newSlides = [...prevSlides];
      newSlides[currentSlideIndex].commentary = text;
      return newSlides;
    });
  };

  const handleSetName = (name: string) => {
    setSlides(prevSlides => {
      const newSlides = [...prevSlides];
      newSlides[currentSlideIndex].name = name;
      return newSlides;
    });
  };

  const saveVisit = useCallback(() => {
    const htmlContent = generateViewerHTML(slides);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visite_viewer.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [slides]);

  const exportProject = useCallback(async () => {
    alert("Cette fonctionnalité n'est pas disponible dans le projet exporté.");
  }, [slides]);


  if (!currentSlide) {
      return (
        <div className="min-h-screen flex flex-col antialiased bg-gray-100 dark:bg-gray-900">
             <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center z-20">
                <h1 className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
                <CameraIcon />
                Visite_site
                </h1>
            </header>
            <main className="flex-grow flex flex-col items-center justify-center text-center p-4">
                 <h2 className="text-xl font-semibold mb-4">Aucune diapositive</h2>
                 <p className="text-gray-600 dark:text-gray-300 mb-6">Ajoutez une image ou une vidéo pour commencer votre visite.</p>
                 <MediaCarousel
                    slides={slides}
                    setSlides={setSlides}
                    currentIndex={-1}
                    setCurrentIndex={setCurrentSlideIndex}
                    isEditable={true}
                />
            </main>
        </div>
      );
  }


  return (
    <div className="min-h-screen flex flex-col antialiased">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center z-20">
        <h1 className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
          <CameraIcon />
          Visite_site
        </h1>
        <div className="flex items-center gap-4">
          <GpsDisplay />
          <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-full p-1">
            <button
              onClick={() => setIsEditorMode(true)}
              className={\`px-3 py-1 rounded-full text-sm font-medium transition-colors \${isEditorMode ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}\`}
              aria-label="Passer en mode éditeur"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setIsEditorMode(false)}
              className={\`px-3 py-1 rounded-full text-sm font-medium transition-colors \${!isEditorMode ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}\`}
               aria-label="Passer en mode visualiseur"
            >
              <EyeIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col relative">
        <div className="w-full flex-grow bg-black flex items-center justify-center relative">
          {currentSlide.type === 'image' ? (
            <img src={currentSlide.url} alt={currentSlide.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <video src={currentSlide.url} controls className="max-h-full max-w-full object-contain" />
          )}
          {!isEditorMode && currentSlide.audioUrl && (
             <audio src={currentSlide.audioUrl} autoPlay controls className="absolute bottom-4 left-1/2 -translate-x-1/2"/>
          )}
        </div>

        {isEditorMode && (
          <div className="absolute top-4 right-4 flex flex-col gap-3">
              <button onClick={saveVisit} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105">
                <SaveIcon /> Sauvegarder la visite
              </button>
              <button onClick={exportProject} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105">
                <DownloadIcon /> Exporter le projet (.zip)
              </button>
          </div>
        )}

      </main>

      <footer className={\`bg-white dark:bg-gray-800 shadow-inner p-4 z-10 transition-all duration-300 \${isEditorMode ? 'h-72' : 'h-48'}\`}>
        <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-grow mr-4 min-w-0">
                    {isEditorMode ? (
                        <>
                            <input
                                type="text"
                                value={currentSlide.name}
                                onChange={(e) => handleSetName(e.target.value)}
                                className="w-full text-lg font-semibold bg-transparent border-b-2 border-gray-400 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors"
                                aria-label="Titre de la diapositive"
                                placeholder="Titre de la diapositive"
                            />
                            <textarea
                                value={currentSlide.commentary || ''}
                                onChange={(e) => handleSetCommentary(e.target.value)}
                                placeholder="Ajouter un commentaire textuel..."
                                className="w-full text-sm mt-2 p-2 rounded-md bg-gray-200 dark:bg-gray-700 border border-transparent focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                                rows={2}
                            />
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold truncate" title={currentSlide.name}>{currentSlide.name}</h2>
                            {currentSlide.commentary && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{currentSlide.commentary}</p>}
                        </>
                    )}
                </div>
                {isEditorMode && (
                  <div className="flex-shrink-0">
                    <AudioRecorder audioUrl={currentSlide.audioUrl} onAudioStop={handleSetAudio} />
                  </div>
                )}
            </div>
            <MediaCarousel
                slides={slides}
                setSlides={isEditorMode ? setSlides : ()=>{}}
                currentIndex={currentSlideIndex}
                setCurrentIndex={setCurrentSlideIndex}
                isEditable={isEditorMode}
            />
        </div>
      </footer>
    </div>
  );
};

export default App;`;
    const manifestJsonContent = `{
  "short_name": "VisiteSite",
  "name": "Visite Site Naturel",
  "icons": [
    {
      "src": "https://picsum.photos/seed/logo1/192/192",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "https://picsum.photos/seed/logo2/512/512",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#34D399",
  "background_color": "#111827"
}`;
    const swJsContent = `const CACHE_NAME = 'visite-site-cache-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});`;
    const typesTsContent = `export interface Slide {
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

declare global {
  interface Window {
    INITIAL_SLIDES?: Slide[];
  }
}`;
    const componentsDir = "components/";
    const servicesDir = "services/";
    const audioRecorderContent = `import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PlayIcon, StopIcon, TrashIcon, DownloadIcon } from './Icons';

interface AudioRecorderProps {
  audioUrl?: string;
  onAudioStop: (audioUrl: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioUrl, onAudioStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(audioUrl);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
      setCurrentAudioUrl(audioUrl);
  }, [audioUrl]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(newAudioUrl);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            onAudioStop(reader.result as string);
            URL.revokeObjectURL(newAudioUrl);
        };

        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleDeleteAudio = () => {
      onAudioStop('');
      setCurrentAudioUrl(undefined);
  };

  const handleDownloadAudio = () => {
    if (!currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = \`commentaire-audio-\${Date.now()}.webm\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button onClick={handleStopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 animate-pulse" aria-label="Arrêter l'enregistrement">
            <StopIcon/>
        </button>
      ) : (
        <button onClick={handleStartRecording} className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600" aria-label="Démarrer l'enregistrement">
            <MicrophoneIcon />
        </button>
      )}
      {currentAudioUrl && !isRecording && (
        <>
          <audio ref={audioRef} src={currentAudioUrl} />
          <button onClick={() => audioRef.current?.play()} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500" aria-label="Écouter l'audio">
            <PlayIcon />
          </button>
          <button onClick={handleDownloadAudio} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600" aria-label="Télécharger l'audio">
            <DownloadIcon />
          </button>
           <button onClick={handleDeleteAudio} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Supprimer l'audio">
            <TrashIcon />
          </button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;`;
    const gpsDisplayContent = `import React, { useState, useEffect } from 'react';
import { GpsCoords } from '@/types';
import { LocationMarkerIcon } from './Icons';

const GpsDisplay: React.FC = () => {
    const [coords, setCoords] = useState<GpsCoords | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        const watcherId = navigator.geolocation.watchPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
                setError(null);
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError("Géolocalisation refusée.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError("Position non disponible.");
                        break;
                    case err.TIMEOUT:
                        setError("Timeout de géolocalisation.");
                        break;
                    default:
                        setError("Erreur de géolocalisation.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watcherId);
        };
    }, []);

    const formatCoord = (num: number, type: 'lat' | 'lon') => {
        const direction = num >= 0 ? (type === 'lat' ? 'N' : 'E') : (type === 'lat' ? 'S' : 'W');
        return \`\${Math.abs(num).toFixed(5)}\${direction}\`;
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-700 text-sm font-mono p-2 rounded-md flex items-center gap-2 shadow-inner">
           <LocationMarkerIcon />
            {coords ? (
                <span>
                    Lat:{formatCoord(coords.lat, 'lat')} Lon:{formatCoord(coords.lon, 'lon')}
                </span>
            ) : (
                <span className="text-red-500">{error || "Obtention GPS..."}</span>
            )}
        </div>
    );
};

export default GpsDisplay;`;
    const iconsContent = `import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const CameraIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const LocationMarkerIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const PencilIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export const MicrophoneIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

export const PlayIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const StopIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
    </svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

export const TrashIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const SaveIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

export const DownloadIcon: React.FC<IconProps> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);`;
    const mediaCarouselContent = `import React, { useRef } from 'react';
import { Slide } from '@/types';
import { PlusIcon, TrashIcon } from './Icons';

interface MediaCarouselProps {
  slides: Slide[];
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isEditable: boolean;
}

const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        const scale = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * scale : img.height;

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};


const MediaCarousel: React.FC<MediaCarouselProps> = ({ slides, setSlides, currentIndex, setCurrentIndex, isEditable }) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newSlides = [...slides];
      const draggedItemContent = newSlides.splice(dragItem.current, 1)[0];
      newSlides.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setSlides(newSlides);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newSlides: Slide[] = [];
      for (const file of Array.from(e.target.files)) {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        let url: string;

        if (type === 'image' && file.type.startsWith('image/')) {
          try {
            url = await compressImage(file);
          } catch (error) {
            console.error("Image compression failed, falling back to original:", error);
            url = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(file);
            });
          }
        } else {
          url = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result as string);
              reader.readAsDataURL(file);
          });
        }
        
        newSlides.push({
          id: Date.now().toString() + file.name,
          type,
          url,
          name: file.name,
        });
      }
      setSlides(prev => [...prev, ...newSlides]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  const handleDelete = (id: string) => {
    setSlides(prev => prev.filter(slide => slide.id !== id));
    if (currentIndex >= slides.length - 1) {
        setCurrentIndex(Math.max(0, slides.length - 2));
    }
  };

  return (
    <div className="flex-grow flex items-center gap-4 overflow-x-auto pb-2">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={\`relative flex-shrink-0 w-32 h-24 rounded-lg cursor-pointer overflow-hidden transition-all duration-200 transform hover:scale-105 \${currentIndex === index ? 'ring-4 ring-emerald-500' : 'ring-2 ring-transparent'}\`}
          onClick={() => setCurrentIndex(index)}
          draggable={isEditable}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
        >
          {slide.type === 'image' ? (
            <img src={slide.url} alt={slide.name} className="w-full h-full object-cover" />
          ) : (
            <video src={slide.url} className="w-full h-full object-cover bg-black" />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end p-1">
             <p className="text-white text-xs truncate">{slide.name}</p>
          </div>
          {isEditable && (
             <button onClick={(e) => { e.stopPropagation(); handleDelete(slide.id); }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-opacity opacity-75 hover:opacity-100">
               <TrashIcon className="w-4 h-4" />
             </button>
          )}
        </div>
      ))}
      {isEditable && (
        <div className="flex-shrink-0 w-32 h-24">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <PlusIcon />
            <span className="text-sm">Ajouter</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaCarousel;`;
    // --- Inject data into App.tsx ---
    const slidesJson = JSON.stringify(slides, null, 2);
    appTsxContent = appTsxContent.replace('const DEFAULT_SLIDES: Slide[] = [];', `const DEFAULT_SLIDES: Slide[] = ${slidesJson};`);
    // --- Add files to zip ---
    zip.file("index.html", indexHtmlContent);
    zip.file("index.tsx", indexTsxContent);
    zip.file("App.tsx", appTsxContent);
    zip.file("manifest.json", manifestJsonContent);
    zip.file("sw.js", swJsContent);
    zip.file("types.ts", typesTsContent);
    zip.file(componentsDir + "AudioRecorder.tsx", audioRecorderContent);
    zip.file(componentsDir + "GpsDisplay.tsx", gpsDisplayContent);
    zip.file(componentsDir + "Icons.tsx", iconsContent);
    zip.file(componentsDir + "MediaCarousel.tsx", mediaCarouselContent);
    // Add the generator itself to the zip for completeness, though it won't be used in the exported version.
    zip.file(servicesDir + "fileGenerator.ts", `// This file contains the logic for generating exports from the editor.
// It is included in the exported project for reference.
${generateViewerHTML.toString()}
${generateProjectZip.toString()}`);
    return zip.generateAsync({ type: "blob" });
}