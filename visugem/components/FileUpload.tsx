import React, { useState, useRef, useCallback } from 'react';
import { Spinner } from './Spinner';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading, error }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isLoading && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setSelectedFile(file);
      }
      event.dataTransfer.clearData();
    }
  }, [isLoading]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  
  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload a Visit ZIP File</h2>
      <p className="text-gray-500 mb-6">Drag and drop your .zip file here or click to select a file.</p>
      
      <div 
        className="w-full max-w-md p-10 border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:bg-sky-50 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={triggerFileSelect}
      >
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        {selectedFile ? (
          <p className="text-gray-800 font-medium">{selectedFile.name}</p>
        ) : (
          <p className="text-gray-400">Click or drag file here</p>
        )}
      </div>

      <button
        onClick={handleUploadClick}
        disabled={!selectedFile || isLoading}
        className="mt-6 px-6 py-3 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center w-48"
      >
        {isLoading ? (
          <>
            <Spinner />
            <span className="ml-2">Processing...</span>
          </>
        ) : (
          'Process Visit'
        )}
      </button>
      {error && <p className="mt-4 text-red-500 font-semibold">{error}</p>}
    </div>
  );
};
