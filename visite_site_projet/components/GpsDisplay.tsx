import React, { useState, useEffect } from 'react';
import { GpsCoords } from '@/types';
import { LocationMarkerIcon } from './Icons';

const GpsDisplay: React.FC = () => {
    const [coords, setCoords] = useState<GpsCoords | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        const watcherId = navigator.geolocation.watchPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
                setError(null);
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError("Géolocalisation refusée.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError("Position non disponible.");
                        break;
                    case err.TIMEOUT:
                        setError("Timeout de géolocalisation.");
                        break;
                    default:
                        setError("Erreur de géolocalisation.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watcherId);
        };
    }, []);

    const formatCoord = (num: number, type: 'lat' | 'lon') => {
        const direction = num >= 0 ? (type === 'lat' ? 'N' : 'E') : (type === 'lat' ? 'S' : 'W');
        return `${Math.abs(num).toFixed(5)}${direction}`;
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-700 text-sm font-mono p-2 rounded-md flex items-center gap-2 shadow-inner">
           <LocationMarkerIcon />
            {coords ? (
                <span>
                    Lat:{formatCoord(coords.lat, 'lat')} Lon:{formatCoord(coords.lon, 'lon')}
                </span>
            ) : (
                <span className="text-red-500">{error || "Obtention GPS..."}</span>
            )}
        </div>
    );
};

export default GpsDisplay;