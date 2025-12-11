const { useState, useEffect, useRef } = React;
const { Wifi, WifiOff, Upload, Download, Copy, Check, Smartphone, Monitor } = lucide;

function Icon({ icon: IconComponent, ...props }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current && IconComponent) {
      lucide.createElement(IconComponent).render(ref.current);
    }
  }, [IconComponent]);
  
  return React.createElement('i', { ref, ...props });
}

function FileTransferPWA() {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [transferProgress, setTransferProgress] = useState({});
  const [copied, setCopied] = useState(false);
  
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const fileChunksRef = useRef({});

  // Générer un ID unique
  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPeerId(id);
  }, []);

  // Configuration WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE Candidate:', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
      }
    };

    return pc;
  };

  const setupDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setIsConnected(true);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setIsConnected(false);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'file-meta') {
          fileChunksRef.current[data.id] = {
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            chunks: [],
            received: 0
          };
          setTransferProgress(prev => ({ ...prev, [data.id]: 0 }));
        } else if (data.type === 'file-chunk') {
          const fileData = fileChunksRef.current[data.id];
          if (fileData) {
            fileData.chunks.push(data.chunk);
            fileData.received += data.chunk.length;
            const progress = (fileData.received / fileData.size) * 100;
            setTransferProgress(prev => ({ ...prev, [data.id]: progress }));
            
            if (fileData.received >= fileData.size) {
              const blob = new Blob(fileData.chunks, { type: fileData.mimeType });
              const url = URL.createObjectURL(blob);
              setReceivedFiles(prev => [...prev, {
                id: data.id,
                name: fileData.name,
                size: fileData.size,
                url
              }]);
              delete fileChunksRef.current[data.id];
              setTransferProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[data.id];
                return newProgress;
              });
            }
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };

    dataChannelRef.current = channel;
  };

  const createOffer = async () => {
    try {
      const pc = createPeerConnection();
      peerRef.current = pc;

      const channel = pc.createDataChannel('fileTransfer', {
        ordered: true
      });
      setupDataChannel(channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      return JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
        peerId: peerId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      return null;
    }
  };

  const handleOffer = async (offerData) => {
    try {
      const data = JSON.parse(offerData);
      const pc = createPeerConnection();
      peerRef.current = pc;

      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp
      }));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setRemotePeerId(data.peerId);

      return JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        peerId: peerId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      return null;
    }
  };

  const handleAnswer = async (answerData) => {
    try {
      const data = JSON.parse(answerData);
      await peerRef.current.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: data.sdp
      }));
      setRemotePeerId(data.peerId);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const sendFile = async (file) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      alert('Pas de connexion active');
      return;
    }

    const fileId = Math.random().toString(36).substring(2);
    const chunkSize = 16384;

    dataChannelRef.current.send(JSON.stringify({
      type: 'file-meta',
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));

    const reader = new FileReader();
    let offset = 0;

    const readSlice = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      const chunk = new Uint8Array(e.target.result);
      dataChannelRef.current.send(JSON.stringify({
        type: 'file-chunk',
        id: fileId,
        chunk: Array.from(chunk)
      }));

      offset += chunk.length;
      const progress = (offset / file.size) * 100;
      setTransferProgress(prev => ({ ...prev, [fileId]: progress }));

      if (offset < file.size) {
        readSlice();
      } else {
        setTimeout(() => {
          setTransferProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 1000);
      }
    };

    readSlice();
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    selectedFiles.forEach(file => sendFile(file));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [answerText, setAnswerText] = useState('');

  const handleCreateConnection = async () => {
    const offer = await createOffer();
    if (offer) {
      setGeneratedOffer(offer);
      setShowOfferInput(true);
    }
  };

  const handlePasteOffer = async () => {
    if (offerText.trim()) {
      const answer = await handleOffer(offerText);
      if (answer) {
        setAnswerText(answer);
      }
    }
  };

  const handlePasteAnswer = async () => {
    if (answerText.trim()) {
      await handleAnswer(answerText);
      setGeneratedOffer('');
      setAnswerText('');
      setOfferText('');
      setShowOfferInput(false);
    }
  };

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4' },
    React.createElement('div', { className: 'max-w-4xl mx-auto' },
      React.createElement('div', { className: 'bg-white rounded-2xl shadow-xl p-6 mb-6' },
        React.createElement('div', { className: 'flex items-center justify-between mb-6' },
          React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' }, 'pc2phone'),
          React.createElement('div', { className: 'flex items-center gap-2' },
            isConnected ? 
              React.createElement('div', { className: 'flex items-center gap-2 text-green-600' },
                React.createElement(Icon, { icon: Wifi, className: 'w-6 h-6' }),
                React.createElement('span', { className: 'font-medium' }, 'Connecté')
              ) :
              React.createElement('div', { className: 'flex items-center gap-2 text-gray-400' },
                React.createElement(Icon, { icon: WifiOff, className: 'w-6 h-6' }),
                React.createElement('span', { className: 'font-medium' }, 'Déconnecté')
              )
          )
        ),
        
        React.createElement('div', { className: 'bg-blue-50 rounded-lg p-4 mb-6' },
          React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
            React.createElement(Icon, { icon: Monitor, className: 'w-5 h-5 text-blue-600' }),
            React.createElement('span', { className: 'font-semibold text-gray-700' }, 'Votre ID :')
          ),
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('code', { className: 'bg-white px-4 py-2 rounded text-2xl font-mono font-bold text-blue-600 flex-1' }, peerId),
            React.createElement('button', {
              onClick: () => copyToClipboard(peerId),
              className: 'p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
            },
              React.createElement(Icon, { icon: copied ? Check : Copy, className: 'w-5 h-5' })
            )
          )
        ),
        
        !isConnected && React.createElement('div', { className: 'space-y-4' },
          React.createElement('button', {
            onClick: handleCreateConnection,
            className: 'w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition'
          }, 'Créer une connexion'),
          
          generatedOffer && React.createElement('div', { className: 'bg-green-50 border-2 border-green-200 rounded-lg p-4' },
            React.createElement('p', { className: 'font-semibold text-green-800 mb-2' }, 'Étape 1 : Copiez ce code'),
            React.createElement('textarea', {
              readOnly: true,
              value: generatedOffer,
              className: 'w-full h-24 p-2 border rounded font-mono text-xs mb-2'
            }),
            React.createElement('button', {
              onClick: () => copyToClipboard(generatedOffer),
              className: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
            }, 'Copier'),
            
            React.createElement('p', { className: 'font-semibold text-green-800 mt-4 mb-2' }, 'Étape 2 : Collez la réponse ici'),
            React.createElement('textarea', {
              value: answerText,
              onChange: (e) => setAnswerText(e.target.value),
              placeholder: 'Collez la réponse reçue...',
              className: 'w-full h-24 p-2 border rounded font-mono text-xs mb-2'
            }),
            React.createElement('button', {
              onClick: handlePasteAnswer,
              className: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
            }, 'Se connecter')
          ),
          
          React.createElement('div', { className: 'border-t pt-4' },
            React.createElement('p', { className: 'font-semibold text-gray-700 mb-2' }, 'Ou collez un code reçu :'),
            React.createElement('textarea', {
              value: offerText,
              onChange: (e) => setOfferText(e.target.value),
              placeholder: 'Collez le code de connexion ici...',
              className: 'w-full h-24 p-2 border rounded font-mono text-xs mb-2'
            }),
            React.createElement('button', {
              onClick: handlePasteOffer,
              className: 'bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700'
            }, 'Répondre'),
            
            answerText && !generatedOffer && React.createElement('div', { className: 'mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4' },
              React.createElement('p', { className: 'font-semibold text-blue-800 mb-2' }, 'Envoyez ce code en réponse :'),
              React.createElement('textarea', {
                readOnly: true,
                value: answerText,
                className: 'w-full h-24 p-2 border rounded font-mono text-xs mb-2'
              }),
              React.createElement('button', {
                onClick: () => copyToClipboard(answerText),
                className: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
              }, 'Copier')
            )
          )
        ),
        
        isConnected && remotePeerId && React.createElement('div', { className: 'bg-green-50 rounded-lg p-4 mb-6' },
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement(Icon, { icon: Smartphone, className: 'w-5 h-5 text-green-600' }),
            React.createElement('span', { className: 'font-semibold text-gray-700' }, 'Connecté à :'),
            React.createElement('code', { className: 'font-mono font-bold text-green-600' }, remotePeerId)
          )
        ),
        
        isConnected && React.createElement('div', { className: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center' },
          React.createElement(Icon, { icon: Upload, className: 'w-12 h-12 text-gray-400 mx-auto mb-4' }),
          React.createElement('p', { className: 'text-gray-600 mb-4' }, 'Glissez des fichiers ici ou cliquez pour sélectionner'),
          React.createElement('input', {
            type: 'file',
            multiple: true,
            onChange: handleFileSelect,
            className: 'hidden',
            id: 'file-input'
          }),
          React.createElement('label', {
            htmlFor: 'file-input',
            className: 'inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold cursor-pointer hover:bg-indigo-700 transition'
          }, 'Sélectionner des fichiers')
        ),
        
        Object.keys(transferProgress).length > 0 && React.createElement('div', { className: 'mt-6' },
          React.createElement('h3', { className: 'font-semibold text-gray-700 mb-3' }, 'Transferts en cours'),
          Object.entries(transferProgress).map(([id, progress]) =>
            React.createElement('div', { key: id, className: 'bg-gray-50 rounded-lg p-3 mb-2' },
              React.createElement('div', { className: 'flex justify-between text-sm mb-1' },
                React.createElement('span', { className: 'text-gray-600' }, 'Transfert...'),
                React.createElement('span', { className: 'text-gray-600' }, Math.round(progress) + '%')
              ),
              React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2' },
                React.createElement('div', {
                  className: 'bg-indigo-600 h-2 rounded-full transition-all',
                  style: { width: progress + '%' }
                })
              )
            )
          )
        ),
        
        receivedFiles.length > 0 && React.createElement('div', { className: 'mt-6' },
          React.createElement('h3', { className: 'font-semibold text-gray-700 mb-3 flex items-center gap-2' },
            React.createElement(Icon, { icon: Download, className: 'w-5 h-5' }),
            'Fichiers reçus'
          ),
          React.createElement('div', { className: 'space-y-2' },
            receivedFiles.map((file) =>
              React.createElement('div', { key: file.id, className: 'bg-green-50 rounded-lg p-4 flex items-center justify-between' },
                React.createElement('div', null,
                  React.createElement('p', { className: 'font-medium text-gray-800' }, file.name),
                  React.createElement('p', { className: 'text-sm text-gray-500' }, (file.size / 1024 / 1024).toFixed(2) + ' MB')
                ),
                React.createElement('a', {
                  href: file.url,
                  download: file.name,
                  className: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition'
                }, 'Télécharger')
              )
            )
          )
        )
      ),
      
      React.createElement('div', { className: 'bg-white rounded-lg shadow p-4 text-sm text-gray-600' },
        React.createElement('p', { className: 'font-semibold mb-2' }, 'Comment utiliser :'),
        React.createElement('ol', { className: 'list-decimal list-inside space-y-1' },
          React.createElement('li', null, 'Cliquez sur "Créer une connexion" sur l\'appareil 1'),
          React.createElement('li', null, 'Copiez le code et envoyez-le à l\'appareil 2 (email, SMS, etc.)'),
          React.createElement('li', null, 'Sur l\'appareil 2, collez le code et cliquez "Répondre"'),
          React.createElement('li', null, 'Copiez la réponse et collez-la sur l\'appareil 1'),
          React.createElement('li', null, 'Une fois connectés, vous pouvez échanger des fichiers !')
        )
      )
    )
  );
}

// Render de l'application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(FileTransferPWA));