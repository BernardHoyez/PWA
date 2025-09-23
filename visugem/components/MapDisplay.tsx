import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProcessedData, Poi } from '../types';
import { PoiPopupContent } from './PoiPopupContent';

// CRITICAL FIX: The main cause of the "black screen".
// Replaces the broken `require` calls with direct CDN URLs for the marker icons.
// This is robust and works without a bundler.
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


// Type for user position
type UserPosition = { lat: number; lng: number };

interface MapDisplayProps {
  data: ProcessedData;
  userPosition: UserPosition | null;
}

// Helper to parse location string robustly
const parseLocation = (locationStr: string): L.LatLng | null => {
  try {
    const parts = locationStr.toUpperCase().split(/[\s,]+/);
    if (parts.length < 2) return null;
    
    const latStr = parts[0].replace('N', '').replace('S', '-');
    const lonStr = parts[1].replace('E', '').replace('W', '-');
    
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) return null;
    
    return new L.LatLng(lat, lon);
  } catch (error) {
    console.error(`Impossible de parser la localisation: "${locationStr}"`, error);
    return null;
  }
};

// Custom marker colors
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const violetIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

export const MapDisplay = ({ data, userPosition }: MapDisplayProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const reactPopupRoots = useRef<Map<HTMLElement, ReturnType<typeof createRoot>>>(new Map());


  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
        const poisWithLocations = data.visit.pois
            .map(poi => ({ poi, latLng: parseLocation(poi.location) }))
            .filter(item => item.latLng !== null) as { poi: Poi, latLng: L.LatLng }[];

        if (poisWithLocations.length === 0) return;

        const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);
        mapRef.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Group POIs by location
        const poisByLocation = new Map<string, Poi[]>();
        poisWithLocations.forEach(({ poi, latLng }) => {
            const key = latLng.toString();
            if (!poisByLocation.has(key)) {
                poisByLocation.set(key, []);
            }
            poisByLocation.get(key)!.push(poi);
        });

        const allBounds = L.latLngBounds(poisWithLocations.map(p => p.latLng));

        poisByLocation.forEach((pois, locationKey) => {
            const location = parseLocation(pois[0].location)!;
            
            let icon = blueIcon;
            const hasVideo = pois.some(p => p.video);
            const hasAudio = pois.some(p => p.audio);

            if(hasVideo) icon = redIcon;
            if(hasVideo && hasAudio) icon = violetIcon;

            const marker = L.marker(location, { icon }).addTo(map);

            const popupContainer = document.createElement('div');
            const root = createRoot(popupContainer);
            reactPopupRoots.current.set(popupContainer, root);

            root.render(
                <PoiPopupContent pois={pois} mediaData={data.mediaData} userPosition={userPosition} />
            );

            marker.bindPopup(popupContainer);
        });

        if (allBounds.isValid()) {
            map.fitBounds(allBounds, { padding: [50, 50] });
        }
    }
    
    // Cleanup function
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        reactPopupRoots.current.forEach(root => root.unmount());
        reactPopupRoots.current.clear();
    };
  }, [data]);
  
  // Update user marker position
  useEffect(() => {
    const map = mapRef.current;
    if (map && userPosition) {
        const userLatLng = new L.LatLng(userPosition.lat, userPosition.lng);
        if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div><div class="dot"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
            userMarkerRef.current.setLatLng(userLatLng);
        }
        // Optional: center map on user
        // map.setView(userLatLng, 15);
    }
  }, [userPosition]);
  
  // Update popups when user position changes
  useEffect(() => {
      reactPopupRoots.current.forEach((root, container) => {
          const marker = (container as any)._leaflet_marker as L.Marker | undefined;
          if (marker) {
              const pois = (marker as any)._pois as Poi[] | undefined;
              if (pois) {
                  root.render(<PoiPopupContent pois={pois} mediaData={data.mediaData} userPosition={userPosition} />);
              }
          }
      });
  }, [userPosition, data.mediaData]);


  if (!data || !data.visit.pois || data.visit.pois.length === 0) {
    return <div className="text-center p-8 text-slate-300">Aucun point d'intérêt à afficher.</div>;
  }

  return (
    <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
  );
};
