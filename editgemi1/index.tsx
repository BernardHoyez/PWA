// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// Déclaration des variables globales des bibliothèques externes
declare const L: any;
declare const JSZip: any;
declare const ExifReader: any;

// --- Interfaces ---
interface POI {
  id: number;
  titre: string;
  localisation: string;
  commentaire: string;
  image?: File | { name: string; type: string; content: ArrayBuffer };
  video?: File | { name: string; type: string; content: ArrayBuffer };
  audio?: File | { name: string; type: string; content: ArrayBuffer };
}

// --- Fonctions utilitaires ---
const generateVideoThumbnail = (videoSource: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const videoUrl = URL.createObjectURL(videoSource);
        video.src = videoUrl;
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.preload = "metadata";

        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration / 2 || 0);
        };

        video.onseeked = () => {
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                if (context) {
                    try {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg');
                        URL.revokeObjectURL(videoUrl);
                        video.remove();
                        resolve(dataUrl);
                    } catch (e) {
                        URL.revokeObjectURL(videoUrl);
                        video.remove();
                        reject(new Error(`Erreur Canvas: ${e}`));
                    }
                } else {
                    URL.revokeObjectURL(videoUrl);
                    video.remove();
                    reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
                }
            }, 50);
        };

        video.onerror = (e) => {
            console.error("Erreur lors du chargement de la vidéo pour la vignette.", e);
            URL.revokeObjectURL(videoUrl);
            video.remove();
            reject(new Error('Erreur lors du chargement de la vidéo pour la vignette.'));
        };
    });
};


// --- Composants ---

const StartupModal = ({ onStart, onImport }) => {
  const [visitName, setVisitName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => {
    if (visitName.trim()) {
      onStart(visitName.trim());
    } else {
      alert('Veuillez donner un nom à votre visite.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2 className="modal-header">Bienvenue sur editgemi</h2>
        <div className="modal-body">
          <label htmlFor="visitName">Nom de la visite :</label>
          <input
            id="visitName"
            type="text"
            className="input-field"
            value={visitName}
            onChange={(e) => setVisitName(e.target.value)}
            placeholder="Ex: Visite du vieux port"
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>
        <div className="modal-actions">
           <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".zip" />
           <button onClick={handleImportClick} className="btn-secondary">Importer une visite (.zip)</button>
           <button onClick={handleStart} className="btn-primary">Commencer</button>
        </div>
      </div>
    </div>
  );
};

const ImagePreviewModal = ({ imageUrl, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="media-preview-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="media-preview-modal-content" onClick={(e) => e.stopPropagation()}>
                <img src={imageUrl} alt="Aperçu agrandi" />
                <button onClick={onClose} className="btn-close-preview" aria-label="Fermer l'aperçu">&times;</button>
            </div>
        </div>
    );
};

const VideoPreviewModal = ({ videoUrl, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="media-preview-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="media-preview-modal-content" onClick={(e) => e.stopPropagation()}>
                <video src={videoUrl} controls autoPlay>
                    Votre navigateur ne supporte pas la balise vidéo.
                </video>
                <button onClick={onClose} className="btn-close-preview" aria-label="Fermer l'aperçu">&times;</button>
            </div>
        </div>
    );
};


const POIForm = ({ poi: initialPoi, onSave, onCancel, onLocationChange, onOpenMap }) => {
    const [poi, setPoi] = useState(initialPoi);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
    const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);
    const [isVideoPreviewModalOpen, setIsVideoPreviewModalOpen] = useState(false);
    
    useEffect(() => {
        // Synchronise la localisation si elle est mise à jour depuis le parent (carte ou EXIF)
        if (initialPoi.localisation !== poi.localisation) {
            setPoi(prev => ({ ...prev, localisation: initialPoi.localisation }));
        }
    }, [initialPoi.localisation, poi.localisation]);

    useEffect(() => {
        const currentImage = poi.image;
        if (currentImage && currentImage instanceof File) {
            const url = URL.createObjectURL(currentImage);
            setImagePreview(url);
        } else if (typeof currentImage === 'object' && currentImage?.content) {
            const blob = new Blob([currentImage.content], { type: currentImage.type });
            const url = URL.createObjectURL(blob);
            setImagePreview(url);
        } else {
            setImagePreview(null);
        }
    }, [poi.image]);

    useEffect(() => {
        const currentAudio = poi.audio;
        if (currentAudio && currentAudio instanceof File) {
            const url = URL.createObjectURL(currentAudio);
            setAudioPreview(url);
        } else if (typeof currentAudio === 'object' && currentAudio?.content) {
            const blob = new Blob([currentAudio.content], { type: currentAudio.type });
            const url = URL.createObjectURL(blob);
            setAudioPreview(url);
        } else {
            setAudioPreview(null);
        }
    }, [poi.audio]);

    useEffect(() => {
        const currentVideo = poi.video;
        let objectUrlForPlayer: string | null = null;
        let isMounted = true;

        const setupVideoPreviews = async () => {
            if (!isMounted) return;

            if (!currentVideo) {
                setVideoPreview(null);
                setVideoThumbnail(null);
                return;
            }

            let videoSource: File | Blob | undefined;
            if (currentVideo instanceof File) {
                videoSource = currentVideo;
            } else if (typeof currentVideo === 'object' && currentVideo.content) {
                videoSource = new Blob([currentVideo.content], { type: currentVideo.type });
            }
            
            if (!videoSource) return;

            objectUrlForPlayer = URL.createObjectURL(videoSource);
            setVideoPreview(objectUrlForPlayer);

            try {
                const thumb = await generateVideoThumbnail(videoSource);
                if(isMounted) {
                    setVideoThumbnail(thumb);
                }
            } catch (error) {
                console.error("Failed to generate video thumbnail in form:", error);
                if(isMounted) {
                   setVideoThumbnail(null); 
                }
            }
        };
        
        setupVideoPreviews();
        
        return () => {
            isMounted = false;
            if (objectUrlForPlayer) {
                URL.revokeObjectURL(objectUrlForPlayer);
            }
        };
    }, [poi.video]);
    
    const handleChange = (field, value) => {
        if (field === 'localisation') {
            onLocationChange(value);
        } else {
            setPoi(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleFileChange = async (field, file) => {
        if (!file) {
            setPoi(prev => ({ ...prev, [field]: undefined }));
            return;
        }

        setPoi(prev => ({ ...prev, [field]: file }));

        if (field === 'image') {
            try {
                const tags = await ExifReader.load(file);
                if (tags.GPSLatitude && tags.GPSLongitude) {
                    const lat = tags.GPSLatitude.description;
                    const lon = tags.GPSLongitude.description;
                    const latRef = tags.GPSLatitudeRef.value[0] === 'N' ? 'N' : 'S';
                    const lonRef = tags.GPSLongitudeRef.value[0] === 'E' ? 'E' : 'W';
                    const newLocation = `${lat.toFixed(5)}${latRef}, ${lon.toFixed(5)}${lonRef}`;
                    onLocationChange(newLocation);
                }
            } catch (error) {
                console.warn("Could not read EXIF data from image.", error);
            }
        }
    };
    
    const isValid = poi.titre && poi.localisation;

    return (
        <>
            <div className="modal-backdrop">
                <div className="modal-content poi-form">
                    <h2 className="modal-header">{poi.id ? 'Modifier le POI' : 'Nouveau POI'}</h2>
                    <div className="modal-body">
                        <label>Titre (obligatoire)</label>
                        <input type="text" className="input-field" value={poi.titre} onChange={(e) => handleChange('titre', e.target.value)} />

                        <label>Localisation (obligatoire)</label>
                        <div className="location-input">
                            <input type="text" className="input-field" value={poi.localisation} onChange={(e) => handleChange('localisation', e.target.value)} />
                            <button onClick={() => onOpenMap(poi.localisation)} className="btn-secondary">Carte</button>
                        </div>

                        <label>Commentaire</label>
                        <textarea className="input-field" value={poi.commentaire} onChange={(e) => handleChange('commentaire', e.target.value)} rows="4"></textarea>

                        <div className="file-inputs">
                            <div>
                                <label>Image (JPEG)</label>
                                <input type="file" accept="image/jpeg" onChange={(e) => handleFileChange('image', e.target.files?.[0])} />
                                {imagePreview && (
                                    <img 
                                        src={imagePreview} 
                                        alt="Aperçu" 
                                        className="image-preview clickable" 
                                        title="Cliquez pour agrandir"
                                        onClick={() => setIsImagePreviewModalOpen(true)}
                                    />
                                )}
                            </div>
                            <div>
                                <label>Vidéo (MP4)</label>
                                <input type="file" accept="video/mp4" onChange={(e) => handleFileChange('video', e.target.files?.[0])} />
                                {videoThumbnail && (
                                    <img 
                                        src={videoThumbnail} 
                                        alt="Aperçu vidéo" 
                                        className="image-preview clickable" 
                                        title="Cliquez pour voir la vidéo"
                                        onClick={() => setIsVideoPreviewModalOpen(true)}
                                    />
                                )}
                            </div>
                            <div>
                                <label>Commentaire audio (MP3)</label>
                                <input type="file" accept="audio/mpeg" onChange={(e) => handleFileChange('audio', e.target.files?.[0])} />
                                {audioPreview && <audio controls src={audioPreview} className="audio-preview">Votre navigateur ne supporte pas l'élément audio.</audio>}
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button onClick={onCancel} className="btn-secondary">Annuler</button>
                        <button onClick={() => onSave(poi)} disabled={!isValid} className="btn-primary">Valider</button>
                    </div>
                </div>
            </div>
            {isImagePreviewModalOpen && imagePreview && (
                <ImagePreviewModal imageUrl={imagePreview} onClose={() => setIsImagePreviewModalOpen(false)} />
            )}
            {isVideoPreviewModalOpen && videoPreview && (
                <VideoPreviewModal videoUrl={videoPreview} onClose={() => setIsVideoPreviewModalOpen(false)} />
            )}
        </>
    );
};


const MapModal = ({ initialLocation, onSelect, onClose }) => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapContainerRef = useRef(null);

    const parseCoords = (locStr) => {
        if (!locStr || typeof locStr !== 'string') return null;
        const match = locStr.match(/(\d+\.?\d*)\s*([NS]),?\s*(\d+\.?\d*)\s*([EW])/i);
        if (match) {
            let lat = parseFloat(match[1]);
            const latDir = match[2].toUpperCase();
            let lon = parseFloat(match[3]);
            const lonDir = match[4].toUpperCase();

            if (latDir === 'S') lat = -lat;
            if (lonDir === 'W') lon = -lon;
            
            return [lat, lon];
        }
        return null;
    };

    useEffect(() => {
        const coords = parseCoords(initialLocation) || [48.8566, 2.3522]; // Default to Paris

        if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView(coords, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
            markerRef.current = L.marker(coords, { draggable: true }).addTo(mapRef.current);

            markerRef.current.on('dragend', (event) => {
                const { lat, lng } = event.target.getLatLng();
                const newLoc = `${Math.abs(lat).toFixed(5)}${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}${lng >= 0 ? 'E' : 'W'}`;
                onSelect(newLoc); 
            });
        } else {
             mapRef.current.setView(coords, 13);
             markerRef.current.setLatLng(coords);
        }

        // Invalidate size to ensure map tiles render correctly
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 100);

    }, [initialLocation, onSelect]);

    const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng(e.latlng);
        const newLoc = `${Math.abs(lat).toFixed(5)}${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(5)}${lng >= 0 ? 'E' : 'W'}`;
        onSelect(newLoc);
    };

    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.on('click', handleMapClick);
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.off('click', handleMapClick);
            }
        };
    }, [onSelect]);
    
    return (
        <div className="modal-backdrop">
            <div className="modal-content map-modal">
                <h3 className="modal-header">Sélectionner une localisation</h3>
                <div id="map" ref={mapContainerRef} style={{ height: '100%', width: '100%', flexGrow: 1, zIndex: 1 }}></div>
                 <div className="modal-actions">
                    <button onClick={onClose} className="btn-primary">Valider</button>
                </div>
            </div>
        </div>
    );
};

const POICard = React.memo(({ poi, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let objectUrlToRevoke: string | null = null;

        const createThumbnail = async () => {
            if (isMounted) setThumbnailUrl(null);

            // Prioritize image
            if (poi.image) {
                let imageSource: File | Blob | undefined;
                if (poi.image instanceof File) {
                    imageSource = poi.image;
                } else if (typeof poi.image === 'object' && poi.image.content) {
                    imageSource = new Blob([poi.image.content], { type: poi.image.type });
                }

                if (imageSource) {
                    const url = URL.createObjectURL(imageSource);
                    objectUrlToRevoke = url;
                    if (isMounted) {
                        setThumbnailUrl(url);
                    }
                }
            } 
            // Then video
            else if (poi.video) {
                let videoSource: File | Blob | undefined;
                if (poi.video instanceof File) {
                    videoSource = poi.video;
                } else if (typeof poi.video === 'object' && poi.video.content) {
                    videoSource = new Blob([poi.video.content], { type: poi.video.type });
                }
                
                if (videoSource) {
                    try {
                        const thumbnailUrlData = await generateVideoThumbnail(videoSource);
                        if (isMounted) {
                            setThumbnailUrl(thumbnailUrlData);
                        }
                    } catch (error) {
                        console.error("Failed to generate video thumbnail for POI card:", error);
                    }
                }
            }
        };

        createThumbnail();

        return () => {
            isMounted = false;
            if (objectUrlToRevoke) {
                URL.revokeObjectURL(objectUrlToRevoke);
            }
        };
    }, [poi.image, poi.video]);

    return (
        <div 
            className={`poi-card ${isDragging ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, poi.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, poi.id)}
            onDragEnd={onDragEnd}
        >
            {thumbnailUrl && <img src={thumbnailUrl} alt="Aperçu POI" className="poi-card-thumbnail" />}
            <span className="poi-title">{poi.titre}</span>
            <div className="poi-actions">
                <button onClick={() => onEdit(poi)} className="btn-secondary">Modifier</button>
                <button onClick={() => onDelete(poi.id)} className="btn-danger">Supprimer</button>
            </div>
        </div>
    );
});


const App = () => {
    const [visitName, setVisitName] = useState<string | null>(null);
    const [pois, setPois] = useState<POI[]>([]);
    const [editingPOI, setEditingPOI] = useState<POI | null>(null);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<number | null>(null);

    const handleStartVisit = (name: string) => {
        setVisitName(name);
    };

    const handleAddPOI = () => {
        setEditingPOI({
            id: Date.now(),
            titre: '',
            localisation: '',
            commentaire: '',
        });
    };

    const handleSavePOI = (poiToSave: POI) => {
        const exists = pois.some(p => p.id === poiToSave.id);
        if (exists) {
            setPois(pois.map(p => p.id === poiToSave.id ? poiToSave : p));
        } else {
            setPois([...pois, poiToSave]);
        }
        setEditingPOI(null);
    };
    
    const handleEditPOI = (poi: POI) => {
        setEditingPOI({ ...poi });
    };

    const handleDeletePOI = (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce POI ?')) {
            setPois(pois.filter(p => p.id !== id));
        }
    };
    
    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const dataFolder = zip.folder("data");

        const visitData = {
            visitName: visitName,
            pois: [] as any[]
        };

        for (let i = 0; i < pois.length; i++) {
            const poi = pois[i];
            const poiFolder = dataFolder.folder((i + 1).toString());
            
            const poiJsonData: any = { 
                id: i + 1,
                localisation: poi.localisation
            };

            if (poi.titre) {
                poiFolder.file("titre.txt", poi.titre);
                poiJsonData.titre = "titre.txt";
            }
            if (poi.commentaire) {
                poiFolder.file("commentaire.txt", poi.commentaire);
                poiJsonData.commentaire = "commentaire.txt";
            }

            const readFileAsArrayBuffer = (file: File) => {
                return new Promise<ArrayBuffer>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as ArrayBuffer);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
            };

            if (poi.image) {
                const content = poi.image instanceof File ? await readFileAsArrayBuffer(poi.image) : poi.image.content;
                const fileName = poi.image instanceof File ? poi.image.name : poi.image.name;
                poiFolder.file(fileName, content);
                poiJsonData.image = fileName;
            }
             if (poi.video) {
                const content = poi.video instanceof File ? await readFileAsArrayBuffer(poi.video) : poi.video.content;
                const fileName = poi.video instanceof File ? poi.video.name : poi.video.name;
                poiFolder.file(fileName, content);
                poiJsonData.video = fileName;
            }
            if (poi.audio) {
                const content = poi.audio instanceof File ? await readFileAsArrayBuffer(poi.audio) : poi.audio.content;
                const fileName = poi.audio instanceof File ? poi.audio.name : poi.audio.name;
                poiFolder.file(fileName, content);
                poiJsonData.audio = fileName;
            }
            visitData.pois.push(poiJsonData);
        }

        zip.file("visit.json", JSON.stringify(visitData, null, 2));

        zip.generateAsync({ type: "blob" }).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${visitName || 'visite'}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const handleImportZip = async (file: File) => {
        try {
            const zip = await JSZip.loadAsync(file);
            const visitJsonFile = zip.file("visit.json");
            if (!visitJsonFile) {
                throw new Error("Fichier visit.json manquant dans le zip.");
            }
            const visitJsonContent = await visitJsonFile.async("string");
            const visitData = JSON.parse(visitJsonContent);

            const importedPois: POI[] = [];
            for (const poiData of visitData.pois) {
                const poiFolder = zip.folder(`data/${poiData.id}`);
                if (poiFolder) {
                    const { localisation } = poiData;

                    const newPoi: POI = { 
                        id: Date.now() + Math.random(), 
                        titre: '', 
                        localisation: localisation ?? '', 
                        commentaire: '' 
                    };

                    const readTextFile = async (fileName: string) => {
                        const fileInZip = poiFolder.file(fileName);
                        return fileInZip ? await fileInZip.async("string") : "";
                    };

                    const readMediaFile = async (fileName: string) => {
                        const fileInZip = poiFolder.file(fileName);
                        if (!fileInZip) return undefined;
                        const content = await fileInZip.async("arraybuffer");
                        const type = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
                                     fileName.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg';
                        return { name: fileName, type, content };
                    };
                    
                    if (poiData.titre) newPoi.titre = await readTextFile(poiData.titre);
                    if (poiData.commentaire) newPoi.commentaire = await readTextFile(poiData.commentaire);
                    if (poiData.image) newPoi.image = await readMediaFile(poiData.image);
                    if (poiData.video) newPoi.video = await readMediaFile(poiData.video);
                    if (poiData.audio) newPoi.audio = await readMediaFile(poiData.audio);

                    importedPois.push(newPoi);
                }
            }
            setVisitName(visitData.visitName);
            setPois(importedPois);
        } catch (error) {
            console.error("Erreur lors de l'importation du zip:", error);
            alert("Erreur lors de l'importation du fichier zip. Assurez-vous qu'il s'agit d'un fichier de visite valide.");
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
        setActiveDragId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: number) => {
        e.preventDefault();
        if (activeDragId === null || activeDragId === targetId) {
            setActiveDragId(null);
            return;
        }

        const activeIndex = pois.findIndex(p => p.id === activeDragId);
        const targetIndex = pois.findIndex(p => p.id === targetId);
        
        const newPois = [...pois];
        const [draggedItem] = newPois.splice(activeIndex, 1);
        newPois.splice(targetIndex, 0, draggedItem);
        
        setPois(newPois);
        setActiveDragId(null);
    };

    const handleDragEnd = () => {
        setActiveDragId(null);
    };
    
    // --- Map and Location Handlers ---
    const handleOpenMap = (location: string) => {
        if(editingPOI) {
            setEditingPOI(prev => ({...prev, localisation: location }));
        }
        setIsMapOpen(true);
    };

    const handleLocationChange = (newLocation: string) => {
        if (editingPOI) {
            setEditingPOI(prev => ({...prev, localisation: newLocation}));
        }
    };

    if (!visitName) {
        return <StartupModal onStart={handleStartVisit} onImport={handleImportZip} />;
    }

    return (
        <div className="app-container">
            <header>
                <h1>{visitName}</h1>
                <button onClick={handleDownloadZip} className="btn-primary">Exporter la visite (zip)</button>
            </header>
            <main>
                <div className="poi-list">
                    {pois.map(poi => (
                       <POICard
                            key={poi.id}
                            poi={poi}
                            onEdit={handleEditPOI}
                            onDelete={handleDeletePOI}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isDragging={activeDragId === poi.id}
                        />
                    ))}
                </div>
                <button onClick={handleAddPOI} className="btn-primary btn-add-poi">+ Ajouter un POI</button>
            </main>
            {editingPOI && (
                <POIForm
                    key={editingPOI.id}
                    poi={editingPOI} 
                    onSave={handleSavePOI} 
                    onCancel={() => setEditingPOI(null)}
                    onLocationChange={handleLocationChange}
                    onOpenMap={handleOpenMap}
                />
            )}
            {isMapOpen && editingPOI && (
                <MapModal
                    initialLocation={editingPOI.localisation}
                    onSelect={handleLocationChange}
                    onClose={() => setIsMapOpen(false)}
                />
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}