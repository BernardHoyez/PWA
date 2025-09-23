import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Visit, MediaData, ProcessedData, Poi } from '../types';

export const useZipProcessor = () => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processZipFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setProcessedData(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const visitFile = zip.file('visit.json');
      if (!visitFile) {
        throw new Error('visit.json not found in the zip file.');
      }
      const visitContent = await visitFile.async('string');
      const visit: Visit = JSON.parse(visitContent);

      const mediaData: MediaData = {};
      const objectUrls: { [key: string]: string } = {};

      for (const poi of visit.pois) {
        mediaData[poi.id] = { image: null, video: null, audio: null };
        
        const processMedia = async (poi: Poi, type: 'image' | 'video' | 'audio', extension: string) => {
            if (poi[type]) {
                const fileName = `${poi.id}.${extension}`;
                const fileInZip = zip.file(fileName);
                if (fileInZip) {
                    const blob = await fileInZip.async('blob');
                    const url = URL.createObjectURL(blob);
                    objectUrls[fileName] = url;
                    mediaData[poi.id][type] = url;
                } else {
                    console.warn(`${fileName} not found in zip for POI ${poi.id}`);
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
        setError(`Failed to process zip file: ${e.message}`);
      } else {
        setError('An unknown error occurred while processing the zip file.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanup = useCallback(() => {
    if (processedData) {
      processedData.objectUrls.forEach(URL.revokeObjectURL);
      setProcessedData(null);
    }
  }, [processedData]);

  return { processedData, isLoading, error, processZipFile, cleanup };
};
