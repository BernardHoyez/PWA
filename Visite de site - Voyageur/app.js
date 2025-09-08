/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

declare const JSZip: any;
declare const L: any;

interface Point {
  id: number;
  title: string;
  comment: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
}

interface MapViewProps {
    points: Point[];
    onClose: () => void;
    onSelectPoint: (index: number) => void;
}

// --- Helper Functions for Geolocation ---
const toRadians = (deg: number) => deg * (Math.PI / 180);
const toDegrees = (rad: number) => rad * (180 / Math.PI);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

const calculateAzimuth = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const λ1 = toRadians(lon1);
    const λ2 = toRadians(lon2);

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);

    return (toDegrees(θ) + 360) % 360; // in degrees
};


const MapView: React.FC<MapViewProps> = ({ points, onClose, onSelectPoint }) => {
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    // Initialize map once
    useEffect(() => {
        if (document.getElementById('map') && !mapRef.current) {
             const map = L.map('map').setView([46.2276, 2.2137], 5); // Centered on France
             mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
    }, []);

    // Update markers when points change
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        
        // Clear previous markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const pointsWithCoords = points.filter(p => p.latitude != null && p.longitude != null);
        
        if (pointsWithCoords.length > 0) {
            const newMarkers = pointsWithCoords.map(point => {
                const marker = L.marker([point.latitude!, point.longitude!]);
                const popupContent = document.createElement('div');
                popupContent.innerHTML = `<b>${point.title}</b><br/><button class="popup-nav-btn">Aller à ce point</button>`;
                const button = popupContent.querySelector('button');
                button?.addEventListener('click', () => {
                    onSelectPoint(point.id);
                });
                marker.bindPopup(popupContent);
                return marker;
            });
            
            markersRef.current = newMarkers;
            const featureGroup = L.featureGroup(newMarkers).addTo(map);
            
            // Wait for map to be visible before fitting bounds
            setTimeout(() => map.fitBounds(featureGroup.getBounds().pad(0.1)), 100);
        }
    }, [points, onSelectPoint]);


    return (
        <div className="map-overlay">
            <div className="map-container">
                <div id="map" style={{ height: '100%', width: '100%' }}></div>
                 <button onClick={onClose} className="btn-close-map" aria-label="Fermer la carte">&times;</button>
            </div>
        </div>
    );
};

const SiteVoyageur = () => {
    const [points, setPoints] = useState<Point[]>([]);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisitLoaded, setIsVisitLoaded] = useState(false);
    const [showMap, setShowMap] = useState(false);
    
    // Navigation state
    const [showNavigation, setShowNavigation] = useState(false);
    const [navigationData, setNavigationData] = useState<{distance: number; azimuth: number} | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            points.forEach(point => {
                if (point.imageUrl) URL.revokeObjectURL(point.imageUrl);
                if (point.videoUrl) URL.revokeObjectURL(point.videoUrl);
                if (point.audioUrl) URL.revokeObjectURL(point.audioUrl);
            });
        };
    }, [points]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setIsVisitLoaded(false);
        setPoints([]); // Clear previous points

        try {
            const zip = await JSZip.loadAsync(file);
            const dataFolder = zip.folder("data");
            if (!dataFolder) {
                throw new Error("Le fichier ZIP ne contient pas de dossier 'data'.");
            }
            
            const pointFolders: any[] = [];
            dataFolder.forEach((relativePath, zipEntry) => {
                if (zipEntry.dir && relativePath.startsWith('point_')) {
                    pointFolders.push(zipEntry);
                }
            });

            if (pointFolders.length === 0) {
              throw new Error("Aucun dossier 'point_XX' trouvé dans le dossier 'data'.");
            }

            pointFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            const loadedPoints: Point[] = [];
            for (let i = 0; i < pointFolders.length; i++) {
                const folderZipObj = pointFolders[i];
                const dataFile = zip.file(folderZipObj.name + "data.json");
                if (!dataFile) {
                    console.warn(`data.json manquant dans ${folderZipObj.name}, point ignoré.`);
                    continue;
                }

                const metadataStr = await dataFile.async("string");
                const metadata = JSON.parse(metadataStr);

                const point: Point = {
                    id: i,
                    title: metadata.title || 'Sans titre',
                    comment: metadata.comment || '',
                    latitude: metadata.latitude ? parseFloat(metadata.latitude) : undefined,
                    longitude: metadata.longitude ? parseFloat(metadata.longitude) : undefined,
                };
                
                if (metadata.imageFile) {
                    const imageBlob = await zip.file(folderZipObj.name + metadata.imageFile)?.async("blob");
                    if(imageBlob) point.imageUrl = URL.createObjectURL(imageBlob);
                }
                if (metadata.videoFile) {
                    const videoBlob = await zip.file(folderZipObj.name + metadata.videoFile)?.async("blob");
                    if(videoBlob) point.videoUrl = URL.createObjectURL(videoBlob);
                }
                if (metadata.audioFile) {
                    const audioBlob = await zip.file(folderZipObj.name + metadata.audioFile)?.async("blob");
                    if(audioBlob) point.audioUrl = URL.createObjectURL(audioBlob);
                }
                loadedPoints.push(point);
            }
            
            setPoints(loadedPoints);
            setCurrentPointIndex(0);
            setIsVisitLoaded(true);

        } catch (err: any) {
            setError(`Erreur lors du traitement du fichier ZIP : ${err.message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNext = () => {
        setCurrentPointIndex(prev => Math.min(prev + 1, points.length - 1));
    };

    const handlePrev = () => {
        setCurrentPointIndex(prev => Math.max(prev - 1, 0));
    };

    const handleSelectPointFromMap = (index: number) => {
        setCurrentPointIndex(index);
        setShowMap(false);
    }

    const handleNavigateToPoint = () => {
        const currentPoint = points[currentPointIndex];
        if (!currentPoint?.latitude || !currentPoint?.longitude) return;

        setShowNavigation(true);
        setIsLocating(true);
        setLocationError(null);
        setNavigationData(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: userLat, longitude: userLon } = position.coords;
                const distance = calculateDistance(userLat, userLon, currentPoint.latitude!, currentPoint.longitude!);
                const azimuth = calculateAzimuth(userLat, userLon, currentPoint.latitude!, currentPoint.longitude!);

                setNavigationData({ distance, azimuth });
                setIsLocating(false);
            },
            (error) => {
                let message = "Impossible d'obtenir la géolocalisation.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = "Vous avez refusé la demande de géolocalisation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = "L'information de localisation n'est pas disponible.";
                        break;
                    case error.TIMEOUT:
                        message = "La demande de géolocalisation a expiré.";
                        break;
                }
                setLocationError(message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    if (!isVisitLoaded) {
        return (
            <div className="container welcome-container">
                <header>
                    <h1>Visite de Site</h1>
                    <p>Application Voyageur</p>
                </header>
                <div className="upload-box">
                    <h2>Commencer une visite</h2>
                    <p>Sélectionnez le fichier <code>visite_data.zip</code> exporté depuis l'application Éditeur.</p>
                    <input type="file" id="zip-upload" accept=".zip" onChange={handleFileChange} style={{display: 'none'}} />
                    <label htmlFor="zip-upload" className="btn-primary">
                        Charger une Visite (.zip)
                    </label>
                    {isLoading && <p className="status-message">Chargement de la visite...</p>}
                    {error && <p className="status-message status-error">{error}</p>}
                </div>
            </div>
        );
    }

    const currentPoint = points[currentPointIndex];

    const NavigationModal = () => (
      <div className="navigation-overlay">
        <div className="navigation-info">
          <button onClick={() => setShowNavigation(false)} className="btn-close-nav" aria-label="Fermer la navigation">&times;</button>
          <h3>Direction vers "{currentPoint.title}"</h3>
          {isLocating && <p className="status-message">Recherche de votre position...</p>}
          {locationError && <p className="status-message status-error">{locationError}</p>}
          {navigationData && (
            <div className="nav-data-container">
              <div className="nav-data">
                <span>Distance</span>
                <strong>{navigationData.distance.toFixed(0)} mètres</strong>
              </div>
              <div className="nav-data">
                <span>Azimut</span>
                <strong>Nord {navigationData.azimuth.toFixed(0)}°</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return (
        <div className="container viewer-container">
            {showMap && <MapView points={points} onClose={() => setShowMap(false)} onSelectPoint={handleSelectPointFromMap} />}
            {showNavigation && <NavigationModal />}
            <header>
                 <h1>{currentPoint.title}</h1>
            </header>
            
            <main className="point-content">
                {currentPoint.imageUrl && <img src={currentPoint.imageUrl} alt={`Image pour ${currentPoint.title}`} />}
                {currentPoint.videoUrl && <video src={currentPoint.videoUrl} controls>Votre navigateur ne supporte pas la vidéo.</video>}
                {currentPoint.audioUrl && <audio src={currentPoint.audioUrl} controls>Votre navigateur ne supporte pas l'audio.</audio>}
                {currentPoint.comment && <p className="comment">{currentPoint.comment}</p>}
                
                {currentPoint.latitude != null && currentPoint.longitude != null && (
                    <button onClick={handleNavigateToPoint} className="btn-navigate">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                        Me diriger vers ce point
                    </button>
                )}
            </main>

            <footer className="navigation">
                <button onClick={handlePrev} disabled={currentPointIndex === 0} className="btn-nav">
                    &larr; Précédent
                </button>
                <div className="nav-center-group">
                    <span className="nav-status">Point {currentPointIndex + 1} / {points.length}</span>
                    <button onClick={() => setShowMap(true)} className="btn-map" title="Afficher la carte">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </button>
                </div>
                <button onClick={handleNext} disabled={currentPointIndex === points.length - 1} className="btn-nav">
                    Suivant &rarr;
                </button>
            </footer>
        </div>
    );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<SiteVoyageur />);
}