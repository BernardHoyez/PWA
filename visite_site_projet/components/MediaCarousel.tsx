import React, { useRef } from 'react';
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
          className={`relative flex-shrink-0 w-32 h-24 rounded-lg cursor-pointer overflow-hidden transition-all duration-200 transform hover:scale-105 ${currentIndex === index ? 'ring-4 ring-emerald-500' : 'ring-2 ring-transparent'}`}
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

export default MediaCarousel;