
import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { ToggleSwitch } from './components/ToggleSwitch';
import type { Visit, Slide, MediaFile } from './types';
import { AppIcon } from './components/Icons';

// Helper to fetch a media file from the local /media/ folder and construct the MediaFile object
const fetchMediaAsMediaFile = async (name: string, type: string): Promise<MediaFile> => {
    const response = await fetch(`./media/${name}`);
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
            const res = await fetch('./visit.json');
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
