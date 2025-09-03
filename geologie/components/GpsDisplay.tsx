import React from 'react';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface GpsDisplayProps {
  position: GeolocationPosition | null;
  error: string | null;
}

const GpsDisplay: React.FC<GpsDisplayProps> = ({ position, error }) => {
  const formatCoordinate = (coordinate: number, type: 'lat' | 'lon') => {
    const val = Math.abs(coordinate);
    let direction = '';
    if (type === 'lat') {
      direction = coordinate >= 0 ? 'N' : 'S';
    } else {
      direction = coordinate >= 0 ? 'E' : 'W';
    }
    return `${val.toFixed(4)}${direction}`;
  };

  let content;
  if (error) {
    content = <span className="text-red-400">{error}</span>;
  } else if (position) {
    content = (
      <>
        <span>Lat {formatCoordinate(position.coords.latitude, 'lat')}</span>
        <span className="mx-2">|</span>
        <span>Lon {formatCoordinate(position.coords.longitude, 'lon')}</span>
      </>
    );
  } else {
    content = <span>Recherche de la position...</span>;
  }

  return (
    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-sm font-mono p-2 rounded-lg shadow-lg z-20">
      {content}
    </div>
  );
};

export default GpsDisplay;