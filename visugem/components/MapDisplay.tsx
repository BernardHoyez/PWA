import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProcessedData, Poi } from '../types';
import { PoiPopupContent } from './PoiPopupContent';
import { parseLocation, UserPosition } from '../utils';

// CORRECTION CRITIQUE : La cause principale de "l'écran noir".
// Remplace les appels `require` défaillants par des URLs CDN directes pour les icônes de marqueur.
// C'est robuste et fonctionne sans bundler.
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface MapDisplayProps {
  data: ProcessedData;
  userPosition: UserPosition | null;
}

// Classe de Marqueur personnalisée pour contenir les données POI
class PoiMarker extends L.Marker {
    public pois: Poi[] = [];
}

// Couleurs de marqueur personnalisées
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
        
        // Regroupe les POI par emplacement
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
            
            const hasImage = pois.some(p => p.image);
            const hasVideo = pois.some(p => p.video);
            const hasAudio = pois.some(p => p.audio);
            let icon;

            if (hasImage && hasAudio) {
                icon = violetIcon;
            } else if (hasVideo) {
                icon = redIcon;
            } else {
                icon = blueIcon;
            }

            const marker = new PoiMarker(location, { icon });
            marker.pois = pois; // Attache les POI à l'instance du marqueur
            marker.addTo(map);

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
    
    // Fonction de nettoyage
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        reactPopupRoots.current.forEach(root => root.unmount());
        reactPopupRoots.current.clear();
    };
  }, [data]);
  
  // Met à jour la position du marqueur utilisateur
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
    }
  }, [userPosition]);
  
  // Met à jour les popups lorsque la position de l'utilisateur change
  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      map.eachLayer(layer => {
          if (layer instanceof PoiMarker && layer.getPopup()) {
              const popup = layer.getPopup()!;
              const container = popup.getContent() as HTMLElement;

              if (container && reactPopupRoots.current.has(container)) {
                  const root = reactPopupRoots.current.get(container)!;
                  root.render(<PoiPopupContent pois={layer.pois} mediaData={data.mediaData} userPosition={userPosition} />);
              }
          }
      });
  }, [userPosition, data.mediaData, data]);


  if (!data || !data.visit.pois || data.visit.pois.length === 0) {
    return <div className="text-center p-8 text-slate-300">Aucun point d'intérêt à afficher.</div>;
  }

  return (
    <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
  );
};