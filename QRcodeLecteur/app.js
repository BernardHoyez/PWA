document.addEventListener('DOMContentLoaded', () => {
  // Éléments DOM
  const startBtn = document.getElementById('start-scan');
  const stopBtn = document.getElementById('stop-scan');
  const copyBtn = document.getElementById('copy-btn');
  const shareBtn = document.getElementById('share-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resultBox = document.getElementById('qr-result');
  const scannerSection = document.getElementById('scanner-section');
  const resultSection = document.getElementById('result-section');
  const statusEl = document.getElementById('status');
  const readerEl = document.getElementById('reader');

  let html5QrCode = null;
  let currentResult = '';

  // Initialisation du scanner
  function initScanner() {
    html5QrCode = new Html5Qrcode('reader');
  }

  // Démarrer la lecture
  startBtn.addEventListener('click', async () => {
    try {
      showStatus('🔍 Accès à la caméra...', 'info');
      
      if (!html5QrCode) initScanner();
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Erreurs de lecture normales, ignorées
        }
      );
      
      startBtn.disabled = true;
      stopBtn.disabled = false;
      showStatus('✅ Caméra active - Pointez un QR code', 'success');
      
    } catch (err) {
      console.error('Erreur caméra:', err);
      showStatus('❌ Accès caméra refusé ou indisponible', 'error');
    }
  });

  // Arrêter la lecture
  stopBtn.addEventListener('click', async () => {
    if (html5QrCode?.isScanning) {
      await html5QrCode.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      showStatus('⏹ Lecture arrêtée', 'info');
    }
  });

  // Succès du scan
  function onScanSuccess(decodedText) {
    currentResult = decodedText;
    
    // Arrêter automatiquement après succès
    html5QrCode?.stop().then(() => {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    });
    
    // Afficher le résultat
    resultBox.textContent = decodedText;
    resultBox.dataset.content = decodedText;
    
    // UI update
    scannerSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    
    showStatus('✅ QR code décodé avec succès !', 'success');
    
    // Partager automatiquement si c'est une URL
    if (isValidUrl(decodedText)) {
      showStatus('🔗 URL détectée - Prête à partager', 'info');
    }
  }

  // Copier dans le presse-papiers
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentResult);
      showStatus('📋 Copié dans le presse-papiers !', 'success');
      
      // Feedback visuel
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ Copié !';
      setTimeout(() => copyBtn.textContent = originalText, 1500);
    } catch (err) {
      showStatus('❌ Échec de la copie', 'error');
    }
  });

  // Partager le résultat
  shareBtn.addEventListener('click', async () => {
    if (!navigator.share) {
      // Fallback : copie + message
      await navigator.clipboard.writeText(currentResult);
      showStatus('📋 Partage non supporté - Contenu copié !', 'info');
      return;
    }

    try {
      const shareData = {
        title: 'QRcodeLecteur - Résultat',
        text: `Contenu du QR code :\n${currentResult}`,
        url: isValidUrl(currentResult) ? currentResult : undefined
      };
      
      await navigator.share(shareData);
      showStatus('🔗 Partagé avec succès !', 'success');
    } catch (err) {
      if (err.name !== 'AbortError') {
        showStatus('❌ Échec du partage', 'error');
        console.error('Erreur partage:', err);
      }
    }
  });

  // Réinitialiser pour un nouveau scan
  resetBtn.addEventListener('click', () => {
    currentResult = '';
    resultBox.textContent = '';
    resultBox.dataset.content = '';
    
    resultSection.classList.add('hidden');
    scannerSection.classList.remove('hidden');
    
    showStatus('🔄 Prêt pour un nouveau scan', 'info');
  });

  // Utilitaires
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.style.display = 'none';
      }
    }, 4000);
  }

  // Gestion du mode hors ligne
  window.addEventListener('online', () => showStatus('🌐 Connexion rétablie', 'success'));
  window.addEventListener('offline', () => showStatus('✈ Mode hors ligne - Fonctionnalités limitées', 'info'));

  // Installation PWA prompt (optionnel)
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA installable - Afficher bouton d\'installation si souhaité');
  });
});