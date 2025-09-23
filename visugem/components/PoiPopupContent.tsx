import React, { useState } from 'react';
import { Poi, MediaData } from '../types';
import { parseLocation, haversineDistance, calculateAzimuth, UserPosition } from '../utils';

interface PoiPopupContentProps {
  pois: Poi[];
  mediaData: MediaData;
  userPosition: UserPosition;
}

const SinglePoiDisplay = ({ poi, media, userPosition }: { poi: Poi, media: MediaData[number], userPosition: UserPosition }) => {
    // CORRECTION CRITIQUE : Utilise l'analyseur robuste au lieu du fragile split/map.
    const poiLatLng = parseLocation(poi.location);

    // Calcule la distance et l'azimut uniquement si l'emplacement est valide
    const distance = userPosition && poiLatLng ? haversineDistance(userPosition, poiLatLng) : null;
    const azimuth = userPosition && poiLatLng ? calculateAzimuth(userPosition, poiLatLng) : null;

    return (
        <div className="p-2 space-y-3 bg-slate-800 text-slate-50 rounded-lg">
            <h3 className="text-lg font-bold text-sky-400">{poi.title}</h3>
            
            {userPosition && (
                <div className="text-xs text-slate-400 grid grid-cols-2 gap-2 border-b border-slate-700 pb-2">
                    <div>
                        <span className="font-semibold">Distance :</span> {distance !== null ? `${distance.toFixed(0)} m` : 'N/A'}
                    </div>
                    <div>
                        <span className="font-semibold">Azimut :</span> {azimuth !== null ? `N${azimuth.toFixed(0)}°` : 'N/A'}
                    </div>
                </div>
            )}
            
            <p className="text-sm text-slate-300">{poi.comment}</p>
            
            {media.image && (
                <div className="rounded-md overflow-hidden">
                    <img src={media.image} alt={poi.title} className="w-full h-auto object-cover" />
                </div>
            )}
            
            {media.video && (
                <div className="rounded-md overflow-hidden bg-black">
                    <video controls className="w-full h-auto">
                        <source src={media.video} type="video/mp4" />
                        Votre navigateur ne supporte pas la balise vidéo.
                    </video>
                </div>
            )}

            {media.audio && (
                <div className="mt-2">
                    <audio controls className="w-full">
                        <source src={media.audio} type="audio/mpeg" />
                        Votre navigateur ne supporte pas l'élément audio.
                    </audio>
                </div>
            )}
        </div>
    );
};


export const PoiPopupContent = ({ pois, mediaData, userPosition }: PoiPopupContentProps) => {
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(pois.length === 1 ? pois[0] : null);

  if (selectedPoi) {
    return (
      <div className="w-[300px] max-h-96 overflow-y-auto bg-slate-800 rounded-lg no-scrollbar">
        {pois.length > 1 && (
            <button
              onClick={() => setSelectedPoi(null)}
              className="text-xs text-sky-400 hover:underline p-2"
            >
              &larr; Retour à la liste
            </button>
        )}
        <SinglePoiDisplay poi={selectedPoi} media={mediaData[selectedPoi.id]} userPosition={userPosition} />
      </div>
    );
  }

  return (
    <div className="w-[300px] max-h-96 overflow-y-auto p-2 space-y-2 bg-slate-800 text-slate-50 rounded-lg no-scrollbar">
        <h3 className="text-md font-bold text-sky-400 border-b border-slate-700 pb-2">Plusieurs POI à cet emplacement</h3>
        <ul className="space-y-1">
            {pois.map(poi => (
                <li key={poi.id}>
                    <button
                        onClick={() => setSelectedPoi(poi)}
                        className="w-full text-left p-2 rounded-md hover:bg-slate-700 transition-colors"
                    >
                        {poi.title}
                    </button>
                </li>
            ))}
        </ul>
    </div>
  );
};