
import React, { useState, useCallback, useEffect } from 'react';
import { Step } from './types';
import Header from './components/Header';
import StepViewer from './components/StepViewer';
import StepNavigator from './components/StepNavigator';
import { initDB, saveFile, getFile, deleteFile } from './db';

// Déclare JSZip pour TypeScript car il est chargé via CDN
declare const JSZip: any;

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

const initialSteps: Step[] = [
  {
    id: 'step-1',
    title: 'Étape 1: Le Hall d\'Entrée',
    description: 'Bienvenue dans le hall principal. Admirez l\'architecture et la hauteur sous plafond. Dans le mode éditeur, vous pouvez modifier ce texte et choisir vos propres médias.',
    image: './assets/hall.jpg',
    thumbnail: './assets/hall_thumb.jpg',
  },
  {
    id: 'step-2',
    title: 'Étape 2: La Salle d\'Exposition',
    description: 'Cette salle présente des œuvres d\'art uniques. Chaque pièce raconte une histoire. Utilisez le bandeau en bas pour naviguer ou modifier la visite.',
    image: './assets/expo.jpg',
    thumbnail: './assets/expo_thumb.jpg',
    video: '',
    audio: ''
  },
];

const generateThumbnail = (imageFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; // Largeur de la miniature
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Impossible d\'obtenir le contexte du canvas'));
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('La conversion du canvas en Blob a échoué'));
          }
          const thumbnailFile = new File([blob], `thumb_${imageFile.name}`, { type: 'image/jpeg' });
          resolve(thumbnailFile);
        }, 'image/jpeg', 0.8); // Qualité de 80%
      };
      img.onerror = (err) => reject(new Error(`Erreur de chargement de l'image: ${err}`));
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error("FileReader n'a pas pu lire le fichier."));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsDataURL(imageFile);
  });
};


const App: React.FC = () => {
  const [isEditorMode, setIsEditorMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('virtual-tour-editor-mode');
    return savedMode ? JSON.parse(savedMode) : true;
  });
  const [steps, setSteps] = useState<Step[]>([]);
  const [displaySteps, setDisplaySteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Effet pour l'initialisation de la DB et le chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        
        let stepsToLoad: Step[] = initialSteps;
        const savedStepsJSON = localStorage.getItem('virtual-tour-steps');
        if (savedStepsJSON) {
          try {
            const parsedSteps = JSON.parse(savedStepsJSON);
            if (Array.isArray(parsedSteps)) {
              stepsToLoad = parsedSteps;
            } else {
              console.warn("Invalid data found in localStorage for steps, using initial steps.");
            }
          } catch (error) {
            console.error("Failed to parse steps from localStorage, using initial steps.", error);
          }
        }
        setSteps(stepsToLoad);

        const savedIndexJSON = localStorage.getItem('virtual-tour-current-step');
        if (savedIndexJSON) {
          try {
            const savedIndex = JSON.parse(savedIndexJSON);
            // Valider l'index par rapport aux étapes chargées
            if (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < stepsToLoad.length) {
              setCurrentStepIndex(savedIndex);
            }
          } catch (error) {
            console.error("Failed to parse current step index from localStorage.", error);
          }
        }
      } catch (error) {
        console.error("Failed to initialize DB, using initial steps.", error);
        setSteps(initialSteps);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Effet pour synchroniser les données de la visite avec localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('virtual-tour-steps', JSON.stringify(steps));
      localStorage.setItem('virtual-tour-current-step', JSON.stringify(currentStepIndex));
    }
  }, [steps, currentStepIndex, isLoading]);

  // Effet pour synchroniser le mode éditeur avec localStorage
  useEffect(() => {
    localStorage.setItem('virtual-tour-editor-mode', JSON.stringify(isEditorMode));
  }, [isEditorMode]);
  
  // Effet pour créer des étapes affichables à partir des étapes avec des ID de la DB
  useEffect(() => {
    let isMounted = true;
    const oldDisplaySteps = displaySteps;
  
    const createDisplaySteps = async () => {
      const newDisplaySteps = await Promise.all(
        steps.map(async (step) => {
          const newStep = { ...step };
          for (const key of ['image', 'thumbnail', 'video', 'audio'] as const) {
            const value = step[key];
            if (typeof value === 'number') {
              try {
                const file = await getFile(value);
                newStep[key] = URL.createObjectURL(file);
              } catch (error) {
                console.error(`Failed to load file with id ${value} for step ${step.id}`, error);
                newStep[key] = ''; // Ou une image de substitution
              }
            }
          }
          return newStep;
        })
      );
      if (isMounted) {
        setDisplaySteps(newDisplaySteps);
      }
    };
  
    createDisplaySteps();
  
    return () => {
      isMounted = false;
      // Révoquer les anciennes URLs blob des displaySteps précédents
      oldDisplaySteps.forEach(step => {
        (['image', 'thumbnail', 'video', 'audio'] as const).forEach(key => {
          const url = step[key];
          if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      });
    };
  }, [steps]);


  useEffect(() => {
    // Gestion de la géolocalisation
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setPosition(pos);
      setLocationError(null);
    };

    const handleError = (error: GeolocationPositionError) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setLocationError("Permission de localisation refusée.");
          break;
        case error.POSITION_UNAVAILABLE:
          setLocationError("Position non disponible.");
          break;
        case error.TIMEOUT:
          setLocationError("La demande de position a expiré.");
          break;
        default:
          setLocationError("Une erreur inconnue est survenue.");
          break;
      }
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Nettoyage de l'abonnement
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleToggleMode = useCallback(() => {
    setIsEditorMode(prev => !prev);
  }, []);

  const handleSelectStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
  }, []);
  
  const handleUpdateStep = useCallback((updatedStep: Step) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === updatedStep.id
          ? { ...step, title: updatedStep.title, description: updatedStep.description }
          : step
      )
    );
  }, []);

  const handleFileChange = useCallback(async (stepId: string, field: 'image' | 'video' | 'audio', file: File | null) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    const newSteps = [...steps];
    const stepToUpdate = { ...newSteps[stepIndex] };

    // Gérer la suppression de fichier
    if (!file) {
      const oldFileId = stepToUpdate[field];
      if (typeof oldFileId === 'number') {
        await deleteFile(oldFileId).catch(err => console.error("Échec de la suppression de l'ancien fichier", err));
      }
      stepToUpdate[field] = '';

      // Si l'image principale est supprimée, supprimer aussi la miniature
      if (field === 'image') {
        const oldThumbId = stepToUpdate.thumbnail;
        if (typeof oldThumbId === 'number') {
          await deleteFile(oldThumbId).catch(err => console.error("Échec de la suppression de l'ancienne miniature", err));
        }
        stepToUpdate.thumbnail = '';
      }
    } else { // Gérer l'ajout/modification de fichier
      if (field === 'image') {
        // Supprimer l'ancienne image et la miniature avant d'en ajouter de nouvelles
        if (typeof stepToUpdate.image === 'number') await deleteFile(stepToUpdate.image);
        if (typeof stepToUpdate.thumbnail === 'number') await deleteFile(stepToUpdate.thumbnail);

        try {
          const thumbnailFile = await generateThumbnail(file);
          const [newImageId, newThumbnailId] = await Promise.all([
            saveFile(file),
            saveFile(thumbnailFile)
          ]);
          stepToUpdate.image = newImageId;
          stepToUpdate.thumbnail = newThumbnailId;
        } catch (err) {
          console.error("Échec du traitement de l'image et de la miniature", err);
          return; // Ne pas mettre à jour l'état si le traitement échoue
        }
      } else { // Pour la vidéo ou l'audio
        const oldFileId = stepToUpdate[field];
        if (typeof oldFileId === 'number') {
          await deleteFile(oldFileId);
        }
        try {
          stepToUpdate[field] = await saveFile(file);
        } catch (err) {
          console.error("Échec de la sauvegarde du nouveau fichier", err);
          return;
        }
      }
    }

    newSteps[stepIndex] = stepToUpdate;
    setSteps(newSteps);
  }, [steps]);

  const handleAddStep = useCallback(() => {
    const newStepId = `step-${Date.now()}`;
    const newStep: Step = {
      id: newStepId,
      title: 'Nouvelle Étape',
      description: 'Ajoutez une description ici.',
      image: '',
      thumbnail: '',
      video: '',
      audio: '',
    };
    setSteps(prevSteps => [...prevSteps, newStep]);
    setCurrentStepIndex(steps.length);
  }, [steps.length]);

  const handleDeleteStep = useCallback(async (idToDelete: string) => {
    const stepToDelete = steps.find(step => step.id === idToDelete);
    if (!stepToDelete) return;

    const fileDeletionPromises = (['image', 'thumbnail', 'video', 'audio'] as const)
        .map(key => stepToDelete[key])
        .filter((value): value is number => typeof value === 'number')
        .map(id => deleteFile(id).catch(err => console.error(`Failed to delete file ${id}`, err)));

    await Promise.all(fileDeletionPromises);
    
    setSteps(prevSteps => {
      const stepIndexToDelete = prevSteps.findIndex(step => step.id === idToDelete);
      if (stepIndexToDelete === -1) return prevSteps;

      const newSteps = prevSteps.filter(step => step.id !== idToDelete);
      
      if(newSteps.length === 0) {
          setCurrentStepIndex(0);
          return [];
      }

      if (currentStepIndex >= stepIndexToDelete) {
        setCurrentStepIndex(Math.max(0, currentStepIndex - 1));
      }

      return newSteps;
    });
  }, [currentStepIndex, steps]);

  const handleMoveStep = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;

    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      const [movedItem] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedItem);

      if (currentStepIndex === fromIndex) {
        setCurrentStepIndex(toIndex);
      } else if (currentStepIndex > fromIndex && currentStepIndex <= toIndex) {
        setCurrentStepIndex(currentStepIndex - 1);
      } else if (currentStepIndex < fromIndex && currentStepIndex >= toIndex) {
        setCurrentStepIndex(currentStepIndex + 1);
      }

      return newSteps;
    });
  }, [steps.length, currentStepIndex]);
  
  const handleExportJson = useCallback(async () => {
      const sanitizedStepsPromises = steps.map(async step => {
        const newStep: any = {...step};
        for (const key of ['image', 'thumbnail', 'video', 'audio'] as const) {
            const value = newStep[key];
            if (typeof value === 'number') {
                try {
                    const file = await getFile(value);
                    newStep[key] = `./assets/${file.name}`;
                } catch {
                    newStep[key] = '';
                }
            }
        }
        return newStep;
      });

      const sanitizedSteps = await Promise.all(sanitizedStepsPromises);
      const dataStr = JSON.stringify({ tour: sanitizedSteps }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'virtual-tour.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  }, [steps]);

  const handleExportPwa = useCallback(async () => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    const iconsFolder = zip.folder("icons");

    const finalSteps: Step[] = JSON.parse(JSON.stringify(steps)); // Deep copy
    const assetsToCache = new Set<string>();
    
    const filePromises: Promise<void>[] = [];

    finalSteps.forEach((step) => {
      (['image', 'thumbnail', 'video', 'audio'] as const).forEach(key => {
        const id = step[key];
        if (typeof id === 'number') {
          const promise = getFile(id).then(file => {
            const newPath = `./assets/${file.name}`;
            (step as any)[key] = newPath;
            assetsFolder?.file(file.name, file);
            assetsToCache.add(newPath);
          }).catch(err => {
            console.error(`Failed to get file ${id} for export`, err);
            (step as any)[key] = '';
          });
          filePromises.push(promise);
        } else if (typeof id === 'string' && (id.startsWith('./assets/') || id.startsWith('assets/'))) {
          const cleanPath = id.startsWith('.') ? id : `./${id}`;
          assetsToCache.add(cleanPath);
        }
      });
    });

    await Promise.all(filePromises);

    assetsToCache.add('./tour.json');
    zip.file("tour.json", JSON.stringify({ tour: finalSteps }, null, 2));

    zip.file("index.html", `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visite Virtuelle</title>
    <link rel="stylesheet" href="./style.css">
    <link rel="manifest" href="./manifest.json">
    <meta name="theme-color" content="#111827"/>
</head>
<body>
    <div id="gps-display"></div>
    <main id="viewer">
        <div class="media-container"></div>
        <div class="info-panel">
            <h1 id="step-title"></h1>
            <p id="step-description"></p>
        </div>
    </main>
    <nav id="navigator">
        <!-- Thumbnails injected by JS -->
    </nav>
    <script src="./viewer.js"></script>
</body>
</html>`);

    zip.file("style.css", `body { margin: 0; font-family: sans-serif; background-color: #111827; color: #f3f4f6; display: flex; flex-direction: column; height: 100vh; }
main#viewer { flex-grow: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
.media-container { position: absolute; inset: 0; }
.media-container img, .media-container video { width: 100%; height: 100%; object-fit: cover; }
.media-container audio { position: absolute; bottom: 20px; left: 20px; right: 20px; width: calc(100% - 40px); z-index: 20; }
.info-panel { position: relative; z-index: 10; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 5rem 2rem 2rem; }
#step-title { font-size: 2.5rem; margin: 0 0 1rem; text-shadow: 2px 2px 4px #000; }
#step-description { font-size: 1.2rem; line-height: 1.6; max-w: 800px; text-shadow: 1px 1px 2px #000; }
nav#navigator { flex-shrink: 0; background-color: rgba(17, 24, 39, 0.8); backdrop-filter: blur(10px); padding: 1rem; overflow-x: auto; white-space: nowrap; }
.thumbnail { width: 150px; height: 90px; object-fit: cover; border-radius: 8px; margin-right: 1rem; cursor: pointer; border: 3px solid transparent; transition: all 0.3s ease; }
.thumbnail.active { border-color: #3b82f6; transform: scale(1.05); }
#gps-display { position: absolute; top: 1rem; left: 1rem; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(5px); color: white; font-family: monospace; font-size: 0.875rem; padding: 0.5rem; border-radius: 0.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 30; max-width: calc(100% - 2rem);}`);

    zip.file("viewer.js", `
document.addEventListener('DOMContentLoaded', () => {
    let steps = [];
    let currentStepIndex = 0;

    const mediaContainer = document.querySelector('.media-container');
    const stepTitle = document.getElementById('step-title');
    const stepDescription = document.getElementById('step-description');
    const navigatorContainer = document.getElementById('navigator');

    function renderStep(index) {
        if (index < 0 || index >= steps.length) return;
        currentStepIndex = index;
        const step = steps[index];
        
        mediaContainer.innerHTML = '';

        if (step.video) {
            const video = document.createElement('video');
            video.src = step.video;
            video.poster = step.image || '';
            video.controls = true; video.autoplay = true; video.muted = true; video.loop = true;
            mediaContainer.appendChild(video);
        } else if (step.audio) {
            if (step.image) {
                const img = document.createElement('img');
                img.src = step.image;
                mediaContainer.appendChild(img);
            }
            const audio = document.createElement('audio');
            audio.src = step.audio;
            audio.controls = true; audio.autoplay = false;
            mediaContainer.appendChild(audio);
        } else if (step.image) {
            const img = document.createElement('img');
            img.src = step.image;
            mediaContainer.appendChild(img);
        }

        stepTitle.textContent = step.title;
        stepDescription.textContent = step.description;
        updateActiveThumbnail();
    }

    function renderNavigator() {
        navigatorContainer.innerHTML = '';
        steps.forEach((step, index) => {
            const thumb = document.createElement('img');
            thumb.src = step.thumbnail;
            thumb.className = 'thumbnail';
            thumb.onclick = () => renderStep(index);
            navigatorContainer.appendChild(thumb);
        });
        updateActiveThumbnail();
    }

    function updateActiveThumbnail() {
        const thumbnails = navigatorContainer.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentStepIndex);
        });
    }

    async function loadTour() {
        try {
            const response = await fetch('./tour.json');
            if (!response.ok) throw new Error('Failed to load tour data');
            const data = await response.json();
            steps = data.tour;
            if (steps.length > 0) {
                renderStep(0);
                renderNavigator();
            }
        } catch (error) {
            console.error(error);
            stepTitle.textContent = "Erreur de chargement";
            stepDescription.textContent = "Impossible de charger les données de la visite. Vérifiez que le fichier tour.json est présent.";
        }
    }
    
    function initGeolocation() {
        const gpsDisplay = document.getElementById('gps-display');
        if (!gpsDisplay) return;

        if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            gpsDisplay.textContent = "Erreur: La géolocalisation nécessite HTTPS.";
            return;
        }

        if (!navigator.geolocation) {
            gpsDisplay.textContent = "Géolocalisation non supportée.";
            return;
        }

        const formatCoordinate = (coordinate, type) => {
            const val = Math.abs(coordinate);
            const dir = type === 'lat' ? (coordinate >= 0 ? 'N' : 'S') : (coordinate >= 0 ? 'E' : 'W');
            return \`\${val.toFixed(4)}\${dir}\`;
        };

        const handleSuccess = (pos) => {
            const { latitude, longitude } = pos.coords;
            gpsDisplay.innerHTML = \`Lat \${formatCoordinate(latitude, 'lat')} | Lon \${formatCoordinate(longitude, 'lon')}\`;
        };

        const handleError = (error) => {
            let message = "Erreur de localisation.";
            if (error.code === 1) message = "Permission de localisation refusée.";
            if (error.code === 2) message = "Position non disponible.";
            if (error.code === 3) message = "Timeout.";
            gpsDisplay.textContent = message;
        };
        
        gpsDisplay.textContent = "Recherche de la position...";
        navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW registered.', reg)).catch(err => console.log('SW registration failed: ', err));
        });
    }

    loadTour();
    initGeolocation();
});
`);

    const icon192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192"><rect width="192" height="192" rx="32" fill="#3b82f6"/><path d="M56 144l32-48 24 24 40-40" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="128" cy="64" r="12" fill="white"/></svg>`;
    const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="85" fill="#3b82f6"/><path d="M150 400l85-128 64 64 106-106" stroke="white" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/><circle cx="341" cy="171" r="32" fill="white"/></svg>`;
    iconsFolder?.file("icon-192.svg", icon192);
    iconsFolder?.file("icon-512.svg", icon512);
    assetsToCache.add('./icons/icon-192.svg');
    assetsToCache.add('./icons/icon-512.svg');
    
    zip.file("manifest.json", JSON.stringify({
        "name": "Visite Virtuelle", "short_name": "Visite", "start_url": ".", "display": "standalone", "background_color": "#111827", "theme_color": "#111827", "description": "Une visite virtuelle créée avec l'éditeur PWA.", "icons": [{"src":"./icons/icon-192.svg","type":"image/svg+xml","sizes":"192x192"},{"src":"./icons/icon-512.svg","type":"image/svg+xml","sizes":"512x512"}]
    }, null, 2));
    assetsToCache.add('./manifest.json');

    const coreCacheUrls = ['./', './index.html', './style.css', './viewer.js'];
    const allUrlsToCache = [...new Set([...coreCacheUrls, ...Array.from(assetsToCache)])];

    zip.file("sw.js", `
const CACHE_NAME = 'virtual-tour-cache-v${Date.now()}';
const urlsToCache = ${JSON.stringify(allUrlsToCache, null, 2)};

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching files:', urlsToCache);
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`);

    zip.generateAsync({type:"blob"}).then(function(content: any) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "virtual-tour-pwa.zip";
        link.click();
        URL.revokeObjectURL(link.href);
    });

  }, [steps]);


  const currentStep = displaySteps[currentStepIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <Header 
        isEditorMode={isEditorMode} 
        onToggleMode={handleToggleMode}
        onExportJson={handleExportJson}
        onExportPwa={handleExportPwa}
      />
      <main className="flex-grow flex flex-col overflow-hidden relative">
        {isLoading ? (
            <div className="flex-grow flex items-center justify-center bg-gray-800">
             <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-400">Chargement de la visite...</h2>
             </div>
           </div>
        ) : currentStep ? (
          <StepViewer 
            key={currentStep.id}
            step={currentStep} 
            isEditorMode={isEditorMode} 
            onUpdateStep={handleUpdateStep}
            onFileChange={handleFileChange}
            position={position}
            locationError={locationError}
          />
        ) : (
           <div className="flex-grow flex items-center justify-center bg-gray-800">
             <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-400">Aucune étape disponible.</h2>
                <p className="text-gray-500 mt-2">Passez en mode éditeur pour ajouter votre première étape.</p>
             </div>
           </div>
        )}
      </main>
      <StepNavigator
        steps={displaySteps}
        currentStepIndex={currentStepIndex}
        isEditorMode={isEditorMode}
        onSelectStep={handleSelectStep}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        onMoveStep={handleMoveStep}
      />
    </div>
  );
};

export default App;
