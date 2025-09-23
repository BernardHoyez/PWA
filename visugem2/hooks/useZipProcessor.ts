import { useState, useCallback, useEffect } from 'react';
import type { Visit, MediaData, ProcessedData } from '../types';

declare const JSZip: any;

export const useZipProcessor = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);

  const clearData = useCallback(() => {
    if (processedData) {
      processedData.objectUrls.forEach(url => URL.revokeObjectURL(url));
    }
    setProcessedData(null);
    setError(null);
  }, [processedData]);
  
  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (processedData) {
        processedData.objectUrls.forEach(url => URL.revokeObjectURL(url));
      }
    };
  }, [processedData]);

  const processZip = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setProcessedData(null);

    try {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded. Please check your internet connection.');
      }
      
      const zip = await JSZip.loadAsync(file);
      const visitFile = zip.file('visit.json');

      if (!visitFile) {
        throw new Error('visit.json not found in the ZIP archive.');
      }

      const visitContent = await visitFile.async('string');
      const visit: Visit = JSON.parse(visitContent);
      const mediaData: MediaData = {};
      const objectUrls: string[] = [];
      
      const mediaPromises = visit.pois.map(async (poi) => {
        mediaData[poi.id] = { image: null, video: null, audio: null };
        const poiFolder = zip.folder(`data/${poi.id}`);

        if (poiFolder) {
          const filePromises: Promise<void>[] = [];
          poiFolder.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
              const promise = (async () => {
                const blob = await zipEntry.async('blob');
                const url = URL.createObjectURL(blob);
                objectUrls.push(url);

                const lowerCaseName = relativePath.toLowerCase();
                if (lowerCaseName.endsWith('.jpg') || lowerCaseName.endsWith('.jpeg') || lowerCaseName.endsWith('.png') || lowerCaseName.endsWith('.gif')) {
                  mediaData[poi.id].image = url;
                } else if (lowerCaseName.endsWith('.mp4') || lowerCaseName.endsWith('.webm') || lowerCaseName.endsWith('.ogv')) {
                  mediaData[poi.id].video = url;
                } else if (lowerCaseName.endsWith('.mp3') || lowerCaseName.endsWith('.wav') || lowerCaseName.endsWith('.ogg')) {
                  mediaData[poi.id].audio = url;
                }
              })();
              filePromises.push(promise);
            }
          });
          await Promise.all(filePromises);
        }
      });

      await Promise.all(mediaPromises);
      
      setProcessedData({ visit, mediaData, objectUrls });
    } catch (e) {
        if (e instanceof Error) {
            setError(`Failed to process ZIP file: ${e.message}`);
        } else {
            setError('An unknown error occurred while processing the ZIP file.');
        }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { processZip, isLoading, error, processedData, clearData };
};