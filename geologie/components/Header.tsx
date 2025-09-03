import React from 'react';
import { DownloadIcon } from './icons';

interface HeaderProps {
  isEditorMode: boolean;
  onToggleMode: () => void;
  onExportJson: () => void;
  onExportPwa: () => void;
}

const Header: React.FC<HeaderProps> = ({ isEditorMode, onToggleMode, onExportJson, onExportPwa }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-20 flex-shrink-0">
      <h1 className="text-xl font-bold text-white tracking-wider">
        Visite Virtuelle
      </h1>
      <div className="flex items-center space-x-4">
        {isEditorMode && (
          <div className="flex items-center space-x-2">
             <button 
              onClick={onExportJson}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
              title="Exporter uniquement les données de la visite"
            >
              <DownloadIcon />
              <span>JSON</span>
            </button>
            <button 
              onClick={onExportPwa}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
              title="Exporter la visite en PWA autonome (.zip)"
            >
              <DownloadIcon />
              <span>PWA</span>
            </button>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <span className={`font-medium ${!isEditorMode ? 'text-blue-400' : 'text-gray-400'}`}>
            Visualiseur
          </span>
          <label htmlFor="mode-toggle" className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="mode-toggle" 
              className="sr-only peer" 
              checked={isEditorMode}
              onChange={onToggleMode}
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className={`font-medium ${isEditorMode ? 'text-blue-400' : 'text-gray-400'}`}>
            Éditeur
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;