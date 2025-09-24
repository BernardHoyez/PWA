// PWA Handler - Gestion de l'installation et fonctionnalités PWA
class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = false;
        this.serviceWorker = null;
        
        this.init();
    }

    async init() {
        console.log('🎯 PWA Handler: Initialisation...');
        
        // Détecter si l'app est en mode standalone
        this.detectStandaloneMode();
        
        // Enregistrer le Service Worker
        await this.registerServiceWorker();
        
        // Configurer l'installation PWA
        this.setupInstallPrompt();
        
        // Écouter les messages du Service Worker
        this.setupServiceWorkerMessages();
        
        // Afficher les notifications PWA si nécessaire
        this.showPWAStatus();
        
        console.log('✅ PWA Handler: Initialisé avec succès');
    }

    // Détection du mode standalone (app installée)
    detectStandaloneMode() {
        this.isStandalone = (
            window.matchMedia && 
            window.matchMedia('(display-mode: standalone)').matches
        ) || (
            window.navigator && 
            window.navigator.standalone === true
        ) || document.referrer.includes('android-app://');

        if (this.isStandalone) {
            console.log('📱 PWA: Application en mode standalone (installée)');
            document.body.classList.add('pwa-standalone');
        } else {
            console.log('🌐 PWA: Application en mode navigateur');
        }
    }

    // Enregistrement du Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/PWA/carte-interactive-poi/service-worker.js');
                this.serviceWorker = registration;
                
                console.log('✅ Service Worker enregistré:', registration.scope);
                
                // Écouter les mises à jour
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Mise à jour du Service Worker détectée');
                    this.handleServiceWorkerUpdate(registration);
                });

                // Vérifier s'il y a déjà un SW en attente
                if (registration.waiting) {
                    this.showUpdateBanner();
                }

            } catch (error) {
                console.error('❌ Erreur enregistrement Service Worker:', error);
            }
        } else {
            console.warn('⚠️ Service Worker non supporté par ce navigateur');
        }
    }

    // Configuration de l'invite d'installation
    setupInstallPrompt() {
        const installContainer = document.getElementById('install-container');
        const installBtn = document.getElementById('install-btn');

        // Écouter l'événement beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📲 PWA: Invite d\'installation disponible');
            
            // Empêcher l'affichage automatique
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Afficher notre bouton d'installation
            if (installContainer && !this.isStandalone) {
                installContainer.style.display = 'block';
            }
        });

        // Gestion du clic sur le bouton d'installation
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.promptInstall();
            });
        }

        // Écouter l'événement d'installation réussie
        window.addEventListener('appinstalled', (e) => {
            console.log('🎉 PWA: Application installée avec succès');
            this.deferredPrompt = null;
            
            if (installContainer) {
                installContainer.style.display = 'none';
            }
            
            this.showInstallSuccessMessage();
        });
    }

    // Déclencher l'installation de la PWA
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ Aucune invite d\'installation disponible');
            return;
        }

        try {
            // Afficher l'invite d'installation
            this.deferredPrompt.prompt();
            
            // Attendre la réponse de l'utilisateur
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`📊 Résultat installation: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('✅ Utilisateur a accepté l\'installation');
            } else {
                console.log('❌ Utilisateur a refusé l\'installation');
            }
            
            // Reset de l'invite
            this.deferredPrompt = null;
        } catch (error) {
            console.error('❌ Erreur lors de l\'installation:', error);
        }
    }

    // Gestion des messages du Service Worker
    setupServiceWorkerMessages() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, message } = event.data;
                
                switch (type) {
                    case 'UPDATE_AVAILABLE':
                        console.log('🔄 Mise à jour disponible:', message);
                        this.showUpdateBanner();
                        break;
                    
                    case 'OFFLINE_READY':
                        console.log('📱 Mode hors-ligne prêt');
                        this.showOfflineReadyMessage();
                        break;
                    
                    default:
                        console.log('📨 Message SW:', event.data);
                }
            });
        }
    }

    // Gestion de la mise à jour du Service Worker
    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 Nouvelle version prête à être activée');
                this.showUpdateBanner();
            }
        });
    }

    // Afficher bannière de mise à jour
    showUpdateBanner() {
        // Créer la bannière si elle n'existe pas
        let updateBanner = document.getElementById('update-banner');
        if (!updateBanner) {
            updateBanner = document.createElement('div');
            updateBanner.id = 'update-banner';
            updateBanner.className = 'update-banner';
            updateBanner.innerHTML = `
                <div class="update-content">
                    <span><i class="fas fa-sync-alt"></i> Une nouvelle version est disponible</span>
                    <button id="update-btn" class="update-btn">Mettre à jour</button>
                    <button id="dismiss-update" class="dismiss-btn">×</button>
                </div>
            `;
            document.body.appendChild(updateBanner);

            // Gérer les événements
            document.getElementById('update-btn').addEventListener('click', () => {
                this.applyUpdate();
            });

            document.getElementById('dismiss-update').addEventListener('click', () => {
                updateBanner.remove();
            });
        }

        updateBanner.style.display = 'block';
    }

    // Appliquer la mise à jour
    async applyUpdate() {
        if (this.serviceWorker && this.serviceWorker.waiting) {
            // Demander au nouveau SW de prendre le contrôle
            this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Recharger la page après un court délai
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    }

    // Afficher statut PWA
    showPWAStatus() {
        if (this.isStandalone) {
            console.log('📱 Mode PWA: Application installée');
            // Optionnel: afficher un indicateur visuel
        } else {
            console.log('🌐 Mode Web: Application dans le navigateur');
        }
    }

    // Message de succès d'installation
    showInstallSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'install-success-message';
        message.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                Application installée avec succès !
            </div>
        `;
        document.body.appendChild(message);

        // Supprimer après 3 secondes
        setTimeout(() => {
            message.remove();
        }, 3000);
    }

    // Message mode hors-ligne prêt
    showOfflineReadyMessage() {
        console.log('📱 L\'application est prête pour le mode hors-ligne');
        // Optionnel: notification à l'utilisateur
    }

    // Cacher des données ZIP pour usage hors-ligne
    cacheVisitData(visitData) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_ZIP_DATA',
                payload: visitData
            });
        }
    }

    // Vérifier le statut de connexion
    setupConnectionStatus() {
        window.addEventListener('online', () => {
            console.log('🌐 Connexion rétablie');
            this.showConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            console.log('📱 Mode hors-ligne activé');
            this.showConnectionStatus(false);
        });
    }

    // Afficher le statut de connexion
    showConnectionStatus(isOnline) {
        const statusIndicator = document.getElementById('connection-status') || 
            this.createConnectionIndicator();

        if (isOnline) {
            statusIndicator.className = 'connection-status online';
            statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> En ligne';
        } else {
            statusIndicator.className = 'connection-status offline';
            statusIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Hors ligne';
        }

        // Masquer après 3 secondes si en ligne
        if (isOnline) {
            setTimeout(() => {
                statusIndicator.style.display = 'none';
            }, 3000);
        }
    }

    // Créer l'indicateur de connexion
    createConnectionIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'connection-status';
        document.body.appendChild(indicator);
        return indicator;
    }
}

// Initialiser le gestionnaire PWA au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    window.pwaHandler = new PWAHandler();
});

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAHandler;
}