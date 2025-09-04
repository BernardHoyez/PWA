
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
