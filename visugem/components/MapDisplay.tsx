import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProcessedData, Poi } from '../types';
import { PoiPopupContent } from './PoiPopupContent';

// Fix for default marker icon issue in React with bundlers like Webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapDisplayProps {
  data: ProcessedData;
}

const getPoiPosition = (poi: Poi): L.LatLngExpression => {
    try {
        const [lat, lng] = poi.location.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) {
            console.error(`Invalid location format for POI ${poi.id}: ${poi.location}`);
            return [0, 0]; // return a default location
        }
        return [lat, lng];
    } catch (error) {
        console.error(`Error parsing location for POI ${poi.id}: ${poi.location}`, error);
        return [0, 0];
    }
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ data }) => {
  if (!data || !data.visit.pois || data.visit.pois.length === 0) {
    return <div className="text-center p-8">No points of interest to display.</div>;
  }
  
  const positions = data.visit.pois.map(getPoiPosition);
  const mapCenter = positions.length > 0 ? positions[0] : [51.505, -0.09]; // Default center
  
  return (
    <div className="w-full h-full relative">
        <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">{data.visit.name}</h2>
        <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
            <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {data.visit.pois.map(poi => {
                    const position = getPoiPosition(poi);
                    return (
                        <Marker key={poi.id} position={position}>
                            <Popup>
                                <PoiPopupContent poi={poi} media={data.mediaData[poi.id]} />
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    </div>
  );
};
