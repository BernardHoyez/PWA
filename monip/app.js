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
        var ips = [];
        
        console.log('Début détection IP privée...');
        
        // Vérifier si RTCPeerConnection est disponible
        var RTCPeerConnection = window.RTCPeerConnection || 
                               window.mozRTCPeerConnection || 
                               window.webkitRTCPeerConnection;
        
        if (!RTCPeerConnection) {
            console.log('RTCPeerConnection non supporté');
            resolve('WebRTC non supporté');
            return;
        }
        
        try {
            var rtcConfig = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
            };
            
            var pc = new RTCPeerConnection(rtcConfig);
            
            // Créer un data channel
            pc.createDataChannel('', { reliable: false });
            
            // Gérer les événements de connexion
            pc.oniceconnectionstatechange = function() {
                console.log('ICE Connection State:', pc.iceConnectionState);
            };
            
            pc.onicegatheringstatechange = function() {
                console.log('ICE Gathering State:', pc.iceGatheringState);
            };
            
            // Écouter les candidats ICE
            pc.onicecandidate = function(ice) {
                if (!ice || !ice.candidate) {
                    console.log('Fin des candidats ICE');
                    if (ips.length > 0 && !ipFound) {
                        ipFound = true;
                        pc.close();
                        console.log('IP trouvée:', ips[0]);
                        resolve(ips[0]);
                    }
                    return;
                }
                
                console.log('Candidat ICE reçu:', ice.candidate.candidate);
                
                var candidateStr = ice.candidate.candidate;
                
                // Extraire toutes les IPs du candidat
                var ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g;
                var matches = candidateStr.match(ipRegex);
                
                if (matches) {
                    for (var i = 0; i < matches.length; i++) {
                        var ip = matches[i];
                        console.log('IP extraite:', ip);
                        
                        // Vérifier si c'est une IP privée valide
                        if (ip !== '0.0.0.0' && 
                            !ip.startsWith('127.') &&
                            ip !== '255.255.255.255') {
                            
                            // Priorité aux IPs privées connues
                            if (ip.startsWith('192.168.') || 
                                ip.startsWith('10.') || 
                                ip.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
                                
                                if (ips.indexOf(ip) === -1) {
                                    ips.unshift(ip); // Ajouter au début
                                    console.log('IP privée détectée:', ip);
                                }
                                
                                if (!ipFound) {
                                    ipFound = true;
                                    pc.close();
                                    resolve(ip);
                                    return;
                                }
                            } else {
                                // Autres IPs (peut-être publiques ou de routeur)
                                if (ips.indexOf(ip) === -1) {
                                    ips.push(ip);
                                }
                            }
                        }
                    }
                }
            };
            
            // Créer une offre SDP
            pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }).then(function(offer) {
                console.log('Offre créée');
                return pc.setLocalDescription(offer);
            }).then(function() {
                console.log('Description locale définie');
            }).catch(function(err) {
                console.error('Erreur création offre:', err);
                resolve('Erreur WebRTC: ' + err.message);
            });
            
            // Timeout de 8 secondes
            setTimeout(function() {
                console.log('Timeout atteint. IPs trouvées:', ips);
                if (!ipFound) {
                    pc.close();
                    if (ips.length > 0) {
                        resolve(ips[0]);
                    } else {
                        // Afficher une IP par défaut si rien n'est trouvé
                        resolve('Impossible de détecter');
                    }
                }
            }, 8000);
            
        } catch (e) {
            console.error('Exception WebRTC:', e);
            resolve('Erreur: ' + e.message);
        }
    });
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