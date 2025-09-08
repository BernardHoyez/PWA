import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as EXIF from 'exif-js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Correction pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapPicker({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function App() {
  const [position, setPosition] = useState([48.8584, 2.2945]); // Coordonnées par défaut (Tour Eiffel)
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [audio, setAudio] = useState(null);
  const [comment, setComment] = useState('');

  // Extraction des coordonnées EXIF depuis une image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    EXIF.getData(file, function() {
      const latitude = EXIF.getTag(this, 'GPSLatitude');
      const longitude = EXIF.getTag(this, 'GPSLongitude');
      if (latitude && longitude) {
        const lat = latitude[0] + latitude[1]/60 + latitude[2]/3600;
        const lng = longitude[0] + longitude[1]/60 + longitude[2]/3600;
        setPosition([lat, lng]);
      }
    });
  };

  // Export des données en ZIP
  const handleExport = async () => {
    const zip = new JSZip();
    const pointData = {
      title,
      position,
      comment,
      image: image ? 'images/photo.jpg' : null,
      video: video ? 'videos/video.mp4' : null,
      audio: audio ? 'audios/audio.mp3' : null,
    };
    zip.file('data/point.json', JSON.stringify(pointData, null, 2));

    if (image) {
      const imageBlob = new Blob([image], { type: 'image/jpeg' });
      zip.file('data/images/photo.jpg', imageBlob);
    }
    if (video) {
      const videoBlob = new Blob([video], { type: 'video/mp4' });
      zip.file('data/videos/video.mp4', videoBlob);
    }
    if (audio) {
      const audioBlob = new Blob([audio], { type: 'audio/mp3' });
      zip.file('data/audios/audio.mp3', audioBlob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'visite_site_data.zip');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>Éditeur de Point</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Titre (1-30 caractères) :</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ height: '400px', marginBottom: '20px', border: '1px solid #ccc' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapPicker position={position} onPositionChange={setPosition} />
        </MapContainer>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Latitude :</label>
        <input type="text" value={position[0]} readOnly style={{ width: '100%', padding: '8px' }} />
        <label style={{ display: 'block', marginBottom: '5px', marginTop: '10px' }}>Longitude :</label>
        <input type="text" value={position[1]} readOnly style={{ width: '100%', padding: '8px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Médias</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Image (JPEG, <20 Mo) :</label>
          <input type="file" accept="image/jpeg" onChange={handleImageUpload} style={{ width: '100%' }} />
          {image && <img src={URL.createObjectURL(image)} alt="Preview" style={{ maxWidth: '200px', marginTop: '10px' }} />}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Vidéo (MP4, <20 Mo) :</label>
          <input type="file" accept="video/mp4" onChange={(e) => setVideo(e.target.files[0])} style={{ width: '100%' }} />
          {video && <video controls src={URL.createObjectURL(video)} style={{ maxWidth: '200px', marginTop: '10px' }} />}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Audio (MP3, <20 Mo) :</label>
          <input type="file" accept="audio/mp3" onChange={(e) => setAudio(e.target.files[0])} style={{ width: '100%' }} />
          {audio && <audio controls src={URL.createObjectURL(audio)} style={{ marginTop: '10px' }} />}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Commentaire :</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', padding: '8px', minHeight: '100px' }}
          />
        </div>
      </div>

      <button
        onClick={handleExport}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          borderRadius: '4px',
        }}
      >
        Exporter en ZIP
      </button>
    </div>
  );
}
