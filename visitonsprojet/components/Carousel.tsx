
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
