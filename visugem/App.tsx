import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { MapDisplay } from './components/MapDisplay';
import { Spinner } from './components/Spinner';
import { useZipProcessor } from './hooks/useZipProcessor';

const App = () => {
  const { processZip, isLoading, error, processedData, clearData } = useZipProcessor();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (err) => {
          console.error(`Geolocation error: ${err.message}`);
          setLocationError(`Location access denied or unavailable. Please enable location services. (${err.code})`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleFileSelect = (file: File) => {
    clearData();
    processZip(file);
  };

  const handleReset = () => {
    clearData();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-lg p-4">
          <Spinner />
          <p className="mt-4">Processing your visit file...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="text-center bg-red-900/50 border border-red-700 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-red-400 mb-2">An Error Occurred</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (processedData) {
      return <MapDisplay processedData={processedData} userLocation={userLocation} />;
    }

    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8">
        <FileUpload onFileSelect={handleFileSelect} />
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-800/50 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-10 sticky top-0">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
          Visugem
        </h1>
        {processedData && (
            <button
                onClick={handleReset}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
                Load New Visit
            </button>
        )}
      </header>

      <main className="flex-grow flex flex-col relative">
        {locationError && !processedData && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-900/70 border border-yellow-700 text-yellow-300 text-xs px-4 py-2 rounded-lg shadow-lg z-20">
            {locationError}
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;