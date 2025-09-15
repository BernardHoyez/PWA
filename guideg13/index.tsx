/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Type Definitions ---
interface MediaDetail {
  type: 'image' | 'video';
  url: string;
  comment: string;
}

interface VisitPoint {
  id: number;
  title: string;
  comment: string;
  location: L.LatLngTuple;
  locationString: string;
  mainAudio?: string;
  previewImage?: string;
  details: MediaDetail[];
}

// --- Helper Functions ---
const parseCoords = (coordStr: string): L.LatLngTuple | null => {
  const parts = coordStr.trim().split(',');
  if (parts.length !== 2) return null;
  const latStr = parts[0].trim().toUpperCase();
  const lonStr = parts[1].trim().toUpperCase();
  let lat = parseFloat(latStr);
  let lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon)) return null;
  if (latStr.includes('S')) lat = -lat;
  if (lonStr.includes('W')) lon = -lon;
  return [lat, lon];
};

const toRadians = (deg: number) => deg * (Math.PI / 180);

const haversineDistance = (coords1: L.LatLng, coords2: L.LatLng): number => {
    const R = 6371e3; // metres
    const phi1 = toRadians(coords1.lat);
    const phi2 = toRadians(coords2.lat);
    const dPhi = toRadians(coords2.lat - coords1.lat);
    const dLambda = toRadians(coords2.lng - coords1.lng);
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateBearing = (coords1: L.LatLng, coords2: L.LatLng): number => {
    const [phi1, lambda1] = [toRadians(coords1.lat), toRadians(coords1.lng)];
    const [phi2, lambda2] = [toRadians(coords2.lat), toRadians(coords2.lng)];
    const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// --- React Components ---

const PoiPopupContent: React.FC<{ poi: VisitPoint; userPosition: L.LatLng | null; onShowDetails: () => void; }> = ({ poi, userPosition, onShowDetails }) => {
  const distance = userPosition ? haversineDistance(L.latLng(poi.location), userPosition) : null;
  const bearing = userPosition ? calculateBearing(userPosition, L.latLng(poi.location)) : null;

  return (
    <div className="popup-content">
      <h3>{poi.title}</h3>
      <p className="location">{poi.locationString}</p>
      {poi.previewImage && <img src={poi.previewImage} alt={`Aperçu pour ${poi.title}`} className="popup-preview-image" />}
      {poi.comment && <p className="comment">{poi.comment}</p>}
      {poi.mainAudio && <audio src={poi.mainAudio} controls />}
      
      {poi.details.length > 0 && (
        <button className="details-button" onClick={onShowDetails}>
          Voir les détails
        </button>
      )}

      {userPosition && distance !== null && bearing !== null && (
        <div className="info-container">
          <p><strong>Distance:</strong> {distance.toFixed(0)} mètres</p>
          <p><strong>Azimut:</strong> Nord {bearing.toFixed(0)}°</p>
        </div>
      )}
    </div>
  );
};

const PoiDetailModal: React.FC<{ poi: VisitPoint; onClose: () => void; }> = ({ poi, onClose }) => {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="detail-modal-overlay" onClick={onClose}>
            <div className="detail-modal-content" onClick={e => e.stopPropagation()}>
                <header className="detail-modal-header">
                  <h2>{poi.title}</h2>
                  <button onClick={onClose} className="close-button" aria-label="Fermer les détails">&times;</button>
                </header>
                <div className="detail-modal-body">
                    {poi.details.map((detail, index) => (
                        <div key={index} className="detail-item">
                            <div className="media-container">
                                {detail.type === 'image' && <img src={detail.url} alt={`Détail ${index + 1} pour ${poi.title}`} />}
                                {detail.type === 'video' && <video src={detail.url} controls />}
                            </div>
                            {detail.comment && <p className="detail-comment">{detail.comment}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const UserMarker: React.FC<{ position: L.LatLng; isPoiSelected: boolean }> = ({ position, isPoiSelected }) => {
    const map = useMap();
    const firstRender = useRef(true);
    useEffect(() => {
        if (isPoiSelected) {
            firstRender.current = false;
            return;
        }
        const zoomLevel = firstRender.current ? 15 : map.getZoom();
        map.flyTo(position, zoomLevel);
        firstRender.current = false;
    }, [position, map, isPoiSelected]);

    const userIcon = new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
        iconSize: [24, 24], iconAnchor: [12, 12],
    });
    return <Marker position={position} icon={userIcon} />;
}

const TourListView: React.FC<{ visitData: VisitPoint[]; onSelectPoi: (poiId: number) => void; }> = ({ visitData, onSelectPoi }) => {
    return (
        <div className="list-view">
            <h2>Points d'intérêt</h2>
            <ul>
                {visitData.map(poi => (
                    <li key={poi.id} onClick={() => onSelectPoi(poi.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectPoi(poi.id) }}>
                        <span className="poi-id">{poi.id}</span>
                        <span className="poi-title">{poi.title}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ClusterPopupContent: React.FC<{ pois: VisitPoint[]; onShowDetails: (poiId: number) => void; }> = ({ pois, onShowDetails }) => {
  return (
      <div className="cluster-popup-content">
          <h4>Points à cet endroit</h4>
          <ul className="cluster-list">
              {pois.map(poi => (
                  <li key={poi.id}>
                      <button onClick={(e) => {
                          e.stopPropagation();
                          onShowDetails(poi.id);
                        }}>
                          <span className="poi-id">{poi.id}</span>
                          <span className="poi-title">{poi.title}</span>
                      </button>
                  </li>
              ))}
          </ul>
      </div>
  );
};


const MapView: React.FC<{ 
  visitData: VisitPoint[]; 
  userPosition: L.LatLng | null; 
  selectedPoiId: number | null; 
  onPopupClose: () => void;
  onShowDetails: (poiId: number) => void;
  onSelectPoi: (poiId: number) => void;
}> = ({ visitData, userPosition, selectedPoiId, onPopupClose, onShowDetails, onSelectPoi }) => {
  const center = visitData.length > 0 ? visitData[0].location : [48.8566, 2.3522] as L.LatLngTuple;
  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});

  const groupedPois = useMemo(() => {
    return visitData.reduce((acc, poi) => {
        const key = poi.location.join(',');
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(poi);
        return acc;
    }, {} as Record<string, VisitPoint[]>);
  }, [visitData]);
  
  const poiIcon = (id: number) => new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><path fill="#C53929" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><text x="12" y="12" font-size="10" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">${id}</text></svg>`)}`,
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
  });

  const clusterIcon = (count: number) => new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="16" fill="#0288D1" stroke="white" stroke-width="2"/><text x="18" y="22" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${count}</text></svg>`)}`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  });

  const MapController: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        if (selectedPoiId !== null) {
            const marker = markerRefs.current[selectedPoiId];
            if (marker) {
                map.flyTo(marker.getLatLng(), 15);
                marker.openPopup();
            }
        }
    }, [selectedPoiId, map]);
    return null;
  };

  return (
    <MapContainer center={center} zoom={13} className="map-container">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <MapController />
      {Object.values(groupedPois).map(poisAtLocation => {
        const isCluster = poisAtLocation.length > 1;
        const firstPoi = poisAtLocation[0];
        const position = firstPoi.location;

        return (
          <Marker
            key={position.join(',')}
            position={position}
            icon={isCluster ? clusterIcon(poisAtLocation.length) : poiIcon(firstPoi.id)}
            ref={el => {
                if (el) {
                    poisAtLocation.forEach(p => {
                        markerRefs.current[p.id] = el;
                    });
                }
            }}
            eventHandlers={{
              click: () => onSelectPoi(firstPoi.id),
              popupclose: onPopupClose
            }}
          >
            <Popup>
              {isCluster ? (
                <ClusterPopupContent pois={poisAtLocation} onShowDetails={onShowDetails} />
              ) : (
                <PoiPopupContent poi={firstPoi} userPosition={userPosition} onShowDetails={() => onShowDetails(firstPoi.id)} />
              )}
            </Popup>
          </Marker>
        );
      })}
      {userPosition && <UserMarker position={userPosition} isPoiSelected={selectedPoiId !== null} />}
    </MapContainer>
  );
};

const App: React.FC = () => {
  const [visitData, setVisitData] = useState<VisitPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<L.LatLng | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'map'>('list');
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);
  const [detailPoi, setDetailPoi] = useState<VisitPoint | null>(null);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }

    let watchId: number | undefined;
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserPosition(L.latLng(pos.coords.latitude, pos.coords.longitude));
            },
            () => {
                setError("Impossible d'accéder à votre position.");
            },
            { enableHighAccuracy: true }
        );
    } else {
        console.warn("La géolocalisation n'est pas supportée par ce navigateur.");
    }

    return () => {
        if (navigator.geolocation && watchId !== undefined) {
            navigator.geolocation.clearWatch(watchId);
        }
    };
  }, []);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const visitJsonFiles = zip.file(/visit\.json$/i);
      if (visitJsonFiles.length === 0) throw new Error("Fichier visit.json non trouvé dans le ZIP.");
      
      const visitJsonFile = visitJsonFiles[0];
      const basePath = visitJsonFile.name.substring(0, visitJsonFile.name.lastIndexOf('/') + 1);

      const visitConfig = JSON.parse(await visitJsonFile.async('string'));
      const loadedPoints = await Promise.all(visitConfig.map(async (item: any) => {
        const folder = zip.folder(`${basePath}data/${item.folder}`);
        if (!folder) return null;
        
        const [title, locationString, comment] = await Promise.all([
            folder.file(item.titleFile)?.async('text') ?? '',
            folder.file(item.locationFile)?.async('text') ?? '',
            folder.file(item.commentFile)?.async('text') ?? ''
        ]);
        const location = parseCoords(locationString);
        if (!location) return null;
        
        const mainAudio = item.audio ? URL.createObjectURL(await folder.file(item.audio)?.async('blob')) : undefined;

        const details: MediaDetail[] = [];
        const mediaFiles: { [key: string]: JSZip.JSZipObject } = {};
        const commentFiles: { [key: string]: JSZip.JSZipObject } = {};

        folder.forEach((relativePath, file) => {
            if (file.dir) return;

            const lowerCasePath = relativePath.toLowerCase();

            // Create a set of filenames to ignore to prevent crashes if a file property is missing from visit.json
            const filesToIgnore = new Set<string>();
            if (item.titleFile) filesToIgnore.add(item.titleFile.toLowerCase());
            if (item.locationFile) filesToIgnore.add(item.locationFile.toLowerCase());
            if (item.commentFile) filesToIgnore.add(item.commentFile.toLowerCase());
            if (item.audio) filesToIgnore.add(item.audio.toLowerCase());

            if (filesToIgnore.has(lowerCasePath)) {
                return;
            }

            if (/\.(jpe?g|png|gif|mp4|webm|mov)$/i.test(lowerCasePath)) {
                const nameWithoutExt = relativePath.substring(0, relativePath.lastIndexOf('.'));
                mediaFiles[nameWithoutExt] = file;
            } else if (/\.txt$/i.test(lowerCasePath)) {
                const nameWithoutExt = relativePath.substring(0, relativePath.lastIndexOf('.'));
                commentFiles[nameWithoutExt] = file;
            }
        });

        const mediaNames = Object.keys(mediaFiles).sort();

        // Process all media files into the details array
        for (const name of mediaNames) {
            const mediaFile = mediaFiles[name];
            const commentFile = commentFiles[name];
            
            const url = URL.createObjectURL(await mediaFile.async('blob'));
            const comment = commentFile ? await commentFile.async('text') : '';
            const type = /\.(mp4|webm|mov)$/i.test(mediaFile.name.toLowerCase()) ? 'video' : 'image';

            details.push({ type, url, comment });
        }

        // Find a preview image from the details array, preferring one without a comment
        let previewImage: string | undefined = undefined;
        const imageDetails = details.filter(d => d.type === 'image');
        const previewCandidate = imageDetails.find(d => !d.comment) || imageDetails[0];
        if (previewCandidate) {
            previewImage = previewCandidate.url;
        }

        return { id: item.id, title, comment, location, locationString, mainAudio, details, previewImage };
      }));

      const validPoints = loadedPoints.filter((p): p is VisitPoint => p !== null);
      setVisitData(validPoints.sort((a, b) => a.id - b.id));
      setCurrentView('list');
      setSelectedPoiId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du traitement du ZIP.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShowDetails = (poiId: number) => {
    if (!visitData) return;
    const poiToShow = visitData.find(p => p.id === poiId);
    if (poiToShow) {
      setDetailPoi(poiToShow);
    }
  };

  return (
    <div className="app-container">
      {isLoading && <div className="loading-overlay"><div className="spinner"></div><p>Chargement...</p></div>}
      {error && <div className="error-overlay"><p><strong>Erreur:</strong> {error}</p><button onClick={() => setError(null)}>Fermer</button></div>}
      {detailPoi && <PoiDetailModal poi={detailPoi} onClose={() => setDetailPoi(null)} />}
      
      {!visitData && !isLoading ? (
        <div className="file-loader">
          <h1>Suivons le guide V11</h1>
          <p>Chargez un fichier de visite (.zip) pour commencer.</p>
          <label htmlFor="zip-upload">Choisir un fichier</label>
          <input id="zip-upload" type="file" accept=".zip,.ZIP" onChange={handleFileChange} />
        </div>
      ) : visitData && (
        <div className="main-view-container">
            {currentView === 'list' ? (
                <TourListView
                    visitData={visitData}
                    onSelectPoi={(poiId) => {
                        setSelectedPoiId(poiId);
                        setCurrentView('map');
                    }}
                />
            ) : (
                <MapView
                    visitData={visitData}
                    userPosition={userPosition}
                    selectedPoiId={selectedPoiId}
                    onPopupClose={() => setSelectedPoiId(null)}
                    onShowDetails={handleShowDetails}
                    onSelectPoi={setSelectedPoiId}
                />
            )}
            <nav className="view-switcher">
                <button
                    onClick={() => setCurrentView('list')}
                    className={currentView === 'list' ? 'active' : ''}
                    aria-pressed={currentView === 'list'}
                >
                    Liste
                </button>
                <button
                    onClick={() => { setCurrentView('map'); setSelectedPoiId(null); }}
                    className={currentView === 'map' ? 'active' : ''}
                    aria-pressed={currentView === 'map'}
                >
                    Carte
                </button>
            </nav>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);