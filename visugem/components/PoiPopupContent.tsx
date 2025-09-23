import React, { useState } from 'react';
import type { Poi, MediaData } from '../types';

interface PoiPopupContentProps {
  pois: Poi[];
  mediaData: MediaData;
  userLocation: { lat: number; lng: number } | null;
}

const parseLocation = (locationStr: string): { lat: number; lng: number } | null => {
  const match = locationStr.match(/([0-9.]+)([NS]),\s*([0-9.]+)([EW])/);
  if (!match) return null;

  let lat = parseFloat(match[1]);
  let lng = parseFloat(match[3]);
  if (match[2] === 'S') lat = -lat;
  if (match[4] === 'W') lng = -lng;

  return { lat, lng };
};

// Haversine formula for distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

// Formula for azimuth/bearing
const calculateAzimuth = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;

    const y = Math.sin(λ2-λ1) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    const θ = Math.atan2(y, x);
    const brng = (θ*180/Math.PI + 360) % 360; // in degrees
    return brng;
};


const PoiDetails = ({ poi, media, userLocation }: { poi: Poi; media: MediaData[number], userLocation: { lat: number, lng: number } | null }) => {
  const poiLocation = parseLocation(poi.location);
  
  let distance: number | null = null;
  let azimuth: number | null = null;

  if (userLocation && poiLocation) {
    distance = calculateDistance(userLocation.lat, userLocation.lng, poiLocation.lat, poiLocation.lng);
    azimuth = calculateAzimuth(userLocation.lat, userLocation.lng, poiLocation.lat, poiLocation.lng);
  }

  return (
    <div className="p-1 text-slate-200">
      <h3 className="text-lg font-bold text-sky-400 mb-2">{poi.title}</h3>
      {poi.comment && <p className="text-sm mb-2 text-slate-300 italic">"{poi.comment}"</p>}
      
      <div className="space-y-3 mt-3">
        {media.image && (
          <img src={media.image} alt={poi.title} className="rounded-md w-full max-h-48 object-cover" />
        )}
        {media.video && (
          <video controls src={media.video} className="rounded-md w-full" />
        )}
        {media.audio && (
          <audio controls src={media.audio} className="w-full" />
        )}
      </div>
      
      {distance !== null && azimuth !== null && (
        <div className="mt-4 p-2 bg-slate-700/50 rounded-md text-sm">
            <div className="flex justify-between items-center">
                <span className="text-slate-400">Distance:</span>
                <span className="font-bold text-sky-300">{distance.toFixed(0)} m</span>
            </div>
            <div className="flex justify-between items-center mt-1">
                <span className="text-slate-400">Azimuth:</span>
                <span className="font-bold text-sky-300 font-mono">N{String(Math.round(azimuth)).padStart(3, '0')}°</span>
            </div>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-3 font-mono">{poi.location}</p>
    </div>
  );
};

export const PoiPopupContent = ({ pois, mediaData, userLocation }: PoiPopupContentProps) => {
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(pois.length === 1 ? pois[0] : null);

  if (selectedPoi) {
    return (
      <div className="p-2">
        {pois.length > 1 && (
            <button 
                onClick={() => setSelectedPoi(null)}
                className="text-sm text-sky-400 hover:text-sky-300 mb-2"
            >
                &larr; Retour à la liste
            </button>
        )}
        <PoiDetails poi={selectedPoi} media={mediaData[selectedPoi.id]} userLocation={userLocation} />
      </div>
    );
  }

  return (
    <div className="p-2">
        <h3 className="text-lg font-bold text-slate-200 mb-2">Plusieurs POI à cet emplacement</h3>
        <ul className="space-y-1 list-disc list-inside">
            {pois.map(poi => (
                <li key={poi.id}>
                    <button 
                        onClick={() => setSelectedPoi(poi)}
                        className="text-sky-400 hover:text-sky-300 hover:underline text-left"
                    >
                        {poi.title}
                    </button>
                </li>
            ))}
        </ul>
    </div>
  );
};