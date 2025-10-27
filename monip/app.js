var publicIPValue = '';
var privateIPValue = '';

function getPublicIP() {
    return new Promise(function(resolve, reject) {
        var apis = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json',
            'https://jsonip.com',
            'https://api.seeip.org/jsonip'
        ];

        var tryNextAPI = function(index) {
            if (index >= apis.length) {
                reject(new Error('Toutes les APIs ont échoué'));
                return;
            }

            fetch(apis[index])
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    resolve(data.ip);
                })
                .catch(function(e) {
                    console.log('Erreur avec ' + apis[index]);
                    tryNextAPI(index + 1);
                });
        };

        tryNextAPI(0);
    });
}

function getIPInfo(ip) {
    return new Promise(function(resolve) {
        fetch('https://ipapi.co/' + ip + '/json/')
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                resolve(data);
            })
            .catch(function(e) {
                resolve(null);
            });
    });
}

function getPrivateIP() {
    return new Promise(function(resolve) {
        var ipFound = false;
        
        // Méthode 1: WebRTC avec configuration améliorée
        try {
            var rtcConfig = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };
            
            var pc = new RTCPeerConnection(rtcConfig);
            
            // Créer un data channel
            pc.createDataChannel('');
            
            // Créer une offre
            pc.createOffer().then(function(offer) {
                return pc.setLocalDescription(offer);
            }).catch(function(err) {
                console.log('Erreur createOffer:', err);
            });
            
            // Écouter les candidats ICE
            pc.onicecandidate = function(ice) {
                if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                
                var candidate = ice.candidate.candidate;
                var parts = candidate.split(' ');
                
                // Extraire l'IP du candidat
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    // Vérifier si c'est une IP privée valide
                    if (part.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d{1,3}\.\d{1,3}$/)) {
                        if (!ipFound) {
                            ipFound = true;
                            pc.close();
                            resolve(part);
                        }
                        return;
                    }
                    // Accepter aussi d'autres IPs locales
                    if (part.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) && 
                        part !== '0.0.0.0' && 
                        !part.startsWith('127.')) {
                        if (!ipFound) {
                            ipFound = true;
                            pc.close();
                            resolve(part);
                        }
                        return;
                    }
                }
            };
            
            // Timeout plus long
            setTimeout(function() {
                if (!ipFound) {
                    pc.close();
                    // Méthode 2: Essayer via un appel API qui renvoie l'IP locale
                    tryLocalAPIMethod(resolve);
                }
            }, 5000);
            
        } catch (e) {
            console.log('WebRTC non disponible:', e);
            tryLocalAPIMethod(resolve);
        }
    });
}

function tryLocalAPIMethod(resolve) {
    // Méthode alternative: afficher un message informatif
    var userAgent = navigator.userAgent.toLowerCase();
    var browserInfo = '';
    
    if (userAgent.indexOf('firefox') > -1) {
        browserInfo = 'Firefox bloque WebRTC';
    } else if (userAgent.indexOf('chrome') > -1) {
        browserInfo = 'Chrome - WebRTC restreint';
    } else if (userAgent.indexOf('safari') > -1) {
        browserInfo = 'Safari - Permissions requises';
    }
    
    // Vérifier si on est en localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        resolve('127.0.0.1 (localhost)');
    } else {
        resolve('WebRTC bloqué - ' + (browserInfo || 'Vérifiez les permissions'));
    }
}

function fetchAllIPs() {
    var refreshBtn = document.getElementById('refreshBtn');
    var refreshText = document.getElementById('refreshText');
    var publicIPEl = document.getElementById('publicIP');
    var privateIPEl = document.getElementById('privateIP');
    var publicInfoEl = document.getElementById('publicInfo');

    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');
    refreshText.textContent = 'Actualisation...';

    getPublicIP()
        .then(function(ip) {
            publicIPValue = ip;
            publicIPEl.textContent = ip;
            publicIPEl.classList.remove('error', 'loading');
            return getIPInfo(ip);
        })
        .then(function(info) {
            if (info && info.city && info.country_name) {
                publicInfoEl.style.display = 'block';
                publicInfoEl.innerHTML = '<p>📍 ' + info.city + ', ' + info.country_name + '</p>' + (info.org ? '<p>🌐 ' + info.org + '</p>' : '');
            }
        })
        .catch(function(e) {
            publicIPEl.textContent = 'Erreur de connexion';
            publicIPEl.classList.add('error');
        });

    getPrivateIP()
        .then(function(localIP) {
            privateIPValue = localIP;
            privateIPEl.textContent = localIP;
            privateIPEl.classList.remove('loading');
        })
        .catch(function(e) {
            privateIPEl.textContent = 'Non disponible';
        })
        .finally(function() {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
            refreshText.textContent = 'Actualiser';
        });
}

function copyToClipboard(text, buttonId) {
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(buttonId);
        btn.classList.add('copied');
        setTimeout(function() {
            btn.classList.remove('copied');
        }, 2000);
    });
}

document.getElementById('copyPublic').addEventListener('click', function() {
    if (publicIPValue) copyToClipboard(publicIPValue, 'copyPublic');
});

document.getElementById('copyPrivate').addEventListener('click', function() {
    if (privateIPValue) copyToClipboard(privateIPValue, 'copyPrivate');
});

document.getElementById('refreshBtn').addEventListener('click', fetchAllIPs);

fetchAllIPs();