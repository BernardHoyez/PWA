// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker enregistré:', reg))
            .catch(err => console.log('Erreur Service Worker:', err));
    });
}

// Variables globales
let hikes = [];
let currentDate = new Date();

// Gestion de l'upload de fichier
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            processExcelData(jsonData);
            showCalendar();
        } catch (error) {
            console.error('Erreur lecture fichier:', error);
            alert('Erreur lors de la lecture du fichier Excel. Vérifiez le format.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(jsonData) {
    hikes = jsonData.map(row => {
        // Recherche de la colonne date
        const dateKey = Object.keys(row).find(key => 
            key.toLowerCase().includes('date')
        );
        const dateData = dateKey ? row[dateKey] : null;

        let hikeDate;
        if (typeof dateData === 'number') {
            hikeDate = new Date((dateData - 25569) * 86400 * 1000);
        } else if (typeof dateData === 'string') {
            hikeDate = new Date(dateData);
        } else if (dateData instanceof Date) {
            hikeDate = dateData;
        }

        return {
            date: hikeDate,
            allFields: row
        };
    }).filter(hike => hike.date && !isNaN(hike.date.getTime()));
}

function showCalendar() {
    document.getElementById('uploadScreen').style.display = 'none';
    document.getElementById('calendarScreen').style.display = 'block';
    renderCalendar();
}

function resetApp() {
    hikes = [];
    currentDate = new Date();
    document.getElementById('calendarScreen').style.display = 'none';
    document.getElementById('uploadScreen').style.display = 'flex';
    document.getElementById('fileInput').value = '';
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const monthTitle = document.getElementById('monthTitle');

    // Titre du mois
    monthTitle.textContent = currentDate.toLocaleDateString('fr-FR', { 
        month: 'long', 
        year: 'numeric' 
    });

    // Calcul des jours du mois
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Construction du calendrier
    let html = '';

    // En-têtes des jours
    const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    dayHeaders.forEach(day => {
        html += `<div class="day-header">${day}</div>`;
    });

    // Cellules vides avant le premier jour
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="day-cell"></div>';
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const hike = getHikeForDate(day);
        const hasHike = !!hike;
        
        let destination = '';
        if (hasHike) {
            const destKey = Object.keys(hike.allFields).find(k => 
                k.toLowerCase().includes('destination') || 
                k.toLowerCase().includes('lieu') ||
                k.toLowerCase().includes('site')
            );
            destination = destKey ? hike.allFields[destKey] : 'Randonnée';
        }

        html += `
            <div class="day-cell ${hasHike ? 'hike-day' : ''}" 
                 ${hasHike ? `onclick="showHikeDetails(${day})"` : ''}>
                <div class="day-cell-date">${day}</div>
                ${hasHike ? `<div class="day-cell-name">${destination}</div>` : ''}
            </div>
        `;
    }

    calendar.innerHTML = html;
}

function getHikeForDate(day) {
    return hikes.find(hike => {
        const hikeDate = new Date(hike.date);
        return hikeDate.getDate() === day &&
               hikeDate.getMonth() === currentDate.getMonth() &&
               hikeDate.getFullYear() === currentDate.getFullYear();
    });
}

function showHikeDetails(day) {
    const hike = getHikeForDate(day);
    if (!hike) return;

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDate = document.getElementById('modalDate');
    const modalBody = document.getElementById('modalBody');

    // Titre (destination)
    const destKey = Object.keys(hike.allFields).find(k => 
        k.toLowerCase().includes('destination') || 
        k.toLowerCase().includes('lieu')
    );
    modalTitle.textContent = destKey ? hike.allFields[destKey] : 'Randonnée';

    // Date
    modalDate.textContent = hike.date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Détails
    let detailsHtml = '<div class="info-grid">';
    Object.keys(hike.allFields).forEach(key => {
        if (key.toLowerCase().includes('date')) return;
        
        const value = hike.allFields[key];
        if (!value) return;

        detailsHtml += `
            <div class="info-item">
                <span class="info-label">${key}:</span>
                <span class="info-value">${value}</span>
            </div>
        `;
    });
    detailsHtml += '</div>';

    modalBody.innerHTML = detailsHtml;
    modal.classList.add('show');
}

function closeModal(event) {
    if (!event || event.target === document.getElementById('modal')) {
        document.getElementById('modal').classList.remove('show');
    }
}

function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    renderCalendar();
}