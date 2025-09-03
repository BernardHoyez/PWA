import React, { useState, useCallback } from 'react';
import { Slide } from './types';
import GpsDisplay from './components/GpsDisplay';
import MediaCarousel from './components/MediaCarousel';
import AudioRecorder from './components/AudioRecorder';
import { CameraIcon, EyeIcon, PencilIcon, SaveIcon, DownloadIcon } from './components/Icons';

const DEFAULT_SLIDES: Slide[] = [
  {
    "id": "1",
    "type": "image",
    "url": "https://picsum.photos/seed/nature1/1280/720",
    "name": "Paysage Montagneux",
    "commentary": "Une vue magnifique depuis le sommet, par temps clair."
  },
  {
    "id": "2",
    "type": "video",
    "url": "https://www.w3schools.com/html/mov_bbb.mp4",
    "name": "Rivière en Forêt",
    "commentary": "Le son de l'eau est très apaisant."
  },
  {
    "id": "3",
    "type": "image",
    "url": "https://picsum.photos/seed/nature3/1280/720",
    "name": "Coucher de Soleil",
    "commentary": "Les couleurs étaient incroyables ce soir-là."
  }
];

// In the exported project, we directly use the embedded slides.
const getInitialSlides = (): Slide[] => {
    // If slides are empty after load, add a placeholder
    if (DEFAULT_SLIDES.length === 0) {
        return [{
            id: 'placeholder',
            type: 'image',
            name: 'Commencez ici',
            url: 'https://picsum.photos/seed/placeholder/1280/720',
            commentary: 'Ajoutez votre première image ou vidéo pour créer votre visite.'
        }];
    }
    return DEFAULT_SLIDES;
};

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

  const showExportInfo = () => {
    alert("Les fonctions d'exportation sont désactivées dans le projet zippé. Utilisez l'application d'origine pour générer de nouvelles visites.");
  };


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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${isEditorMode ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
              aria-label="Passer en mode éditeur"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setIsEditorMode(false)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${!isEditorMode ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
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
              <button onClick={showExportInfo} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105 opacity-50 cursor-not-allowed" title="Export désactivé dans cette version">
                <SaveIcon /> Exporter la visite (.zip)
              </button>
              <button onClick={showExportInfo} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105 opacity-50 cursor-not-allowed" title="Export désactivé dans cette version">
                <DownloadIcon /> Exporter le projet (.zip)
              </button>
          </div>
        )}

      </main>

      <footer className={`bg-white dark:bg-gray-800 shadow-inner p-4 z-10 transition-all duration-300 ${isEditorMode ? 'h-72' : 'h-48'}`}>
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

export default App;