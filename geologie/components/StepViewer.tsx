import React from 'react';
import { Step } from '../types';
import { ClearIcon } from './icons';
import GpsDisplay from './GpsDisplay';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface StepViewerProps {
  step: Step;
  isEditorMode: boolean;
  onUpdateStep: (updatedStep: Step) => void;
  onFileChange: (stepId: string, field: 'image' | 'video' | 'audio', file: File | null) => void;
  position: GeolocationPosition | null;
  locationError: string | null;
}

const FileInput: React.FC<{
    label: string;
    field: 'image' | 'video' | 'audio';
    accept: string;
    step: Step;
    onFileChange: (stepId: string, field: 'image' | 'video' | 'audio', file: File | null) => void;
}> = ({ label, field, accept, step, onFileChange }) => {
    const fileInputId = `${field}-${step.id}`;
    const hasFile = step[field];

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor={fileInputId} className="flex-grow bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold py-2 px-3 rounded-md cursor-pointer transition-colors text-center">
                {hasFile ? "Changer" : "Choisir"} {label}
            </label>
            <input
                type="file"
                id={fileInputId}
                accept={accept}
                className="hidden"
                onChange={(e) => onFileChange(step.id, field, e.target.files?.[0] ?? null)}
            />
            {hasFile && (
                 <button 
                    onClick={() => onFileChange(step.id, field, null)} 
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                    title={`Retirer ${label}`}
                >
                    <ClearIcon />
                </button>
            )}
        </div>
    );
};


const StepViewer: React.FC<StepViewerProps> = ({ step, isEditorMode, onUpdateStep, onFileChange, position, locationError }) => {
  const handleInputChange = <K extends keyof Step>(
    field: K,
    value: Step[K]
  ) => {
    onUpdateStep({ ...step, [field]: value });
  };

  const renderMedia = () => {
    // Priorité : Vidéo > Audio (arrière-plan) > Image
    if (step.video) {
        return <video key={step.video} src={step.video as string} poster={step.image as string} controls autoPlay muted loop className="w-full h-full object-contain absolute inset-0" />;
    }
    
    // Pour les étapes audio ou les étapes avec image uniquement, afficher l'image.
    // Le lecteur audio lui-même est rendu dans l'interface du visualiseur.
    if (step.image) {
        return (
            <img
                key={step.image}
                src={step.image as string}
                alt={step.title}
                className={`w-full h-full object-contain absolute inset-0 ${step.audio ? 'opacity-70' : ''}`}
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1280x720/1a202c/ffffff?text=Image+introuvable';
                }}
            />
        );
    }
    return <div className="w-full h-full bg-gray-800 flex items-center justify-center"><p className="text-gray-500">Aucun média sélectionné</p></div>;
  };

  return (
    <div className="flex-grow w-full h-full relative">
      {/* 1. Média en arrière-plan */}
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        {renderMedia()}
      </div>
      
      {/* 2. Dégradé pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]"></div>
      
      {isEditorMode ? (
        // 3a. INTERFACE DE L'ÉDITEUR
        <div className="absolute inset-0 p-8 flex flex-col justify-end text-white z-20">
          <div className="bg-black/60 backdrop-blur-md p-6 rounded-lg max-w-2xl w-full space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Titre de l'étape</label>
              <input
                id="title"
                type="text"
                value={step.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2 text-2xl font-bold focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                id="description"
                value={step.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2 text-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <FileInput label="Image / Poster" field="image" accept="image/*" step={step} onFileChange={onFileChange} />
                <FileInput label="Vidéo" field="video" accept="video/*" step={step} onFileChange={onFileChange} />
                <FileInput label="Audio" field="audio" accept="audio/*" step={step} onFileChange={onFileChange} />
            </div>
          </div>
        </div>
      ) : (
        // 3b. INTERFACE DU VISUALISEUR
        <>
          <GpsDisplay position={position} error={locationError} />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10 pointer-events-none">
            <div className="max-w-2xl w-full">
              <h1 className="text-4xl font-bold drop-shadow-lg">{step.title}</h1>
              <p className="mt-4 text-xl text-gray-200 drop-shadow-md">{step.description}</p>
              {step.audio && (
                <div className="mt-6 bg-black/30 backdrop-blur-sm p-3 rounded-lg pointer-events-auto">
                  <audio key={step.audio as string} src={step.audio as string} controls className="w-full" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StepViewer;