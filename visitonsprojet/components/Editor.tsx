
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
