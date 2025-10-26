const { useState, useRef, useEffect, createElement: e } = React;

function RemoteCameraApp() {
  const [mode, setMode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [connectedDevice, setConnectedDevice] = useState('');
  const [copied, setCopied] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [flash, setFlash] = useState(false);
  const [gridLines, setGridLines] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const addLog = (msg) => {
    console.log(msg);
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

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
    addLog('Initialisation caméra, ID: ' + id);
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
    addLog('Démarrage caméra...');
    try {
      setError('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      addLog('Demande permission caméra...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia non supporté');
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog('Caméra obtenue!');
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        addLog('Flux attaché à la vidéo');
      } else {
        addLog('ERREUR: videoRef.current est null!');
      }

      shareVideoStream();
    } catch (err) {
      addLog('ERREUR: ' + err.message);
      setError('Impossible d\'accéder à la caméra: ' + err.message);
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
    console.log('Affichage écran sélection');
    return e('div', { className: 'min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6' },
      e('div', { className: 'max-w-4xl w-full' },
        e('div', { className: 'text-center mb-12' },
          e('i', { 'data-lucide': 'camera', className: 'w-20 h-20 text-white mx-auto mb-4' }),
          e('h1', { className: 'text-4xl font-bold text-white mb-2' }, 'ControlCam'),
          e('p', { className: 'text-white/80' }, 'Contrôlez la caméra de votre smartphone depuis votre PC')
        ),
        e('div', { className: 'grid md:grid-cols-2 gap-6' },
          e('button', {
            onClick: initCamera,
            className: 'bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105'
          },
            e('i', { 'data-lucide': 'smartphone', className: 'w-16 h-16 text-blue-400 mx-auto mb-4' }),
            e('h2', { className: 'text-2xl font-bold text-white mb-2' }, 'Mode Caméra'),
            e('p', { className: 'text-white/70' }, 'Utilisez ce smartphone comme caméra')
          ),
          e('button', {
            onClick: () => {
              const id = prompt('Entrez l\'ID de l\'appareil à contrôler:');
              if (id) connectToDevice(id.toUpperCase());
            },
            className: 'bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all transform hover:scale-105'
          },
            e('i', { 'data-lucide': 'monitor', className: 'w-16 h-16 text-purple-400 mx-auto mb-4' }),
            e('h2', { className: 'text-2xl font-bold text-white mb-2' }, 'Mode Contrôleur'),
            e('p', { className: 'text-white/70' }, 'Contrôlez une caméra distante depuis ce PC')
          )
        )
      )
    );
  }

  if (mode === 'camera') {
    addLog('Affichage mode caméra, deviceId: ' + deviceId);
    return e('div', { className: 'min-h-screen bg-black flex flex-col' },
      e('div', { className: 'bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-20 p-4' },
        e('div', { className: 'flex items-center justify-between mb-4' },
          e('button', {
            onClick: () => setGridLines(!gridLines),
            className: `p-3 rounded-full transition-colors ${gridLines ? 'bg-blue-500' : 'bg-white/20'}`
          },
            e('i', { 'data-lucide': 'grid-3x3', className: 'w-5 h-5 text-white' })
          ),
          e('div', { className: 'flex items-center gap-2 bg-green-500 px-4 py-2 rounded-full' },
            e('i', { 'data-lucide': 'wifi', className: 'w-4 h-4 text-white animate-pulse' }),
            e('span', { className: 'text-white text-sm font-semibold' }, 'Connecté')
          ),
          e('button', {
            onClick: toggleFlash,
            className: `p-3 rounded-full transition-colors ${flash ? 'bg-yellow-500' : 'bg-white/20'}`
          },
            e('i', { 'data-lucide': flash ? 'zap' : 'zap-off', className: 'w-5 h-5 text-white' })
          )
        ),
        e('div', { className: 'bg-black/50 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between' },
          e('div', null,
            e('p', { className: 'text-white/60 text-xs' }, 'ID de l\'appareil'),
            e('p', { className: 'text-white text-2xl font-bold tracking-wider' }, deviceId)
          ),
          e('button', {
            onClick: copyUrl,
            className: 'bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
          },
            e('i', { 'data-lucide': copied ? 'check' : 'copy', className: 'w-4 h-4 text-white' }),
            e('span', { className: 'text-white text-sm' }, copied ? 'Copié!' : 'Copier URL')
          )
        )
      ),
      e('div', { className: 'flex-1 relative overflow-hidden', style: { marginTop: '140px' } },
        // Panel de debug
        debugLogs.length > 0 && e('div', { 
          className: 'absolute top-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg z-40 max-h-60 overflow-y-auto text-xs font-mono'
        },
          e('div', { className: 'font-bold mb-2' }, '🔍 Debug Logs:'),
          ...debugLogs.map((log, i) => e('div', { key: i }, log))
        ),
        !stream && !error && e('div', { className: 'absolute inset-0 flex items-center justify-center bg-black z-30' },
          e('div', { className: 'text-center px-6' },
            e('i', { 'data-lucide': 'camera', className: 'w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse' }),
            e('p', { className: 'text-white text-lg mb-4' }, 'Démarrage de la caméra...')
          )
        ),
        error && e('div', { className: 'absolute inset-0 flex items-center justify-center bg-black z-30' },
          e('div', { className: 'text-center px-6' },
            e('i', { 'data-lucide': 'camera', className: 'w-16 h-16 text-red-500 mx-auto mb-4' }),
            e('p', { className: 'text-white text-lg mb-4' }, error)
          )
        ),
        !capturedPhoto ? e('div', { className: 'relative w-full h-full' },
          e('video', { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: 'w-full h-full object-cover' }),
          gridLines && e('div', { className: 'absolute inset-0 pointer-events-none' },
            e('div', { className: 'w-full h-full grid grid-cols-3 grid-rows-3' },
              ...Array(9).fill(0).map((_, i) => e('div', { key: i, className: 'border border-white/30' }))
            )
          ),
          isRecording && e('div', { className: 'absolute top-4 right-4 bg-red-500 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse' },
            e('div', { className: 'w-3 h-3 bg-white rounded-full' }),
            e('span', { className: 'text-white text-sm font-semibold' }, 'REC')
          ),
          e('canvas', { ref: canvasRef, className: 'hidden' })
        ) : e('div', { className: 'relative w-full h-full' },
          e('img', { src: capturedPhoto, alt: 'Photo', className: 'w-full h-full object-cover' }),
          e('button', {
            onClick: () => setCapturedPhoto(null),
            className: 'absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-full text-white font-semibold'
          }, 'Reprendre')
        )
      )
    );
  }

  return e(RemoteController, { deviceId: connectedDevice, onDisconnect: () => setMode('') });
}

function RemoteController({ deviceId, onDisconnect }) {
  const [liveView, setLiveView] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  useEffect(() => {
    if (!window.storage) return;
    
    const updateLiveView = setInterval(async () => {
      try {
        const frame = await window.storage.get(`stream:${deviceId}`);
        if (frame) {
          setLiveView(frame.value);
        }
      } catch (err) {}
    }, 300);

    const updatePhotos = setInterval(async () => {
      try {
        const keys = await window.storage.list(`photo:${deviceId}:`);
        if (keys && keys.keys) {
          const photoPromises = keys.keys.map(k => window.storage.get(k).catch(() => null));
          const photoResults = await Promise.all(photoPromises);
          setPhotos(photoResults.filter(p => p).map(p => p.value));
        }
      } catch (err) {}
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

  return e('div', { className: 'min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6' },
    e('div', { className: 'max-w-7xl mx-auto' },
      e('div', { className: 'flex items-center justify-between mb-8' },
        e('div', null,
          e('h1', { className: 'text-3xl font-bold text-white mb-2' }, 'Contrôle à Distance'),
          e('p', { className: 'text-white/60' }, 
            'Appareil connecté: ',
            e('span', { className: 'text-blue-400 font-mono' }, deviceId)
          )
        ),
        e('button', {
          onClick: onDisconnect,
          className: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl border border-red-500/30'
        }, 'Déconnecter')
      ),
      e('div', { className: 'grid lg:grid-cols-3 gap-6' },
        e('div', { className: 'lg:col-span-2' },
          e('div', { className: 'bg-black rounded-2xl overflow-hidden shadow-2xl' },
            liveView ? e('img', { src: liveView, alt: 'Live', className: 'w-full aspect-video object-cover' }) :
            e('div', { className: 'w-full aspect-video flex items-center justify-center bg-slate-800' },
              e('i', { 'data-lucide': 'camera', className: 'w-20 h-20 text-white/20' })
            )
          ),
          e('div', { className: 'grid grid-cols-5 gap-4 mt-6' },
            e('button', {
              onClick: () => sendCommand('capture'),
              className: 'bg-blue-500 hover:bg-blue-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors'
            },
              e('i', { 'data-lucide': 'circle', className: 'w-8 h-8 text-white' }),
              e('span', { className: 'text-white text-sm' }, 'Capturer')
            ),
            e('button', {
              onClick: () => sendCommand('switch'),
              className: 'bg-purple-500 hover:bg-purple-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors'
            },
              e('i', { 'data-lucide': 'switch-camera', className: 'w-8 h-8 text-white' }),
              e('span', { className: 'text-white text-sm' }, 'Basculer')
            ),
            e('button', {
              onClick: () => sendCommand('flash'),
              className: 'bg-yellow-500 hover:bg-yellow-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors'
            },
              e('i', { 'data-lucide': 'zap', className: 'w-8 h-8 text-white' }),
              e('span', { className: 'text-white text-sm' }, 'Flash')
            ),
            e('button', {
              onClick: () => sendCommand('grid'),
              className: 'bg-green-500 hover:bg-green-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors'
            },
              e('i', { 'data-lucide': 'grid-3x3', className: 'w-8 h-8 text-white' }),
              e('span', { className: 'text-white text-sm' }, 'Grille')
            ),
            e('button', {
              onClick: () => sendCommand('record'),
              className: 'bg-red-500 hover:bg-red-600 p-6 rounded-xl flex flex-col items-center gap-2 transition-colors'
            },
              e('i', { 'data-lucide': 'video', className: 'w-8 h-8 text-white' }),
              e('span', { className: 'text-white text-sm' }, 'Enreg.')
            )
          )
        ),
        e('div', { className: 'bg-white/5 backdrop-blur-lg rounded-2xl p-6' },
          e('h2', { className: 'text-xl font-bold text-white mb-4' }, 'Photos capturées'),
          e('div', { className: 'space-y-4 max-h-[600px] overflow-y-auto' },
            photos.length === 0 ? e('p', { className: 'text-white/40 text-center py-8' }, 'Aucune photo') :
            photos.map((photo, i) =>
              e('div', { key: i, className: 'relative group' },
                e('img', { src: photo, alt: `Photo ${i + 1}`, className: 'w-full rounded-lg' }),
                e('button', {
                  onClick: () => {
                    const link = document.createElement('a');
                    link.href = photo;
                    link.download = `photo_${Date.now()}.jpg`;
                    link.click();
                  },
                  className: 'absolute top-2 right-2 bg-blue-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
                },
                  e('i', { 'data-lucide': 'download', className: 'w-4 h-4 text-white' })
                )
              )
            )
          )
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(RemoteCameraApp));