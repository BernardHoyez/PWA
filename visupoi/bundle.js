(function () {
  'use strict';

  const e = React.createElement;

  const FileUpload = ({ onFileUpload, error }) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragEnter = React.useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = React.useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);
    
    const handleDragOver = React.useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileUpload(e.dataTransfer.files[0]);
      }
    }, [onFileUpload]);

    const handleFileChange = (event) => {
      if (event.target.files && event.target.files.length > 0) {
        onFileUpload(event.target.files[0]);
      }
    };
    
    const dragDropClasses = `relative border-4 border-dashed rounded-lg p-10 transition-colors duration-300 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`;

    return e("div", { className: "min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" },
      e("div", { className: "w-full max-w-2xl text-center" },
        e("h1", { className: "text-4xl font-bold text-gray-800 mb-2" }, "VisuPOI"),
        e("p", { className: "text-lg text-gray-600 mb-8" }, "Your offline POI map viewer."),
        e("div", {
          onDragEnter: handleDragEnter,
          onDragLeave: handleDragLeave,
          onDragOver: handleDragOver,
          onDrop: handleDrop,
          className: dragDropClasses
        },
          e("input", {
            type: "file",
            id: "zip-upload",
            className: "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
            accept: ".zip",
            onChange: handleFileChange
          }),
          e("label", { htmlFor: "zip-upload", className: "flex flex-col items-center justify-center space-y-4 cursor-pointer" },
            e("svg", { className: "w-16 h-16 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
              e("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M7 16a4 4 0 01-4-4V7a4 4 0 014-4h4a4 4 0 014 4v5a4 4 0 01-4 4H7z" }),
              e("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M14 12a2 2 0 10-4 0 2 2 0 004 0z" })
            ),
            e("p", { className: "text-gray-500" },
              e("span", { className: "font-semibold text-blue-600" }, "Click to upload"), " or drag and drop"
            ),
            e("p", { className: "text-sm text-gray-500" }, "ZIP file containing visit.json and data folder")
          )
        ),
        error && e("div", { className: "mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg", role: "alert" },
          e("strong", { className: "font-bold" }, "Error: "),
          e("span", { className: "block sm:inline" }, error)
        )
      )
    );
  };
  
  const parseLocation = (location) => {
    const parts = location.replace(/ /g, '').split(',');
    if (parts.length !== 2) return null;
    const latPart = parts[0].match(/(\d+\.?\d*)(N|S)/i);
    const lonPart = parts[1].match(/(\d+\.?\d*)(E|W)/i);
    if (!latPart || !lonPart) return null;
    let lat = parseFloat(latPart[1]);
    if (latPart[2].toUpperCase() === 'S') lat = -lat;
    let lon = parseFloat(lonPart[1]);
    if (lonPart[2].toUpperCase() === 'W') lon = -lon;
    return L.latLng(lat, lon);
  };

  const getMarkerColor = (poi) => {
    if (poi.video) return 'bg-red-500';
    if (poi.image && poi.audio) return 'bg-purple-500';
    if (poi.image) return 'bg-blue-500';
    if (poi.audio) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const PopupContent = ({ pois, mediaData }) => {
    const [selectedPoi, setSelectedPoi] = React.useState(pois.length === 1 ? pois[0] : null);
    const containerRef = React.useRef(null);
    
    React.useEffect(() => {
        const node = containerRef.current;
        if (node) {
            L.DomEvent.disableScrollPropagation(node);
            L.DomEvent.disableClickPropagation(node);
        }
    }, []);

    const handlePoiSelect = (evt, poi) => {
      evt.stopPropagation();
      setSelectedPoi(poi);
    };

    const handleBackToList = (evt) => {
      evt.stopPropagation();
      setSelectedPoi(null);
    };

    if (!selectedPoi) {
      return e("div", { className: "p-1", ref: containerRef },
        e("h3", { className: "font-bold text-lg mb-2" }, `${pois.length} POIs at this location`),
        e("ul", { className: "list-disc list-inside" },
          pois.map(poi => e("li", { key: poi.id },
            e("button", { onClick: (evt) => handlePoiSelect(evt, poi), className: "text-blue-600 hover:underline" }, poi.title)
          ))
        )
      );
    }

    const media = mediaData[selectedPoi.id];
    return e("div", { className: "w-64 max-h-96 overflow-y-auto p-1", ref: containerRef },
      pois.length > 1 && e("button", { onClick: handleBackToList, className: "text-sm text-blue-600 hover:underline mb-2" }, "\u2190 Back to list"),
      e("h3", { className: "font-bold text-xl mb-1" }, selectedPoi.title),
      e("p", { className: "text-xs text-gray-500 mb-2" }, selectedPoi.location),
      selectedPoi.comment && e("p", { className: "text-sm my-2 italic" }, `"${selectedPoi.comment}"`),
      media.image && e("img", { src: media.image, alt: selectedPoi.title, className: "rounded-md my-2 w-full" }),
      media.audio && e("audio", { controls: true, src: media.audio, className: "w-full my-2" }, "Your browser does not support the audio element."),
      media.video && e("video", { controls: true, src: media.video, className: "w-full my-2 rounded-md" }, "Your browser does not support the video tag.")
    );
  };

  const MapDisplay = ({ visitData, mediaData, onReset }) => {
    const mapContainerRef = React.useRef(null);
    const mapRef = React.useRef(null);
    const markersRef = React.useRef(L.layerGroup());

    React.useEffect(() => {
      if (mapRef.current === null && mapContainerRef.current) {
        mapRef.current = L.map(mapContainerRef.current);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
        markersRef.current.addTo(mapRef.current);
      }

      const groupedPois = new Map();
      visitData.pois.forEach(poi => {
        const locationKey = poi.location.replace(/ /g, '');
        if (!groupedPois.has(locationKey)) groupedPois.set(locationKey, []);
        groupedPois.get(locationKey).push(poi);
      });

      markersRef.current.clearLayers();
      const bounds = L.latLngBounds([]);

      groupedPois.forEach((poisAtLocation) => {
        const firstPoi = poisAtLocation[0];
        const latLng = parseLocation(firstPoi.location);
        if (!latLng) return;

        bounds.extend(latLng);
        const color = getMarkerColor(firstPoi);
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="w-6 h-6 rounded-full ${color} border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">${poisAtLocation.length > 1 ? poisAtLocation.length : ''}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
        });
        const marker = L.marker(latLng, { icon }).addTo(markersRef.current);
        
        marker.bindPopup('', { minWidth: 250, className: 'custom-popup' });
        
        marker.on('popupopen', (e) => {
            const container = document.createElement('div');
            const root = ReactDOM.createRoot(container);
            e.popup.setContent(container);
            root.render(React.createElement(PopupContent, { pois: poisAtLocation, mediaData }));
            marker.once('popupclose', () => {
                root.unmount();
            });
        });
      });

      if (mapRef.current && bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } else if (mapRef.current) {
          mapRef.current.setView([46.2276, 2.2137], 6);
      }
    }, [visitData, mediaData]);
    
    return e("div", { className: "relative h-full w-full" },
      e("div", { id: "map", ref: mapContainerRef, className: "h-full w-full z-0" }),
      e("div", { className: "absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-80 p-2 rounded-lg shadow-lg" },
        e("h1", { className: "text-xl font-bold text-gray-800" }, visitData.name)
      ),
      e("button", { 
        onClick: onReset, 
        className: "absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded-lg shadow-md",
        title: "Load another file"
      }, "Load New")
    );
  };
  
  const LoadingSpinner = () => e("div", { className: "flex flex-col items-center justify-center h-screen bg-gray-100" },
    e("div", { className: "w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin" }),
    e("p", { className: "mt-4 text-lg text-gray-700" }, "Processing data...")
  );

  const App = () => {
    const [visitData, setVisitData] = React.useState(null);
    const [mediaData, setMediaData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const processZipFile = React.useCallback(async (file) => {
      setIsLoading(true);
      setError(null);
      
      if (mediaData) {
        Object.values(mediaData).forEach((media) => {
          if (media.image) URL.revokeObjectURL(media.image);
          if (media.video) URL.revokeObjectURL(media.video);
          if (media.audio) URL.revokeObjectURL(media.audio);
        });
      }
      setVisitData(null);
      setMediaData(null);

      try {
        const zip = await JSZip.loadAsync(file);
        const visitFile = zip.file('visit.json');
        if (!visitFile) throw new Error('visit.json not found in the ZIP file.');

        const visitContent = await visitFile.async('string');
        const parsedVisitData = JSON.parse(visitContent);

        const newMediaData = {};
        const mediaPromises = [];
        const imageExt = /\.(jpg|jpeg|png|gif|webp)$/i;
        const videoExt = /\.(mp4|webm|ogv)$/i;
        const audioExt = /\.(mp3|wav|ogg|m4a)$/i;
        
        parsedVisitData.pois.forEach((poi) => {
           newMediaData[poi.id] = {};
           const poiFolder = `data/${poi.id}/`;
           zip.folder(poiFolder)?.forEach((relativePath, zipEntry) => {
               const promise = async () => {
                   if (zipEntry.dir) return;
                   const blob = await zipEntry.async('blob');
                   const url = URL.createObjectURL(blob);

                   if (poi.image && imageExt.test(zipEntry.name)) newMediaData[poi.id].image = url;
                   else if (poi.video && videoExt.test(zipEntry.name)) newMediaData[poi.id].video = url;
                   else if (poi.audio && audioExt.test(zipEntry.name)) newMediaData[poi.id].audio = url;
               };
               mediaPromises.push(promise());
           });
        });
        
        await Promise.all(mediaPromises);
        setVisitData(parsedVisitData);
        setMediaData(newMediaData);
      } catch (err) {
        setError(`Failed to process ZIP file: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, [mediaData]);
    
    const handleReset = () => {
      setVisitData(null);
      setMediaData(null);
      setError(null);
    };

    if (isLoading) return e(LoadingSpinner);
    if (visitData && mediaData) return e(MapDisplay, { visitData, mediaData, onReset: handleReset });
    return e(FileUpload, { onFileUpload: processZipFile, error: error });
  };
  
  const rootElement = document.getElementById('root');
  const root = ReactDOM.createRoot(rootElement);
  root.render(e(React.StrictMode, null, e(App)));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('SW registered.', reg))
        .catch(err => console.log('SW registration failed: ', err));
    });
  }

})();
