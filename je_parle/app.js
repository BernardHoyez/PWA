const BASE_URL = '/PWA/je_parle/'; // Chemin de base pour la PWA
const synth = window.speechSynthesis;
const textInput = document.getElementById('text-input');
const voiceSelect = document.getElementById('voice-select');
const speakButton = document.getElementById('speak-button');
const saveButton = document.getElementById('save-button');

// --- 1. Gestion des Voix ---
function populateVoiceList() {
    const voices = synth.getVoices();
    voiceSelect.innerHTML = ''; 

    const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr'));

    let frenchMaleVoice = frenchVoices.find(
        voice => voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('homme')
    );
    
    frenchVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-name', voice.name);
        
        if (frenchMaleVoice && voice.name === frenchMaleVoice.name) {
            option.selected = true;
        }
        
        voiceSelect.appendChild(option);
    });
}

if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
} else {
    // Si l'événement ne se déclenche pas, tentez de charger immédiatement
    populateVoiceList();
}


// --- 2. Fonction de lecture ---
function speakText() {
    if (synth.speaking) {
        synth.cancel(); 
    }

    if (!textInput.value.trim()) return;

    const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
    const selectedVoice = synth.getVoices().find(v => v.name === selectedVoiceName);

    const utterance = new SpeechSynthesisUtterance(textInput.value);
    utterance.voice = selectedVoice;
    
    // Pour une expérience utilisateur complète, vous pouvez désactiver le bouton Parler pendant la lecture
    speakButton.disabled = true;

    utterance.onend = () => {
        speakButton.disabled = false;
    };
    utterance.onerror = (event) => {
        console.error('Erreur de synthèse vocale:', event.error);
        speakButton.disabled = false;
    };

    synth.speak(utterance);
}

speakButton.addEventListener('click', speakText);

// --- 3. Gestion de la Sauvegarde (DÉSACTIVÉE avec un message) ---
saveButton.addEventListener('click', () => {
    alert("La sauvegarde audio est indisponible dans cette version 100% client (API SpeechSynthesis native).");
});

// --- 4. Enregistrement du Service Worker (CHEMIN MIS À JOUR) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Enregistre le SW à /PWA/je_parle/sw.js avec la portée /PWA/je_parle/
        navigator.serviceWorker.register(BASE_URL + 'sw.js', { scope: BASE_URL })
            .then(reg => {
                console.log('Service Worker enregistré. Portée:', reg.scope);
            })
            .catch(err => {
                console.error('Échec de l\'enregistrement du Service Worker:', err);
            });
    });
}