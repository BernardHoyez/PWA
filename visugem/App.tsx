import React, { useEffect } from 'react';
import { useZipProcessor } from './hooks/useZipProcessor';
import { FileUpload } from './components/FileUpload';
import { MapDisplay } from './components/MapDisplay';

function App() {
  const { processedData, isLoading, error, processZipFile, cleanup } = useZipProcessor();

  useEffect(() => {
    // Cleanup object URLs when the component unmounts
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <header className="w-full max-w-5xl text-center my-8">
        <h1 className="text-4xl font-bold text-sky-600">VisuGem</h1>
        <p className="text-gray-600 mt-2">Visualize your geo-tagged memories from a zip file.</p>
      </header>
      <main className="w-full max-w-5xl bg-white rounded-lg shadow-xl p-6">
        {processedData ? (
          <MapDisplay data={processedData} />
        ) : (
          <FileUpload onFileUpload={processZipFile} isLoading={isLoading} error={error} />
        )}
      </main>
      <footer className="w-full max-w-5xl text-center mt-8 text-gray-500 text-sm">
        <p>Powered by VisuGem Explorer</p>
      </footer>
    </div>
  );
}

export default App;
