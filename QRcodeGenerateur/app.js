// State management
let qrcode = null;
let history = [];
let deferredPrompt = null;
let currentQRData = null;

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker enregistré:', registration);
                showStatus('✅ Application installée - fonctionne hors ligne!', 'online');
            })
            .catch(error => {
                console.log('Erreur Service Worker:', error);
                showStatus('⚠️ Mode en ligne uniquement', 'offline');
            });
    });
}

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.add('show');
});

document.getElementById('installButton').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('installPrompt').classList.remove('show');
        showStatus('✅ Application installée avec succès!', 'success');
    }
    deferredPrompt = null;
});

// Détection si déjà installé
window.addEventListener('appinstalled', () => {
    document.getElementById('installPrompt').classList.remove('show');
    showStatus('✅ Application installée!', 'success');
});

// Color pickers
document.getElementById('colorDark').addEventListener('input', (e) => {
    document.getElementById('colorDarkValue').textContent = e.target.value;
});

document.getElementById('colorLight').addEventListener('input', (e) => {
    document.getElementById('colorLightValue').textContent = e.target.value;
});

// Status message
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status show ${type}`;
    setTimeout(() => status.classList.remove('show'), 3000);
}

// Generate QR Code
function generateQR() {
    const text = document.getElementById('text').value.trim();
    if (!text) {
        showStatus('⚠️ Veuillez entrer du texte', 'offline');
        return;
    }

    const size = parseInt(document.getElementById('size').value);
    const colorDark = document.getElementById('colorDark').value;
    const colorLight = document.getElementById('colorLight').value;

    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';

    qrcode = new QRCode(qrcodeDiv, {
        text: text,
        width: size,
        height: size,
        colorDark: colorDark,
        colorLight: colorLight,
        correctLevel: QRCode.CorrectLevel.H
    });

    currentQRData = { text, size, colorDark, colorLight };

    // Add to history
    addToHistory(text);
    showStatus('✅ QR Code généré avec succès!', 'success');
}

// Download QR Code
function downloadQR() {
    if (!qrcode) {
        showStatus('⚠️ Générez d\'abord un QR code', 'offline');
        return;
    }

    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        showStatus('⚠️ Erreur: canvas introuvable', 'offline');
        return;
    }

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatus('📥 QR Code téléchargé!', 'success');
}

// Share QR Code
async function shareQR() {
    if (!qrcode) {
        showStatus('⚠️ Générez d\'abord un QR code', 'offline');
        return;
    }

    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        showStatus('⚠️ Erreur: canvas introuvable', 'offline');
        return;
    }
    
    if (navigator.share) {
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'qrcode.png', { type: 'image/png' });
            
            try {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'QR Code',
                        text: 'Partagé depuis QR Generator'
                    });
                    showStatus('✅ QR Code partagé!', 'success');
                } else {
                    // Fallback: partage du texte uniquement
                    await navigator.share({
                        title: 'QR Code',
                        text: currentQRData.text
                    });
                    showStatus('✅ Texte partagé!', 'success');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    showStatus('⚠️ Partage annulé', 'offline');
                }
            }
        });
    } else {
        showStatus('⚠️ Partage non supporté sur ce navigateur', 'offline');
    }
}

// History management
function addToHistory(text) {
    const time = new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    history.unshift({ text, time, data: {...currentQRData} });
    if (history.length > 10) history.pop();
    
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    if (history.length === 0) {
        historyList.innerHTML = '<p style="color: #6b7280; text-align: center;">Aucun historique</p>';
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" onclick="loadFromHistory(${index})">
            <span class="history-text">${escapeHtml(item.text)}</span>
            <span class="history-time">${item.time}</span>
        </div>
    `).join('');
}

function loadFromHistory(index) {
    const item = history[index];
    document.getElementById('text').value = item.data.text;
    document.getElementById('size').value = item.data.size;
    document.getElementById('colorDark').value = item.data.colorDark;
    document.getElementById('colorLight').value = item.data.colorLight;
    document.getElementById('colorDarkValue').textContent = item.data.colorDark;
    document.getElementById('colorLightValue').textContent = item.data.colorLight;
    generateQR();
}

// Escape HTML pour sécurité
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enter key to generate
document.getElementById('text').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateQR();
});

// Initialize
updateHistoryDisplay();