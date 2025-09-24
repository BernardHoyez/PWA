
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
import type { VisitData, POI, MediaData } from '../types';

// Helper to parse location string "50.04525N, 1.32983E" to LatLng
const parseLocation = (location: string): L.LatLng | null => {
  const parts = location.replace(/ /g, '').split(',');
  if (parts.length !== 2) return null;

  const latPart = parts[0].match(/(\d+\.?\d*)(N|S)/i);
  const lonPart = parts[1].match(/(\d+\.?\d*)(E|W)/i);

  if (!latPart || !lonPart) return null;

  let lat = parseFloat(latPart[1]);
  if (latPart[2].toUpperCase() === 'S') lat = -lat;

  let lon = parseFloat(lonPart[1]);
  if (lonPart[2].toUpperCase() === 'W') lon = -lon;
  
  return L.latLng(lat, lon);
};

// Helper to determine marker color
const getMarkerColor = (poi: POI): string => {
  if (poi.video) return 'bg-red-500';
  if (poi.image && poi.audio) return 'bg-purple-500';
  if (poi.image) return 'bg-blue-500';
  if (poi.audio) return 'bg-green-500';
  return 'bg-gray-500';
};

interface PopupContentProps {
  pois: POI[];
  mediaData: MediaData;
}

// React component for the popup content
const PopupContent: React.FC<PopupContentProps> = ({ pois, mediaData }) => {
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(pois.length === 1 ? pois[0] : null);
  const containerRef = useRef<HTMLDivElement>(null);

  // This effect now only handles scroll propagation, which is a nice UX feature.
  // Click propagation is handled directly in the button onClick handlers.
  // It runs only once, as the container div persists across re-renders.
  useEffect(() => {
    const node = containerRef.current;
    if (node) {
      L.DomEvent.disableScrollPropagation(node);
    }
  }, []);

  const handlePoiSelect = (e: React.MouseEvent, poi: POI) => {
    // This is the key fix: stop the click event inside React's event system
    // before it can bubble up to Leaflet and cause the popup to close.
    e.stopPropagation();
    setSelectedPoi(poi);
  };

  const handleBackToList = (e: React.MouseEvent) => {
    // Also stop propagation on the back button.
    e.stopPropagation();
    setSelectedPoi(null);
  };


  if (!selectedPoi) {
    return (
      <div className="p-1" ref={containerRef}>
        <h3 className="font-bold text-lg mb-2">{pois.length} POIs at this location</h3>
        <ul className="list-disc list-inside">
          {pois.map(poi => (
            <li key={poi.id}>
              <button onClick={(e) => handlePoiSelect(e, poi)} className="text-blue-600 hover:underline">
                {poi.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const media = mediaData[selectedPoi.id];

  return (
    <div className="w-64 max-h-96 overflow-y-auto p-1" ref={containerRef}>
      {pois.length > 1 && (
        <button onClick={handleBackToList} className="text-sm text-blue-600 hover:underline mb-2">
          &larr; Back to list
        </button>
      )}
      <h3 className="font-bold text-xl mb-1">{selectedPoi.title}</h3>
      <p className="text-xs text-gray-500 mb-2">{selectedPoi.location}</p>
      {selectedPoi.comment && <p className="text-sm my-2 italic">"{selectedPoi.comment}"</p>}
      
      {media.image && <img src={media.image} alt={selectedPoi.title} className="rounded-md my-2 w-full" />}
      {media.audio && <audio controls src={media.audio} className="w-full my-2">Your browser does not support the audio element.</audio>}
      {media.video && <video controls src={media.video} className="w-full my-2 rounded-md">Your browser does not support the video tag.</video>}
    </div>
  );
};

interface MapDisplayProps {
  visitData: VisitData;
  mediaData: MediaData;
  onReset: () => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ visitData, mediaData, onReset }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());

  useEffect(() => {
    if (mapRef.current === null && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
      markersRef.current.addTo(mapRef.current);
    }

    // Group POIs by location
    const groupedPois = new Map<string, POI[]>();
    visitData.pois.forEach(poi => {
      const locationKey = poi.location.replace(/ /g, '');
      if (!groupedPois.has(locationKey)) {
        groupedPois.set(locationKey, []);
      }
      groupedPois.get(locationKey)!.push(poi);
    });

    // Clear previous markers
    markersRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    groupedPois.forEach((poisAtLocation, locationKey) => {
      const firstPoi = poisAtLocation[0];
      const latLng = parseLocation(firstPoi.location);
      if (!latLng) return;

      bounds.extend(latLng);

      const color = getMarkerColor(firstPoi);
      const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-6 h-6 rounded-full ${color} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">${poisAtLocation.length > 1 ? poisAtLocation.length : ''}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
      });

      const marker = L.marker(latLng, { icon }).addTo(markersRef.current);
      
      marker.bindPopup('', {
        minWidth: 250,
        className: 'custom-popup'
      });

      marker.on('popupopen', (e) => {
        const container = document.createElement('div');
        const root = ReactDOM.createRoot(container);
        
        e.popup.setContent(container);
        
        root.render(<PopupContent pois={poisAtLocation} mediaData={mediaData} />);

        // When the popup is closed by Leaflet, unmount the React component to prevent memory leaks.
        marker.once('popupclose', () => {
          root.unmount();
        });
      });
    });

    if (mapRef.current && bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (mapRef.current && visitData.pois.length > 0) {
        const firstValidPoi = visitData.pois.find(p => parseLocation(p.location));
        if (firstValidPoi) {
             const location = parseLocation(firstValidPoi.location);
             if(location) mapRef.current.setView(location, 13);
        } else {
             mapRef.current.setView([46.2276, 2.2137], 6); // Center of France as fallback
        }
    }
  }, [visitData, mediaData]);
  
  return (
    <div className="relative">
      <div id="map" ref={mapContainerRef} className="h-screen w-screen z-0" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-80 p-2 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">{visitData.name}</h1>
      </div>
      <button 
        onClick={onReset} 
        className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded-lg shadow-md"
        title="Load another file"
      >
        Load New
      </button>
    </div>
  );
};

export default MapDisplay;
