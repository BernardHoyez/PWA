import React from 'react';
import { Step } from '../types';
import { PlusIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon, VideoIcon, AudioIcon, ImageIcon } from './icons';

interface StepNavigatorProps {
  steps: Step[];
  currentStepIndex: number;
  isEditorMode: boolean;
  onSelectStep: (index: number) => void;
  onAddStep: () => void;
  onDeleteStep: (id: string) => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
}

const MediaIndicator: React.FC<{ step: Step }> = ({ step }) => {
    const iconClass = "h-5 w-5 text-white drop-shadow-lg";
    let icon = <ImageIcon className={iconClass} />;
    if (step.video) {
        icon = <VideoIcon className={iconClass} />;
    } else if (step.audio) {
        icon = <AudioIcon className={iconClass} />;
    }

    return <div className="absolute top-2 left-2 bg-black/50 rounded-full p-1">{icon}</div>;
};

const StepNavigator: React.FC<StepNavigatorProps> = ({
  steps,
  currentStepIndex,
  isEditorMode,
  onSelectStep,
  onAddStep,
  onDeleteStep,
  onMoveStep,
}) => {
  return (
    <footer className="bg-gray-800/80 backdrop-blur-sm p-4 z-20 flex-shrink-0 shadow-top">
      <div className="flex items-center space-x-4">
        <div className="flex-grow overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 py-2">
            {steps.map((step, index) => (
                <div key={step.id} className="inline-block align-top mr-4 w-48 group">
                    <div className="relative">
                        <img
                            // FIX: Cast `step.thumbnail` to string for `src` attribute.
                            src={step.thumbnail as string}
                            alt={step.title}
                            onClick={() => onSelectStep(index)}
                             onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x90/1a202c/ffffff?text=Miniature'; }}
                            className={`w-full h-28 object-contain rounded-lg cursor-pointer transition-all duration-300 bg-gray-900 ${
                            currentStepIndex === index ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent hover:ring-blue-400'
                            }`}
                        />
                        <MediaIndicator step={step} />
                         <div
                           onClick={() => onSelectStep(index)}
                           className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2 rounded-lg cursor-pointer opacity-100 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-sm font-semibold truncate">{step.title}</p>
                        </div>

                        {isEditorMode && (
                        <div className="absolute -top-3 -right-3 flex items-center space-x-1 opacity-100 transition-opacity duration-300">
                             <button
                                onClick={() => onMoveStep(index, index - 1)}
                                disabled={index === 0}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Déplacer à gauche"
                                >
                                <ArrowLeftIcon />
                            </button>
                             <button
                                onClick={() => onMoveStep(index, index + 1)}
                                disabled={index === steps.length - 1}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Déplacer à droite"
                                >
                                <ArrowRightIcon />
                            </button>
                            <button
                                onClick={() => onDeleteStep(step.id)}
                                className="p-1 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                                title="Supprimer l'étape"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
        {isEditorMode && (
          <button
            onClick={onAddStep}
            className="flex-shrink-0 flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold w-24 h-24 rounded-lg transition-all duration-300 transform hover:scale-105"
            title="Ajouter une nouvelle étape"
          >
            <PlusIcon />
            <span className="text-sm mt-1">Ajouter</span>
          </button>
        )}
      </div>
    </footer>
  );
};

export default StepNavigator;