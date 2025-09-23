import React, { useState, useEffect } from 'react';
import { useZipProcessor } from './hooks/useZipProcessor';
import { FileUpload } from './components/FileUpload';
import { MapDisplay } from './components/MapDisplay';
import { Spinner } from './components/Spinner';

// Type pour la position de l'utilisateur
type UserPosition = { lat: number; lng: number };

function App() {
  const { processedData, isLoading, error, processZipFile, cleanup } = useZipProcessor();
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    // Nettoyage des URLs lorsque le composant est démonté
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (processedData) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeoError(null);
        },
        (err) => {
          console.error("Erreur de géolocalisation : ", err);
          setGeoError(`Erreur GPS : ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [processedData]);


  const renderContent = () => {
    if (processedData) {
      return (
        <>
          <MapDisplay data={processedData} userPosition={userPosition} />
          {geoError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white p-2 rounded-lg shadow-lg z-[1000]">
              {geoError}
            </div>
          )}
          <button
            onClick={cleanup}
            className="absolute top-4 right-4 z-[1000] bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
          >
            Charger un autre fichier
          </button>
        </>
      );
    }

    if (isLoading) {
       return (
        <div className="flex flex-col items-center justify-center text-center">
            <Spinner />
            <p className="mt-4 text-lg text-slate-300">Traitement du fichier ZIP...</p>
        </div>
       )
    }
    
    return (
        <div className="w-full max-w-2xl mx-auto">
            <header className="w-full text-center mb-8">
                <h1 className="text-5xl font-bold text-sky-400">Visugem</h1>
                <p className="text-slate-400 mt-2">Visualisez vos points d'intérêt géolocalisés à partir d'un fichier ZIP.</p>
            </header>
            <main className="w-full bg-slate-800/50 rounded-lg shadow-2xl p-6 backdrop-blur-sm">
                <FileUpload onFileUpload={processZipFile} isLoading={isLoading} error={error} />
            </main>
        </div>
    );
  }

  return (
    <div className={`relative w-screen ${processedData ? 'h-screen' : 'min-h-screen flex items-center justify-center p-4'}`}>
        {renderContent()}
    </div>
  );
}

export default App;
