
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';

// Déclare les variables globales pour TypeScript
declare var EXIF: any;
declare var JSZip: any;

interface MediaFile {
    name: string;
    type: string;
    buffer: ArrayBuffer;
}

interface PointData {
    id: number;
    title: string;
    latitude: number | null;
    longitude: number | null;
    image: MediaFile | null;
    video: MediaFile | null;
    audio: MediaFile | null;
    comment: string;
}

// --- Map Component ---
interface MapComponentProps {
    pointId: number;
    latitude: number | null;
    longitude: number | null;
    onCoordsChange: (coords: { lat: number; lng: number }) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ pointId, latitude, longitude, onCoordsChange }) => {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const initialLat = latitude ?? 48.8566; // Default to Paris
            const initialLng = longitude ?? 2.3522;
            const initialZoom = latitude ? 13 : 5;

            const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const marker = L.marker([initialLat, initialLng], {
                draggable: true,
                autoPan: true
            }).addTo(map);

            marker.on('dragend', (event) => {
                const newCoords = event.target.getLatLng();
                onCoordsChange(newCoords);
            });
            
            mapRef.current = map;
            markerRef.current = marker;
        }

        return () => {
             if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [pointId]);

     useEffect(() => {
        if (mapRef.current && markerRef.current && latitude !== null && longitude !== null) {
            const currentMarkerPos = markerRef.current.getLatLng();
            if (currentMarkerPos.lat !== latitude || currentMarkerPos.lng !== longitude) {
                 const newLatLng = L.latLng(latitude, longitude);
                 mapRef.current.setView(newLatLng, mapRef.current.getZoom());
                 markerRef.current.setLatLng(newLatLng);
            }
        }
    }, [latitude, longitude]);


    return <div ref={mapContainerRef} id={`map-${pointId}`} className="map-container"></div>;
};


// --- Point Component ---
interface PointProps {
    point: PointData;
    onDelete: (id: number) => void;
    onUpdate: (id: number, updatedData: Partial<PointData>) => void;
    isValid: boolean;
}


const toDecimal = (gpsData: number[], ref: 'N' | 'S' | 'E' | 'W'): number => {
    if (!gpsData || gpsData.length !== 3) return 0;
    let decimal = gpsData[0] + gpsData[1] / 60 + gpsData[2] / 3600;
    if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
    }
    return decimal;
};

const formatCoords = (lat: number | null, lon: number | null): string => {
    if (lat === null || lon === null) {
        return "Positionnez le marqueur sur la carte";
    }
    const latDirection = lat >= 0 ? 'N' : 'S';
    // FIX: Replaced bitwise OR '|' with ternary operator ':' for correct conditional assignment.
    const lonDirection = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(5)}${latDirection}, ${Math.abs(lon).toFixed(5)}${lonDirection}`;
};


const Point = ({ point, onDelete, onUpdate, isValid }: PointProps) => {
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const createUrl = (mediaFile: MediaFile | null): string | null => {
            if (!mediaFile || !mediaFile.buffer) return null;
            const blob = new Blob([mediaFile.buffer], { type: mediaFile.type });
            return URL.createObjectURL(blob);
        };

        const newImageUrl = createUrl(point.image);
        const newVideoUrl = createUrl(point.video);
        const newAudioUrl = createUrl(point.audio);

        setImagePreviewUrl(newImageUrl);
        setVideoPreviewUrl(newVideoUrl);
        setAudioPreviewUrl(newAudioUrl);

        return () => {
            if (newImageUrl) URL.revokeObjectURL(newImageUrl);
            if (newVideoUrl) URL.revokeObjectURL(newVideoUrl);
            if (newAudioUrl) URL.revokeObjectURL(newAudioUrl);
        };
    }, [point.image, point.video, point.audio]);

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        mediaType: 'image' | 'video' | 'audio',
        allowedType: string,
        alertType: string
    ) => {
        const file = e.target.files?.[0];
        const input = e.target;
        
        if (!file) {
            onUpdate(point.id, { [mediaType]: null });
            return;
        }

        if (file.type !== allowedType) {
            alert(`Le fichier doit être au format ${alertType}.`);
            input.value = '';
            onUpdate(point.id, { [mediaType]: null });
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert(`Le fichier ne doit pas dépasser 20 Mo.`);
            input.value = '';
            onUpdate(point.id, { [mediaType]: null });
            return;
        }

        try {
            // Étape 1: Lire le contenu du fichier et le stocker en sécurité.
            // Ce buffer est la source de données fiable qui sera exportée.
            const buffer = await file.arrayBuffer();
            
            // Étape 2: Mettre à jour l'état principal avec les données brutes.
            onUpdate(point.id, { [mediaType]: { name: file.name, type: file.type, buffer } });

            // Étape 3 (uniquement pour les images): Isoler l'analyse EXIF.
            if (mediaType === 'image') {
                 // Nous créons une image en mémoire pour que exif-js l'analyse,
                 // sans jamais lui donner accès au fichier ou au buffer original.
                const blob = new Blob([buffer], { type: file.type });
                const tempUrl = URL.createObjectURL(blob);
                const img = document.createElement('img');

                img.onload = () => {
                    EXIF.getData(img, function(this: any) {
                        const lat = EXIF.getTag(this, "GPSLatitude");
                        const lon = EXIF.getTag(this, "GPSLongitude");
                        const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                        const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

                        if (lat && lon && latRef && lonRef) {
                            const latitude = toDecimal(lat, latRef);
                            const longitude = toDecimal(lon, lonRef);
                            onUpdate(point.id, { latitude, longitude });
                        } else {
                            alert("Aucune donnée GPS trouvée dans l'image. Veuillez positionner le point manuellement sur la carte.");
                        }
                        // Nettoyer l'URL temporaire après utilisation
                        URL.revokeObjectURL(tempUrl);
                    });
                };

                img.onerror = () => {
                    alert("Erreur lors de la lecture de l'image pour l'analyse GPS.");
                    // Nettoyer l'URL temporaire en cas d'erreur
                    URL.revokeObjectURL(tempUrl);
                };
                
                img.src = tempUrl;
            }
        } catch (error) {
            console.error(`Erreur de lecture du fichier ${mediaType}:`, error);
            alert(`Impossible de lire le fichier ${alertType}.`);
            input.value = '';
            onUpdate(point.id, { [mediaType]: null });
        }
    };
    
    const handleCoordsChange = (newCoords: { lat: number; lng: number }) => {
        onUpdate(point.id, { latitude: newCoords.lat, longitude: newCoords.lng });
    };

    return (
        <div className={`point-card ${isValid ? 'point-card--valid' : 'point-card--invalid'}`} aria-labelledby={`point-title-${point.id}`}>
            <div className="point-header">
                <h2 id={`point-title-${point.id}`}>Point #{point.id}</h2>
                <button 
                    className="btn-danger" 
                    onClick={() => onDelete(point.id)}
                    aria-label={`Supprimer le point ${point.id}`}
                >
                    Supprimer
                </button>
            </div>
             {!isValid && (
                <div className="validation-errors">
                    <p>Champs obligatoires manquants :</p>
                    <ul>
                        {point.title.trim() === '' && <li>Titre du point</li>}
                        {(point.latitude === null || point.longitude === null) && <li>Coordonnées GPS</li>}
                    </ul>
                </div>
            )}
            <div className="form-group">
                <label htmlFor={`title-${point.id}`}>Titre du point (1-30 caractères)</label>
                <input
                    type="text"
                    id={`title-${point.id}`}
                    value={point.title}
                    onChange={(e) => onUpdate(point.id, { title: e.target.value })}
                    maxLength={30}
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor={`image-${point.id}`}>Image (JPEG, max 20Mo)</label>
                <input type="file" id={`image-${point.id}`} accept="image/jpeg" onChange={(e) => handleFileChange(e, 'image', 'image/jpeg', 'JPEG')} />
                {imagePreviewUrl && <img src={imagePreviewUrl} alt="Aperçu de l'image" className="media-preview" />}
            </div>
            <div className="coords-section">
                <div className="form-group">
                    <label>Coordonnées GPS</label>
                    <div className="coords-display">{formatCoords(point.latitude, point.longitude)}</div>
                     <MapComponent 
                        pointId={point.id}
                        latitude={point.latitude}
                        longitude={point.longitude}
                        onCoordsChange={handleCoordsChange}
                    />
                </div>
            </div>
             <div className="form-group">
                <label htmlFor={`video-${point.id}`}>Vidéo (MP4, max 20Mo)</label>
                <input type="file" id={`video-${point.id}`} accept="video/mp4" onChange={(e) => handleFileChange(e, 'video', 'video/mp4', 'MP4')}/>
                {videoPreviewUrl && <video src={videoPreviewUrl} controls className="media-preview"></video>}
            </div>
            <div className="form-group">
                <label htmlFor={`audio-${point.id}`}>Audio (MP3, max 20Mo)</label>
                <input type="file" id={`audio-${point.id}`} accept="audio/mpeg" onChange={(e) => handleFileChange(e, 'audio', 'audio/mpeg', 'MP3')}/>
                {audioPreviewUrl && <audio src={audioPreviewUrl} controls preload="metadata" className="media-preview"></audio>}
            </div>
            <div className="form-group">
                <label htmlFor={`comment-${point.id}`}>Commentaire</label>
                <textarea 
                    id={`comment-${point.id}`} 
                    rows={4}
                    value={point.comment}
                    onChange={(e) => onUpdate(point.id, { comment: e.target.value })}
                ></textarea>
            </div>
        </div>
    );
};

const App = () => {
    const [visitTitle, setVisitTitle] = useState('');
    const [points, setPoints] = useState<PointData[]>([]);
    const [nextPointId, setNextPointId] = useState(1);
    const [isVisitValidated, setIsVisitValidated] = useState(false);

    const validatePoint = (point: PointData) => {
        return point.title.trim() !== '' && point.latitude !== null && point.longitude !== null;
    };

    const isReadyForValidation = useMemo(() => {
        const allPointsValid = points.length > 0 && points.every(validatePoint);
        const titleValid = visitTitle.trim() !== '';
        return allPointsValid && titleValid;
    }, [points, visitTitle]);

    // Si l'utilisateur modifie les données, il doit re-valider
    useEffect(() => {
        setIsVisitValidated(false);
    }, [points, visitTitle]);

    const handleValidate = () => {
        if (isReadyForValidation) {
            setIsVisitValidated(true);
            alert("Visite validée ! Vous pouvez maintenant exporter.");
        } else {
            alert("La visite n'est pas prête pour la validation. Vérifiez le titre de la visite et que tous les points sont complets.");
        }
    };

    const addPoint = () => {
        if (points.length >= 99) {
            alert("Vous ne pouvez pas ajouter plus de 99 points.");
            return;
        }
        const newPoint: PointData = { 
            id: nextPointId, 
            title: '',
            latitude: null,
            longitude: null,
            image: null,
            video: null,
            audio: null,
            comment: '',
        };
        setPoints([...points, newPoint]);
        setNextPointId(nextPointId + 1);
    };

    const deletePoint = (id: number) => {
        setPoints(prevPoints => prevPoints.filter(point => point.id !== id));
    };
    
    const updatePoint = (id: number, updatedData: Partial<PointData>) => {
        setPoints(prevPoints => prevPoints.map(p => p.id === id ? { ...p, ...updatedData } : p));
    };

    const handleExport = async () => {
        if (!isVisitValidated) {
            alert("Veuillez valider la visite avant d'exporter.");
            return;
        }
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder("data");
            if (!dataFolder) throw new Error("Impossible de créer le dossier data.");

            const visitStructure = [];

            for (const point of points) {
                const pointFolder = dataFolder.folder(point.id.toString());
                if (!pointFolder) throw new Error(`Impossible de créer le dossier pour le point ${point.id}.`);
                
                const pointInfo: any = {
                    id: point.id,
                    folder: point.id.toString(),
                };

                pointFolder.file("Titre.txt", point.title);
                pointInfo.titleFile = "Titre.txt";
                
                pointFolder.file("Localisation.txt", formatCoords(point.latitude, point.longitude));
                pointInfo.locationFile = "Localisation.txt";

                if (point.comment) {
                    pointFolder.file("Commentaire.txt", point.comment);
                    pointInfo.commentFile = "Commentaire.txt";
                }

                if (point.image) {
                    pointFolder.file(point.image.name, point.image.buffer);
                    pointInfo.image = point.image.name;
                }
                if (point.video) {
                    pointFolder.file(point.video.name, point.video.buffer);
                    pointInfo.video = point.video.name;
                }
                if (point.audio) {
                    pointFolder.file(point.audio.name, point.audio.buffer);
                    pointInfo.audio = point.audio.name;
                }

                visitStructure.push(pointInfo);
            }

            zip.file("visit.json", JSON.stringify(visitStructure, null, 2));

            const content = await zip.generateAsync({ type: "blob" });
            
            const link = document.createElement('a');
            const sanitizedTitle = visitTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${sanitizedTitle || 'visite'}.zip`;
            link.href = URL.createObjectURL(content);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("L'export a échoué:", error);
            alert("Une erreur inattendue est survenue lors de la préparation de l'export.");
        }
    };

    return (
        <>
            <header>
                <h1>Visite de Site - Editeur</h1>
            </header>
            <main>
                <section className="visit-title-section">
                    <label htmlFor="visit-title">Titre de la visite (obligatoire)</label>
                    <input
                        type="text"
                        id="visit-title"
                        value={visitTitle}
                        onChange={(e) => setVisitTitle(e.target.value)}
                        placeholder="Ex: Tour des châteaux de la Loire"
                        required
                    />
                </section>

                <div className="controls">
                    <span className="point-counter">
                        {points.length} / 99 Points
                    </span>
                    <button className="btn-primary" onClick={addPoint}>
                        Ajouter un point
                    </button>
                    {!isVisitValidated ? (
                        <button className="btn-validate" disabled={!isReadyForValidation} onClick={handleValidate}>
                            Valider la visite
                        </button>
                    ) : (
                        <button className="btn-export" onClick={handleExport}>
                            Exporter (.zip)
                        </button>
                    )}
                </div>

                <div className="points-list">
                    {points.map(point => (
                        <Point 
                            key={point.id} 
                            point={point} 
                            onDelete={deletePoint} 
                            onUpdate={updatePoint}
                            isValid={validatePoint(point)}
                        />
                    ))}
                </div>
            </main>
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
