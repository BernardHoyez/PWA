import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from '@google/genai';

// --- TYPES and INITIAL DATA ---

type MediaType = 'image' | 'video' | 'audio' | 'video-embed';

interface MediaItem {
  type: MediaType;
  url: string;
}

interface Site {
  id: string;
  name: string;
  description?: string;
  media: MediaItem[];
}

const INITIAL_SITES: Site[] = [
  {
    id: 'yosemite',
    name: 'Parc national de Yosemite, États-Unis',
    description: 'Un parc national à couper le souffle dans les montagnes de la Sierra Nevada en Californie, célèbre pour ses séquoias géants et anciens, et pour Tunnel View, le panorama emblématique de la cascade Bridalveil et des falaises de granit d\'El Capitan et du Half Dome.',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519046904884-53123b34b2cc?q=80&w=2070&auto=format&fit=crop' },
      { type: 'video-embed', url: 'https://www.youtube.com/embed/9fJEFi3ccwI' }, // Embed URL
      { type: 'audio', url: 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_51a2d1d461.mp3' },
    ],
  },
  {
    id: 'serengeti',
    name: 'Parc national du Serengeti, Tanzanie',
    description: 'Un vaste écosystème en Afrique de l\'Est, célèbre pour sa migration annuelle de plus de 1,5 million de gnous à barbe blanche et de 250 000 zèbres.',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1534437432098-cfb951a1a9ba?q=80&w=2070&auto=format&fit=crop' },
      { type: 'video-embed', url: 'https://www.youtube.com/embed/9j__dCWj4f0' },
    ],
  },
];

// --- API INITIALIZATION ---

// Per guidelines, API key is from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- HELPER COMPONENTS ---

const Carousel: React.FC<{ media: MediaItem[] }> = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [media]);

  if (!media.length) {
    return <div className="carousel-container">Aucune image ou vidéo disponible pour ce site.</div>;
  }

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? media.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === media.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const currentMedia = media[currentIndex];
    
  const renderMedia = () => {
    switch(currentMedia.type) {
        case 'image':
            return <img src={currentMedia.url} alt="Vue du site" />;
        case 'video':
             return <video controls src={currentMedia.url} key={currentMedia.url}></video>;
        case 'video-embed':
            return <iframe src={currentMedia.url} title="Vidéo du site" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
        default:
            return <div>Type de média non supporté</div>
    }
  }

  return (
    <div className="carousel-container">
      <div className="carousel-nav">
        <button onClick={goToPrevious} className="carousel-button left-arrow" aria-label="Diapositive précédente">‹</button>
        <button onClick={goToNext} className="carousel-button right-arrow" aria-label="Diapositive suivante">›</button>
      </div>
      <div className="carousel-slide">
        {renderMedia()}
      </div>
    </div>
  );
};

// --- VIEW MODE ---

const ViewMode: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const [currentSiteIndex, setCurrentSiteIndex] = useState(0);
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const currentSite = sites[currentSiteIndex];
  
  useEffect(() => {
    if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (currentSite) {
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `Vous êtes un guide touristique sympathique et compétent pour le site naturel "${currentSite.name}". Répondez aux questions de manière concise et engageante en vous basant sur le contexte de ce lieu spécifique.`,
        },
      });
      setChat(newChat);
      setChatHistory([]);
    }
  }, [currentSite]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chat || loading) return;

    const userMessage = { role: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setMessage('');
    
    try {
      const responseStream = await chat.sendMessageStream({ message });
      let fullResponse = '';
      
      setChatHistory(prev => [...prev, { role: 'model', text: '...' }]);
      
      for await (const chunk of responseStream) {
        fullResponse += chunk.text;
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
            return newHistory;
        });
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, {role: 'model', text: "Désolé, j'ai rencontré une erreur."}]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSite) {
      return <div className="main-content">Aucun site disponible. Passez en mode Édition pour en ajouter un !</div>;
  }

  const visualMedia = currentSite.media.filter(m => m.type !== 'audio');
  const audioMedia = currentSite.media.filter(m => m.type === 'audio');

  return (
    <div className="main-content">
      <div className="site-navigation">
        <h2>{currentSite.name}</h2>
        <div className="nav-buttons">
            <button onClick={() => setCurrentSiteIndex(p => Math.max(0, p - 1))} disabled={currentSiteIndex === 0}>Précédent</button>
            <button onClick={() => setCurrentSiteIndex(p => Math.min(sites.length - 1, p + 1))} disabled={currentSiteIndex === sites.length - 1}>Suivant</button>
        </div>
      </div>
      {currentSite.description && <p className="site-description">{currentSite.description}</p>}
      
      <Carousel media={visualMedia} />

      {audioMedia.length > 0 && (
        <div className="site-audio-player">
          <h4>Ambiance sonore</h4>
          <audio controls src={audioMedia[0].url} key={currentSite.id + '-audio'}>
            Votre navigateur ne supporte pas l'élément audio.
          </audio>
        </div>
      )}

      <div className="chat-container">
        <div className="chat-history" ref={chatHistoryRef}>
            {chatHistory.map((entry, index) => (
                <div key={index} className={`chat-message ${entry.role}`}>
                    {entry.text}
                </div>
            ))}
            {loading && chatHistory[chatHistory.length - 1]?.role !== 'model' && (
                <div className="chat-message model">...</div>
            )}
        </div>
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Posez une question à votre guide..."
            aria-label="Entrée de chat"
          />
          <button type="submit" disabled={loading || !message.trim()}>
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
};


// --- EDIT MODE ---

const EditMode: React.FC<{ sites: Site[], setSites: React.Dispatch<React.SetStateAction<Site[]>> }> = ({ sites, setSites }) => {
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(sites[0]?.id ?? null);
    const [siteName, setSiteName] = useState('');
    const [siteDescription, setSiteDescription] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaType, setMediaType] = useState<MediaType>('image');

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    useEffect(() => {
        setSiteName(selectedSite?.name ?? '');
        setSiteDescription(selectedSite?.description ?? '');
    }, [selectedSite]);

    const handleAddSite = () => {
        const newSite: Site = { id: Date.now().toString(), name: "Nouveau Site", description: "", media: [] };
        setSites(prev => [...prev, newSite]);
        setSelectedSiteId(newSite.id);
    };

    const handleDeleteSite = (id: string) => {
        setSites(prev => prev.filter(s => s.id !== id));
        if (selectedSiteId === id) {
            setSelectedSiteId(sites.length > 1 ? sites.find(s => s.id !== id)?.id ?? null : null);
        }
    };

    const handleUpdateSiteName = () => {
        if (!selectedSiteId || !siteName.trim()) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, name: siteName } : s));
    };
    
    const handleUpdateSiteDescription = () => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, description: siteDescription } : s));
    };
    
    const convertToEmbedUrl = (url: string): string => {
        try {
            const urlObj = new URL(url);
            let videoId: string | null = null;
            if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        } catch (e) {
           console.error("Invalid URL for YouTube conversion:", e);
        }
        return url;
    };

    const handleMediaTypeChange = (newType: MediaType) => {
        setMediaType(newType);
        setMediaUrl('');
        setMediaFile(null);
        const fileInput = document.getElementById('mediaFile') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleAddMedia = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSiteId) return;

        // Handle local file uploads
        if ((mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') && mediaFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newMedia: MediaItem = { type: mediaType, url: event.target.result as string };
                    setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: [...s.media, newMedia] } : s));
                    handleMediaTypeChange(mediaType); // Reset fields after successful add
                }
            };
            reader.readAsDataURL(mediaFile);
        } 
        // Handle URL-based media
        else if (mediaType === 'video-embed' && mediaUrl.trim()) {
            const embedUrl = convertToEmbedUrl(mediaUrl);
            const newMedia: MediaItem = { type: 'video-embed', url: embedUrl };
            setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: [...s.media, newMedia] } : s));
            setMediaUrl('');
        }
    };
    
    const handleDeleteMedia = (mediaIndex: number) => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: s.media.filter((_, i) => i !== mediaIndex) } : s));
    }

    return (
        <div className="main-content edit-mode">
            <div className="sites-list">
                <h3>Vos Sites</h3>
                {sites.map(site => (
                    <div key={site.id} className={`site-item ${site.id === selectedSiteId ? 'selected' : ''}`}>
                        <span onClick={() => setSelectedSiteId(site.id)}>{site.name}</span>
                        <div className="site-item-buttons">
                            <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id);}}>Supprimer</button>
                        </div>
                    </div>
                ))}
                <button className="button-primary" style={{marginTop: '15px'}} onClick={handleAddSite}>Ajouter un nouveau site</button>
            </div>

            {selectedSite && (
                <div className="site-editor">
                    <h3>Édition de "{selectedSite.name}"</h3>
                    <div className="form-group">
                        <label htmlFor="siteName">Nom du site</label>
                        <input type="text" id="siteName" value={siteName} onChange={e => setSiteName(e.target.value)} onBlur={handleUpdateSiteName} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="siteDescription">Description du site</label>
                        <textarea id="siteDescription" value={siteDescription} onChange={e => setSiteDescription(e.target.value)} onBlur={handleUpdateSiteDescription} placeholder="Ajoutez une description pour votre site..."></textarea>
                    </div>
                    
                    <div className="media-list">
                        <h4>Média</h4>
                        <ul>
                            {selectedSite.media.map((media, index) => (
                                <li key={index} className="media-item">
                                    <span>[{media.type}] {media.url.substring(0, 50)}...</span>
                                    <button className="delete-button" onClick={() => handleDeleteMedia(index)}>X</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <form onSubmit={handleAddMedia}>
                        <h4>Ajouter un nouveau média</h4>
                        <div className="add-media-form">
                            <div className="form-group">
                                <label htmlFor="mediaType">Type</label>
                                <select id="mediaType" value={mediaType} onChange={e => handleMediaTypeChange(e.target.value as MediaType)}>
                                    <option value="image">Image (Téléverser)</option>
                                    <option value="video">Vidéo (Téléverser)</option>
                                    <option value="video-embed">Vidéo (YouTube)</option>
                                    <option value="audio">Audio (Téléverser)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="mediaInput">{mediaType === 'video-embed' ? 'URL YouTube' : 'Fichier'}</label>
                                {mediaType === 'video-embed' ? (
                                    <input id="mediaInput" type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." required />
                                ) : (
                                    <input id="mediaFile" type="file" 
                                        accept={
                                            mediaType === 'image' ? 'image/*' :
                                            mediaType === 'video' ? 'video/*' : 'audio/*'
                                        }
                                        onChange={e => setMediaFile(e.target.files ? e.target.files[0] : null)} required />
                                )}
                            </div>
                            <button className="add-button" type="submit">Ajouter</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [sites, setSites] = useState<Site[]>(() => {
    try {
        const storedSites = localStorage.getItem('virtual-tour-sites');
        return storedSites ? JSON.parse(storedSites) : INITIAL_SITES;
    } catch (error) {
        console.error("Failed to parse sites from localStorage", error);
        return INITIAL_SITES;
    }
  });

  useEffect(() => {
    try {
        localStorage.setItem('virtual-tour-sites', JSON.stringify(sites));
    } catch (error) {
        console.error("Failed to save sites to localStorage", error);
    }
  }, [sites]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Créateur de Visites Virtuelles</h1>
        <div className="toggle-switch">
          <span>Visualiser</span>
          <label className="switch">
            <input type="checkbox" checked={isEditMode} onChange={() => setIsEditMode(!isEditMode)} />
            <span className="slider"></span>
          </label>
          <span>Éditer</span>
        </div>
      </header>
      
      {isEditMode ? <EditMode sites={sites} setSites={setSites} /> : <ViewMode sites={sites} />}

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);