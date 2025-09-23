import React from 'react';
import { Poi, MediaData } from '../types';

interface PoiPopupContentProps {
  poi: Poi;
  media: MediaData[number];
}

export const PoiPopupContent: React.FC<PoiPopupContentProps> = ({ poi, media }) => {
  return (
    <div className="w-64 max-h-96 overflow-y-auto p-1 space-y-3">
      <h3 className="text-lg font-bold text-gray-800">{poi.title}</h3>
      <p className="text-xs text-gray-500 italic">{poi.location}</p>
      <p className="text-sm text-gray-700">{poi.comment}</p>
      
      {media.image && (
        <div className="rounded-md overflow-hidden">
          <img src={media.image} alt={poi.title} className="w-full h-auto object-cover" />
        </div>
      )}
      
      {media.video && (
        <div className="rounded-md overflow-hidden">
          <video controls className="w-full h-auto">
            <source src={media.video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {media.audio && (
        <div className="mt-2">
          <audio controls className="w-full">
            <source src={media.audio} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};
