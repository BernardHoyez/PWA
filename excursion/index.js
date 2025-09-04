import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// --- INITIAL DATA ---

const INITIAL_SITES = [
  {
    id: 'yosemite',
    name: 'Parc national de Yosemite, États-Unis',
    description: "Un parc national à couper le souffle dans les montagnes de la Sierra Nevada en Californie, célèbre pour ses séquoias géants et anciens, et pour Tunnel View, le panorama emblématique de la cascade Bridalveil et des falaises de granit d'El Capitan et du Half Dome.",
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1519046904884-53123b34b2cc?q=80&w=2070&auto=format&fit=crop' },
      { type: 'video-embed', url: 'https://www.youtube.com/embed/9fJEFi3ccwI' },
      { type: 'audio', url: 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_51a2d1d461.mp3' },
    ],
  },
  {
    id: 'serengeti',
    name: 'Parc national du Serengeti, Tanzanie',
    description: "Un vaste écosystème en Afrique de l'Est, célèbre pour sa migration annuelle de plus de 1,5 million de gnous à barbe blanche et de 250 000 zèbres.",
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1534437432098-cfb951a1a9ba?q=80&w=2070&auto=format&fit=crop' },
      { type: 'video-embed', url: 'https://www.youtube.com/embed/9j__dCWj4f0' },
    ],
  },
];

// --- API INITIALIZATION ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPER COMPONENTS ---

const Carousel = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [media]);

  if (!media.length) {
    return React.createElement("div", { className: "carousel-container" }, "Aucune image ou vidéo disponible pour ce site.");
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
            return React.createElement("img", { src: currentMedia.url, alt: "Vue du site" });
        case 'video':
             return React.createElement("video", { controls: true, src: currentMedia.url, key: currentMedia.url });
        case 'video-embed':
            return React.createElement("iframe", { src: currentMedia.url, title: "Vidéo du site", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true });
        default:
            return React.createElement("div", null, "Type de média non supporté");
    }
  }

  return React.createElement(
    "div", { className: "carousel-container" },
    React.createElement(
      "div", { className: "carousel-nav" },
      React.createElement("button", { onClick: goToPrevious, className: "carousel-button left-arrow", "aria-label": "Diapositive précédente" }, "‹"),
      React.createElement("button", { onClick: goToNext, className: "carousel-button right-arrow", "aria-label": "Diapositive suivante" }, "›")
    ),
    React.createElement("div", { className: "carousel-slide" }, renderMedia())
  );
};

// --- VIEW MODE ---

const ViewMode = ({ sites }) => {
  const [currentSiteIndex, setCurrentSiteIndex] = useState(0);
  const [chat, setChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatHistoryRef = useRef(null);

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

  const handleSendMessage = async (e) => {
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
      return React.createElement("div", { className: "main-content" }, "Aucun site disponible. Passez en mode Édition pour en ajouter un !");
  }

  const visualMedia = currentSite.media.filter(m => m.type !== 'audio');
  const audioMedia = currentSite.media.filter(m => m.type === 'audio');

  return React.createElement("div", { className: "main-content" },
    React.createElement("div", { className: "site-navigation" },
      React.createElement("h2", null, currentSite.name),
      React.createElement("div", { className: "nav-buttons" },
        React.createElement("button", { onClick: () => setCurrentSiteIndex(p => Math.max(0, p - 1)), disabled: currentSiteIndex === 0 }, "Précédent"),
        React.createElement("button", { onClick: () => setCurrentSiteIndex(p => Math.min(sites.length - 1, p + 1)), disabled: currentSiteIndex === sites.length - 1 }, "Suivant")
      )
    ),
    currentSite.description && React.createElement("p", { className: "site-description" }, currentSite.description),
    React.createElement(Carousel, { media: visualMedia }),
    audioMedia.length > 0 && React.createElement("div", { className: "site-audio-player" },
      React.createElement("h4", null, "Ambiance sonore"),
      React.createElement("audio", { controls: true, src: audioMedia[0].url, key: currentSite.id + '-audio' }, "Votre navigateur ne supporte pas l'élément audio.")
    ),
    React.createElement("div", { className: "chat-container" },
      React.createElement("div", { className: "chat-history", ref: chatHistoryRef },
        chatHistory.map((entry, index) => React.createElement("div", { key: index, className: `chat-message ${entry.role}` }, entry.text)),
        loading && chatHistory[chatHistory.length - 1]?.role !== 'model' && React.createElement("div", { className: "chat-message model" }, "...")
      ),
      React.createElement("form", { className: "chat-input-form", onSubmit: handleSendMessage },
        React.createElement("input", {
          type: "text",
          value: message,
          onChange: (e) => setMessage(e.target.value),
          placeholder: "Posez une question à votre guide...",
          "aria-label": "Entrée de chat"
        }),
        React.createElement("button", { type: "submit", disabled: loading || !message.trim() }, "Envoyer")
      )
    )
  );
};


// --- EDIT MODE ---

const EditMode = ({ sites, setSites }) => {
    const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? null);
    const [siteName, setSiteName] = useState('');
    const [siteDescription, setSiteDescription] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaType, setMediaType] = useState('image');

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    useEffect(() => {
        setSiteName(selectedSite?.name ?? '');
        setSiteDescription(selectedSite?.description ?? '');
    }, [selectedSite]);

    const handleAddSite = () => {
        const newSite = { id: Date.now().toString(), name: "Nouveau Site", description: "", media: [] };
        setSites(prev => [...prev, newSite]);
        setSelectedSiteId(newSite.id);
    };

    const handleDeleteSite = (id) => {
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
    
    const convertToEmbedUrl = (url) => {
        try {
            const urlObj = new URL(url);
            let videoId = null;
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

    const handleMediaTypeChange = (newType) => {
        setMediaType(newType);
        setMediaUrl('');
        setMediaFile(null);
        const fileInput = document.getElementById('mediaFile');
        if(fileInput) fileInput.value = '';
    };

    const handleAddMedia = (e) => {
        e.preventDefault();
        if (!selectedSiteId) return;

        if ((mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') && mediaFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newMedia = { type: mediaType, url: event.target.result };
                    setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: [...s.media, newMedia] } : s));
                    handleMediaTypeChange(mediaType);
                }
            };
            reader.readAsDataURL(mediaFile);
        } 
        else if (mediaType === 'video-embed' && mediaUrl.trim()) {
            const embedUrl = convertToEmbedUrl(mediaUrl);
            const newMedia = { type: 'video-embed', url: embedUrl };
            setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: [...s.media, newMedia] } : s));
            setMediaUrl('');
        }
    };
    
    const handleDeleteMedia = (mediaIndex) => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, media: s.media.filter((_, i) => i !== mediaIndex) } : s));
    }

    return React.createElement("div", { className: "main-content edit-mode" },
      React.createElement("div", { className: "sites-list" },
        React.createElement("h3", null, "Vos Sites"),
        sites.map(site => React.createElement("div", { key: site.id, className: `site-item ${site.id === selectedSiteId ? 'selected' : ''}` },
          React.createElement("span", { onClick: () => setSelectedSiteId(site.id) }, site.name),
          React.createElement("div", { className: "site-item-buttons" },
            React.createElement("button", { className: "delete-button", onClick: (e) => { e.stopPropagation(); handleDeleteSite(site.id); } }, "Supprimer")
          )
        )),
        React.createElement("button", { className: "button-primary", style: { marginTop: '15px' }, onClick: handleAddSite }, "Ajouter un nouveau site")
      ),
      selectedSite && React.createElement("div", { className: "site-editor" },
        React.createElement("h3", null, `Édition de "${selectedSite.name}"`),
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { htmlFor: "siteName" }, "Nom du site"),
          React.createElement("input", { type: "text", id: "siteName", value: siteName, onChange: e => setSiteName(e.target.value), onBlur: handleUpdateSiteName })
        ),
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { htmlFor: "siteDescription" }, "Description du site"),
          React.createElement("textarea", { id: "siteDescription", value: siteDescription, onChange: e => setSiteDescription(e.target.value), onBlur: handleUpdateSiteDescription, placeholder: "Ajoutez une description pour votre site..." })
        ),
        React.createElement("div", { className: "media-list" },
          React.createElement("h4", null, "Média"),
          React.createElement("ul", null,
            selectedSite.media.map((media, index) => React.createElement("li", { key: index, className: "media-item" },
              React.createElement("span", null, `[${media.type}] ${media.url.substring(0, 50)}...`),
              React.createElement("button", { className: "delete-button", onClick: () => handleDeleteMedia(index) }, "X")
            ))
          )
        ),
        React.createElement("form", { onSubmit: handleAddMedia },
          React.createElement("h4", null, "Ajouter un nouveau média"),
          React.createElement("div", { className: "add-media-form" },
            React.createElement("div", { className: "form-group" },
              React.createElement("label", { htmlFor: "mediaType" }, "Type"),
              React.createElement("select", { id: "mediaType", value: mediaType, onChange: e => handleMediaTypeChange(e.target.value) },
                React.createElement("option", { value: "image" }, "Image (Téléverser)"),
                React.createElement("option", { value: "video" }, "Vidéo (Téléverser)"),
                React.createElement("option", { value: "video-embed" }, "Vidéo (YouTube)"),
                React.createElement("option", { value: "audio" }, "Audio (Téléverser)")
              )
            ),
            React.createElement("div", { className: "form-group" },
              React.createElement("label", { htmlFor: "mediaInput" }, mediaType === 'video-embed' ? 'URL YouTube' : 'Fichier'),
              mediaType === 'video-embed' ?
                React.createElement("input", { id: "mediaInput", type: "url", value: mediaUrl, onChange: e => setMediaUrl(e.target.value), placeholder: "https://youtube.com/watch?v=...", required: true }) :
                React.createElement("input", { id: "mediaFile", type: "file",
                  accept: mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'audio/*',
                  onChange: e => setMediaFile(e.target.files ? e.target.files[0] : null), required: true
                })
            ),
            React.createElement("button", { className: "add-button", type: "submit" }, "Ajouter")
          )
        )
      )
    );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [sites, setSites] = useState(() => {
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
  
  return React.createElement("div", { className: "app-container" },
    React.createElement("header", { className: "app-header" },
      React.createElement("h1", null, "Créateur de Visites Virtuelles"),
      React.createElement("div", { className: "toggle-switch" },
        React.createElement("span", null, "Visualiser"),
        React.createElement("label", { className: "switch" },
          React.createElement("input", { type: "checkbox", checked: isEditMode, onChange: () => setIsEditMode(!isEditMode) }),
          React.createElement("span", { className: "slider" })
        ),
        React.createElement("span", null, "Éditer")
      )
    ),
    isEditMode ? React.createElement(EditMode, { sites: sites, setSites: setSites }) : React.createElement(ViewMode, { sites: sites })
  );
};

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));
