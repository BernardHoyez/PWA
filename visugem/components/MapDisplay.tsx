import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { PoiPopupContent } from './PoiPopupContent';
import type { ProcessedData, Poi } from '../types';

declare const L: any;

interface MapDisplayProps {
  processedData: ProcessedData;
  userLocation: { lat: number; lng: number } | null;
}

const getMarkerColor = (pois: Poi[]): string => {
    if (pois.length > 1) return '#475569'; // slate-600 for multiple pois
    const poi = pois[0];
    const { image, video, audio } = poi;
    if (image && video && audio) return '#4338ca'; // indigo-700
    if (image && video) return '#ea580c'; // orange-600
    if (image && audio) return '#7e22ce'; // purple-700 (requested "violet")
    if (video && audio) return '#be185d'; // fuchsia-700
    if (image) return '#0284c7'; // sky-600 (requested "blue")
    if (video) return '#dc2626'; // red-600 (requested "red")
    if (audio) return '#16a34a'; // green-600
    return '#64748b'; // slate-500
};

const createMarkerIcon = (color: string) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${color}">
      <path d="M12 0C7.589 0 4 3.589 4 8c0 4.411 8 16 8 16s8-11.589 8-16c0-4.411-3.589-8-8-8zm0 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
      <circle cx="12" cy="8" r="4" fill="white" fill-opacity="0.5"/>
    </svg>`;
    
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38]
    });
};

const createUserLocationIcon = () => {
  const html = `
    <div class="user-location-marker">
      <div class="pulse"></div>
      <div class="dot"></div>
    </div>`;
  return L.divIcon({
    html: html,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const MapDisplay = ({ processedData, userLocation }: MapDisplayProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const popupRootsRef = useRef<Root[]>([]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([48.85, 2.35], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      popupRootsRef.current.forEach(root => root.unmount());
      popupRootsRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !processedData) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    popupRootsRef.current.forEach(root => root.unmount());
    popupRootsRef.current = [];
    
    const { visit, mediaData } = processedData;

    if (visit.pois.length === 0) return;
    
    const locations = new Map<string, Poi[]>();
    visit.pois.forEach(poi => {
      const key = poi.location.trim();
      if (!locations.has(key)) {
        locations.set(key, []);
      }
      locations.get(key)!.push(poi);
    });

    const allLatLngs: [number, number][] = [];
    
    locations.forEach((pois, locationStr) => {
      const match = locationStr.match(/([0-9.]+)([NS]),\s*([0-9.]+)([EW])/);
      if (!match) return;

      let lat = parseFloat(match[1]);
      let lng = parseFloat(match[3]);
      if (match[2] === 'S') lat = -lat;
      if (match[4] === 'W') lng = -lng;
      allLatLngs.push([lat, lng]);

      const color = getMarkerColor(pois);
      const icon = createMarkerIcon(color);
      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      
      const popupContainer = document.createElement('div');
      const root = ReactDOM.createRoot(popupContainer);
      root.render(<PoiPopupContent pois={pois} mediaData={mediaData} userLocation={userLocation} />);

      marker.bindPopup(popupContainer, { minWidth: 300 });

      markersRef.current.push(marker);
      popupRootsRef.current.push(root);
    });
    
    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      mapRef.current.fitBounds(bounds.pad(0.2));
    }

  }, [processedData, userLocation]);

  useEffect(() => {
    if (mapRef.current && userLocation) {
      const userLatLng = [userLocation.lat, userLocation.lng];
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLatLng, {
          icon: createUserLocationIcon(),
          zIndexOffset: 1000,
        }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
      }
    }
  }, [userLocation]);

  return <div ref={mapContainerRef} className="w-full flex-grow" />;
};