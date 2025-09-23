import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Visit, MediaData, ProcessedData, Poi } from '../types';

export const useZipProcessor = () => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processZipFile = async (file: File) => {
    // Reset state before processing
    if (processedData) {
      cleanup();
    }
    setIsLoading(true);
    setError(null);
    setProcessedData(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const visitFile = zip.file('visit.json');
      if (!visitFile) {
        throw new Error("Le fichier 'visit.json' est introuvable dans l'archive ZIP.");
      }
      const visitContent = await visitFile.async('string');
      const visit: Visit = JSON.parse(visitContent);

      const mediaData: MediaData = {};
      const objectUrls: { [key: string]: string } = {};

      const allPois = visit.pois || [];

      for (const poi of allPois) {
        mediaData[poi.id] = { image: null, video: null, audio: null };
        
        const processMedia = async (poiItem: Poi, type: 'image' | 'video' | 'audio', extension: string) => {
            if (poiItem[type]) {
                const dataFolder = zip.folder('data');
                if (!dataFolder) {
                    console.warn("Le dossier 'data' est introuvable dans l'archive ZIP.");
                    return;
                }
                const poiFolder = dataFolder.folder(String(poiItem.id));
                 if (!poiFolder) {
                    console.warn(`Dossier pour POI ${poiItem.id} introuvable.`);
                    return;
                }
                
                // Chercher le fichier media (ex: 1.jpg, 1.mp4)
                const mediaFile = poiFolder.file(new RegExp(`\\.${extension}$`, 'i'));

                if (mediaFile.length > 0) {
                    const fileInZip = mediaFile[0];
                    const blob = await fileInZip.async('blob');
                    const url = URL.createObjectURL(blob);
                    const fileName = fileInZip.name;
                    objectUrls[fileName] = url;
                    mediaData[poiItem.id][type] = url;
                } else {
                    console.warn(`Fichier .${extension} non trouvé pour le POI ${poiItem.id}`);
                }
            }
        };

        const mediaPromises: Promise<void>[] = [];
        if (poi.image) mediaPromises.push(processMedia(poi, 'image', 'jpg'));
        if (poi.video) mediaPromises.push(processMedia(poi, 'video', 'mp4'));
        if (poi.audio) mediaPromises.push(processMedia(poi, 'audio', 'mp3'));
        
        await Promise.all(mediaPromises);
      }
      
      const allUrls = Object.values(objectUrls);

      setProcessedData({
        visit,
        mediaData,
        objectUrls: allUrls
      });
    } catch (e) {
      if (e instanceof Error) {
        setError(`Échec du traitement du fichier ZIP : ${e.message}`);
      } else {
        setError("Une erreur inconnue est survenue lors du traitement du fichier ZIP.");
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanup = useCallback(() => {
    if (processedData) {
      processedData.objectUrls.forEach(URL.revokeObjectURL);
    }
    setProcessedData(null);
  }, [processedData]);

  return { processedData, isLoading, error, processZipFile, cleanup };
};
