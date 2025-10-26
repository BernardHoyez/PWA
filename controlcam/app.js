const { useState, useRef, useEffect } = React;

function RemoteCameraApp() {
  const [mode, setMode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [connectedDevice, setConnectedDevice] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [flash, setFlash] = useState(false);
  const [gridLines, setGridLines] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    lucide.createIcons();
  }, [mode, gridLines, flash, copied, capturedPhoto, isRecording]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlDeviceId = params.get('device');
    
    if (urlDeviceId) {
      setMode('controller');
      setConnectedDevice(urlDeviceId);
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera' && deviceId) {
      startCamera();
      const cleanup = startCommandListener();
      return () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (cleanup) cleanup();
      };
    }
  }, [mode, deviceId, facingMode]);

  const generateDeviceId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const initCamera = () => {
    const id = generateDeviceId();
    setDeviceId(id);
    setMode('camera');
  };

  const startCommandListener = () => {
    const checkCommands = setInterval(async () => {
      if (!window.storage) return;
      try {
        const commands = await window.storage.get(`commands:${deviceId}`);
        if (commands) {
          const cmd = JSON.parse(commands.value);
          handleRemoteCommand(cmd);
          await window.storage.delete(`commands:${deviceId}`);
        }
      } catch (err) {
        // Pas de commandes
      }
    }, 500);

    return () => clearInterval(checkCommands);
  };

  const handleRemoteCommand = (cmd) => {
    switch (cmd.action) {
      case 'capture':
        capturePhoto();
        break;
      case 'switch':
        switchCamera();
        break;
      case 'flash':
        toggleFlash();
        break;
      case 'grid':
        setGridLines(prev => !prev);
        break;
      case 'record':
        setIsRecording(prev => !prev);
        break;
    }
  };

  const connectToDevice = (id) => {
    setConnectedDevice(id);
    setMode('controller');
  };

  const startCamera = async () => {
    try {
      setError('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      shareVideoStream();
    } catch (err) {
      setError('Impossible d\'accéder à la caméra.');
      console.error('Erreur caméra:', err);
    }
  };

  const shareVideoStream = () => {
    if (!videoRef.current || !window.storage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const sendFrame = async () => {
      if (videoRef.current && mode === 'camera' && videoRef.current.readyState === 4) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        
        try {
          const frame = canvas.toDataURL('image/jpeg', 0.7);
          await window.storage.set(`stream:${deviceId}`, frame);
        } catch (err) {
          console.error('Erreur partage flux:', err);
        }
        
        setTimeout(sendFrame, 200);
      } else if (mode === 'camera') {
        setTimeout(sendFrame, 200);
      }
    };
    
    sendFrame();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flash }]
          });
          setFlash(!flash);
        } catch (err) {
          console.error('Flash non supporté');
        }
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedPhoto(imageData);
      
      if (mode === 'camera' && window.storage) {
        window.storage.set(`photo:${deviceId}:${Date.now()}`, imageData);
      }
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}?device=${deviceId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <i data-lucide="camera" className="w-20 h-20 text-white mx-auto mb-4"></i>
            <h1 className="text-4xl font-bold text-white mb-2">ControlCam</h1>
            <p className="text-white/80">Contrôlez la caméra de votre smartphone depuis votre PC</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={initCamera}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105"
            >
              <i data-lucide="smartphone" className="w-16 h-16 text-blue-400 mx-auto mb-4"></i>
              <h2 className="text-2xl font-bold text-white mb-2">Mode Caméra</h2>
              <p className="text-white/70">Utilisez ce smartphone comme caméra</p>
            </button>

            <button
              onClick={() => {
                const id = prompt('Entrez l\'ID de l\'appareil à contrôler:');
                if (id) connectToDevice(id.toUpperCase());
              }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105"
            >
              <i data-lucide="monitor" className="w-16 h-16 text-purple-400 mx-auto mb-4"></i>
              <h2 className="text-2xl font-bold text-white mb-2">Mode Contrôleur</h2>
              <p className="text-white/70">Contrôlez une caméra distante depuis ce PC</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-20 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setGridLines(!gridLines)}
              className={`p-3 rounded-full transition-colors ${gridLines ? 'bg-blue-500' : 'bg-white/20'}`}
            >
              <i data-lucide="grid-3x3" className="w-5 h-5 text-white"></i>
            </button>
            
            <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-full">
              <i data-lucide="wifi" className="w-4 h-4 text-white animate-pulse"></i>
              <span className="text-white text-sm font-semibold">Connecté</span>
            </div>

            <button
              onClick={toggleFlash}
              className={`p-3 rounded-full transition-colors ${flash ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              <i data-lucide={flash ? 'zap' : 'zap-off'} className="w-5 h-5 text-white"></i>
            </button>
          </div>

          <div className="bg-black/50 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs">ID de l'appareil</p>
              <p className="text-white text-2xl font-bold tracking-wider">{deviceId}</p>
            </div>
            <button
              onClick={copyUrl}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <i data-lucide={copied ? 'check' : 'copy'} className="w-4 h-4 text-white"></i>
              <span className="text-white text-sm">{copied ? 'Copié!' : 'Copier URL'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden" style={{marginTop: '140px'}}>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
              <div className="text-center px-6">
                <i data-lucide="camera" className="w-16 h-16 text-red-500 mx-auto mb-4"></i>
                <p className="text-white text-lg mb-4">{error}</p>
              </div>
            </div>
          )}

          {!capturedPhoto ? (
            <div className="relative w-full h-full">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              
              {gridLines && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/30" />
                    ))}
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 right-4 bg-red-500 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span className="text-white text-sm font-semibold">REC</span>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img src={capturedPhoto} alt="Photo" className="w-full h-full object-cover" />
              <button
                onClick={() => setCapturedPhoto(null)}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-full text-white font-semibold"
              >
                Reprendre
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <RemoteController
      deviceId={connectedDevice}
      onDisconnect={() => setMode('')}
    />
  );
}

function RemoteController({ deviceId, onDisconnect }) {
  const [liveView, setLiveView] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    lucide.createIcons();
  }, [photos, liveView]);

  useEffect(() => {
    if (!window.storage) return;
    
    const updateLiveView = setInterval(async () => {
      try {
        const frame = await window.storage.get(`stream:${deviceId}`);
        if (frame) {
          setLiveView(frame.value);
        }
      } catch (err) {
        // Pas de flux
      }
    }, 300);

    const updatePhotos = setInterval(async () => {
      try {
        const keys = await window.storage.list(`photo:${deviceId}:`);
        if (keys && keys.keys) {
          const photoPromises = keys.keys.map(k => window.storage.get(k).catch(() => null));
          const photoResults = await Promise.all(photoPromises);
          setPhotos(photoResults.filter(p => p).map(p => p.value));
        }
      } catch (err) {
        // Pas de photos
      }
    }, 2000);

    return () => {
      clearInterval(updateLiveView);
      clearInterval(updatePhotos);
    };
  }, [deviceId]);

  const sendCommand = async (action) => {
    if (!window.storage) return;
    try {
      await window.storage.set(`commands:${deviceId}`, JSON.stringify({
        action,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Erreur envoi commande:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Contrôle à Distance</h1>
            <p className="text-white/60">Appareil connecté: <span className="text-blue-400 font-mono">{deviceId}</span></p>
          </div>
          <button
            onClick={onDisconnect}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl border border-red-500/30"
          >
            Déconnecter
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
              {liveView ? (
                <img src={liveView} alt="Live" className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-slate-800">
                  <i data-lucide="camera" className="w-20 h-20 text-white/20"></i>
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-4 mt-6">
              <button
                onClick={() => sendCommand('capture')}
                className="bg-blue-500 hover:bg-blue-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors"
              >
                <i data-lucide="circle" className="w-8 h-8 text-white"></i>
                <span className="text-white text-sm">Capturer</span>
              </button>

              <button
                onClick={() => sendCommand('switch')}
                className="bg-purple-500 hover:bg-purple-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors"
              >
                <i data-lucide="switch-camera" className="w-8 h-8 text-white"></i>
                <span className="text-white text-sm">Basculer</span>
              </button>

              <button
                onClick={() => sendCommand('flash')}
                className="bg-yellow-500 hover:bg-yellow-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors"
              >
                <i data-lucide="zap" className="w-8 h-8 text-white"></i>
                <span className="text-white text-sm">Flash</span>
              </button>

              <button
                onClick={() => sendCommand('grid')}
                className="bg-green-500 hover:bg-green-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors"
              >
                <i data-lucide="grid-3x3" className="w-8 h-8 text-white"></i>
                <span className="text-white text-sm">Grille</span>
              </button>

              <button
                onClick={() => sendCommand('record')}
                className="bg-red-500 hover:bg-red-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors"
              >
                <i data-lucide="video" className="w-8 h-8 text-white"></i>
                <span className="text-white text-sm">Enreg.</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Photos capturées</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {photos.length === 0 ? (
                <p className="text-white/40 text-center py-8">Aucune photo</p>
              ) : (
                photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full rounded-lg" />
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = photo;
                        link.download = `photo_${Date.now()}.jpg`;
                        link.click();
                      }}
                      className="absolute top-2 right-2 bg-blue-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i data-lucide="download" className="w-4 h-4 text-white"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(RemoteCameraApp));