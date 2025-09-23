import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export const FileUpload = ({ onFileUpload, isLoading, error }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
      onFileUpload(file);
    } else {
      alert("Veuillez sélectionner un fichier .zip valide.");
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      className="flex flex-col items-center justify-center p-8 w-full"
      onDragEnter={handleDrag}
    >
      <form 
        className={`w-full h-64 flex items-center justify-center text-center p-4 rounded-lg border-2 border-dashed transition-colors ${dragActive ? 'border-sky-400 bg-slate-700' : 'border-slate-600 bg-transparent'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center">
          <p className="text-slate-400 mb-4">Glissez-déposez votre fichier .zip ici</p>
          <button
            type="button"
            onClick={onButtonClick}
            disabled={isLoading}
            className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out"
          >
            Ou sélectionnez un fichier
          </button>
        </div>
      </form>
      {error && <p className="mt-4 text-red-400 font-semibold">{error}</p>}
    </div>
  );
};
