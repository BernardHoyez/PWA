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
        var pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        
        pc.createOffer().then(function(offer) {
            return pc.setLocalDescription(offer);
        });
        
        pc.onicecandidate = function(ice) {
            if (!ice || !ice.candidate || !ice.candidate.candidate) return;
            
            var parts = ice.candidate.candidate.split(' ');
            var ip = parts[4];
            
            if (ip && ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
                pc.close();
                resolve(ip);
            }
        };
        
        setTimeout(function() {
            pc.close();
            resolve('Non disponible');
        }, 3000);
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