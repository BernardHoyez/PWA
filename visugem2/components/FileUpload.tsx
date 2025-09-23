import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      onFileSelect(file);
    } else {
      alert('Please upload a valid .zip file.');
    }
  }, [onFileSelect]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleClick = () => {
    document.getElementById('file-input')?.click();
  };

  return (
    <div
      className={`w-full max-w-2xl p-8 border-4 border-dashed rounded-2xl transition-all duration-300 ${
        isDragging ? 'border-sky-400 bg-slate-700/50' : 'border-slate-600 hover:border-sky-500 hover:bg-slate-800'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="File upload zone"
    >
      <input
        type="file"
        id="file-input"
        className="hidden"
        accept=".zip,application/zip,application/x-zip,application/x-zip-compressed"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center justify-center text-center text-slate-400 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h2 className="text-xl font-semibold text-slate-300">
          Drop your <span className="text-sky-400">visit.zip</span> file here
        </h2>
        <p>or click to browse your files</p>
      </div>
    </div>
  );
};