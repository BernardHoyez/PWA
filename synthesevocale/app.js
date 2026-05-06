// Synthèse Vocale PWA - app.js

document.addEventListener('DOMContentLoaded', () => {
  // Éléments DOM
  const textInput = document.getElementById('textInput');
  const charCount = document.getElementById('charCount');
  const voiceSelect = document.getElementById('voiceSelect');
  const rateSlider = document.getElementById('rateSlider');
  const rateValue = document.getElementById('rateValue');
  const pitchSlider = document.getElementById('pitchSlider');
  const pitchValue = document.getElementById('pitchValue');
  const speakBtn = document.getElementById('speakBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusSection = document.getElementById('statusSection');
  const statusText = document.getElementById('statusText');
  const statusIndicator = document.getElementById('statusIndicator');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  // État de l'application
  let voices = [];
  let isSpeaking = false;
  let isPaused = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let synth = window.speechSynthesis;

  // Initialisation
  init();

  function init() {
    // Compteur de caractères
    textInput.addEventListener('input', () => {
      charCount.textContent = textInput.value.length;
      updateDownloadButton();
    });

    // Contrôles de synthèse
    rateSlider.addEventListener('input', (e) => {
      rateValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    pitchSlider.addEventListener('input', (e) => {
      pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Chargement des voix
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Événements boutons
    speakBtn.addEventListener('click', toggleSpeech);
    pauseBtn.addEventListener('click', togglePause);
    stopBtn.addEventListener('click', stopSpeech);
    downloadBtn.addEventListener('click', downloadAudio);

    // Gestion de la fin de lecture
    synth.onend = () => {
      isSpeaking = false;
      isPaused = false;
      updateButtons();
      updateStatus('✅ Lecture terminée', 'success');
      stopRecording();
    };

    synth.onerror = (event) => {
      console.error('Erreur TTS:', event);
      isSpeaking = false;
      isPaused = false;
      updateButtons();
      updateStatus('❌ Erreur de synthèse', 'error');
      stopRecording();
    };

    // Enregistrement du Service Worker
    registerServiceWorker();
    
    // Gestion de l'installation PWA
    setupPWAInstall();
  }

  function loadVoices() {
    voices = synth.getVoices().filter(voice => voice.lang.startsWith('fr'));
    
    // Fallback si pas de voix FR
    if (voices.length === 0) {
      voices = synth.getVoices();
    }
    
    voiceSelect.innerHTML = voices.map((voice, index) => 
      `<option value="${index}">${voice.name} (${voice.lang})</option>`
    ).join('');
    
    // Sélectionner une voix FR par défaut
    const frenchVoiceIndex = voices.findIndex(v => v.lang.startsWith('fr'));
    if (frenchVoiceIndex !== -1) {
      voiceSelect.selectedIndex = frenchVoiceIndex;
    }
  }

  function toggleSpeech() {
    if (isSpeaking && !isPaused) {
      // Pause implicite
      togglePause();
      return;
    }

    const text = textInput.value.trim();
    if (!text) {
      updateStatus('⚠️ Veuillez entrer du texte', 'warning');
      return;
    }

    if (synth.speaking && !isPaused) {
      synth.cancel();
    }

    // Démarrer l'enregistrement si supporté
    startRecording();

    // Configuration de l'utterance
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices[voiceSelect.selectedIndex];
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = parseFloat(rateSlider.value);
    utterance.pitch = parseFloat(pitchSlider.value);
    
    utterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
      updateButtons();
      updateStatus('🔊 Lecture en cours...', 'info');
      showProgress(true);
    };

    utterance.onboundary = (event) => {
      // Mise à jour de la progression (approximative)
      const progress = Math.round((event.charIndex / text.length) * 100);
      progressBar.value = progress;
    };

    synth.speak(utterance);
  }

  function togglePause() {
    if (!isSpeaking) return;
    
    if (isPaused) {
      synth.resume();
      isPaused = false;
      updateStatus('🔊 Lecture reprise', 'info');
    } else {
      synth.pause();
      isPaused = true;
      updateStatus('⏸️ Lecture en pause', 'warning');
    }
    updateButtons();
  }

  function stopSpeech() {
    synth.cancel();
    isSpeaking = false;
    isPaused = false;
    updateButtons();
    updateStatus('⏹️ Lecture arrêtée', 'info');
    showProgress(false);
    stopRecording();
  }

  // === Gestion de l'enregistrement audio ===
  
  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      console.warn('MediaRecorder non supporté');
      downloadBtn.disabled = true;
      return;
    }

    try {
      // Demander l'accès au microphone (pour capture système si disponible)
      // Note: La capture directe de speechSynthesis n'est pas possible
      // On utilise une approche alternative avec un avertissement
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = saveAudioFile;
      mediaRecorder.start();
      
      downloadBtn.disabled = false;
      updateStatus('🎙️ Enregistrement actif...', 'info');
      
    } catch (err) {
      console.warn('Enregistrement indisponible:', err);
      downloadBtn.disabled = true;
      downloadBtn.title = 'Enregistrement non disponible - autorisez le microphone';
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      
      // Arrêter les tracks du stream
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  function saveAudioFile() {
    if (audioChunks.length === 0) {
      updateStatus('⚠️ Aucun audio à sauvegarder', 'warning');
      return;
    }

    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthese-${new Date().toISOString().slice(0,10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateStatus('✅ Audio sauvegardé !', 'success');
    downloadBtn.disabled = true;
  }

  function updateDownloadButton() {
    downloadBtn.disabled = !textInput.value.trim() || isSpeaking;
  }

  // === Interface Utilisateur ===
  
  function updateButtons() {
    speakBtn.textContent = isSpeaking && !isPaused ? '⏸️ Pause' : '🔊 Lire';
    pauseBtn.disabled = !isSpeaking;
    stopBtn.disabled = !isSpeaking;
    downloadBtn.disabled = !textInput.value.trim() || isSpeaking;
  }

  function updateStatus(message, type) {
    statusSection.hidden = false;
    statusText.textContent = message;
    statusIndicator.className = `status-indicator ${type}`;
    
    // Auto-hide après 5 secondes pour les messages non-critiques
    if (type !== 'error') {
      setTimeout(() => {
        if (statusText.textContent === message) {
          statusSection.hidden = true;
        }
      }, 5000);
    }
  }

  function showProgress(show) {
    progressContainer.hidden = !show;
    if (!show) progressBar.value = 0;
  }

  // === Service Worker ===
  
  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('❌ Échec enregistrement SW:', error);
      }
    }
  }

  function showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mise à jour disponible', {
        body: 'Une nouvelle version de Synthèse Vocale est prête. Rechargez la page.',
        icon: 'icon192.png'
      });
    }
  }

  // === Installation PWA ===
  
  let deferredPrompt;
  
  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Optionnel: Afficher un bouton "Installer"
      console.log('📱 PWA installable');
    });

    // Demander l'installation après interaction utilisateur
    document.addEventListener('click', async () => {
      if (deferredPrompt && 'Notification' in window) {
        // Optionnel: Proposer l'installation
        // deferredPrompt.prompt();
        // const { outcome } = await deferredPrompt.userChoice;
        // deferredPrompt = null;
      }
    }, { once: true });

    // Demander permission notifications
    if ('Notification' in window && Notification.permission === 'default') {
      // Notification.requestPermission(); // Décommenter si souhaité
    }
  }

  // Gestion du clavier
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      toggleSpeech();
    }
  });
});