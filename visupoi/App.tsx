
import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { VisitData, POI, MediaData } from './types';
import FileUpload from './components/FileUpload';
import MapDisplay from './components/MapDisplay';

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
    <p className="mt-4 text-lg text-gray-700">Processing data...</p>
  </div>
);

const App: React.FC = () => {
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processZipFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setVisitData(null);
    setMediaData(null);

    // Clean up old object URLs before creating new ones
    if (mediaData) {
      // FIX: Add explicit type for `media` to resolve 'unknown' type from Object.values.
      Object.values(mediaData).forEach((media: MediaData[keyof MediaData]) => {
        if (media.image) URL.revokeObjectURL(media.image);
        if (media.video) URL.revokeObjectURL(media.video);
        if (media.audio) URL.revokeObjectURL(media.audio);
      });
    }

    try {
      const zip = await JSZip.loadAsync(file);
      const visitFile = zip.file('visit.json');

      if (!visitFile) {
        throw new Error('visit.json not found in the ZIP file.');
      }

      const visitContent = await visitFile.async('string');
      const parsedVisitData = JSON.parse(visitContent) as VisitData;

      const newMediaData: MediaData = {};
      const mediaPromises: Promise<void>[] = [];
      const imageExt = /\.(jpg|jpeg|png|gif|webp)$/i;
      const videoExt = /\.(mp4|webm|ogv)$/i;
      const audioExt = /\.(mp3|wav|ogg|m4a)$/i;
      
      parsedVisitData.pois.forEach((poi: POI) => {
         newMediaData[poi.id] = {};
         const poiFolder = `data/${poi.id}/`;
         zip.folder(poiFolder)?.forEach((relativePath, zipEntry) => {
             const promise = async () => {
                 if (zipEntry.dir) return;
                 const blob = await zipEntry.async('blob');
                 const url = URL.createObjectURL(blob);

                 if (poi.image && imageExt.test(zipEntry.name)) {
                     newMediaData[poi.id].image = url;
                 } else if (poi.video && videoExt.test(zipEntry.name)) {
                     newMediaData[poi.id].video = url;
                 } else if (poi.audio && audioExt.test(zipEntry.name)) {
                     newMediaData[poi.id].audio = url;
                 }
             };
             mediaPromises.push(promise());
         });
      });
      
      await Promise.all(mediaPromises);

      setVisitData(parsedVisitData);
      setMediaData(newMediaData);

    } catch (e: any) {
      setError(`Failed to process ZIP file: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [mediaData]);
  
  const handleReset = () => {
    setVisitData(null);
    setMediaData(null);
    setError(null);
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (visitData && mediaData) {
    return <MapDisplay visitData={visitData} mediaData={mediaData} onReset={handleReset} />;
  }

  return <FileUpload onFileUpload={processZipFile} error={error} />;
};

export default App;
