import { getUserWeights, getUserPhotos } from './api.js'; // funzioni fetch a Firebase/Worker

// ---------- ELEMENTI ----------
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');
const chartContainer = document.getElementById('weightChart');
const photoModal = document.getElementById('photoModal');
const modalImg = document.querySelector('.modal-inner img');
const closeBtn = document.querySelector('.closeBtn');

// ---------- STATO ----------
let currentLang = 'it';
let currentTheme = 'day';
let chartInstance;
let userWeights = [];
let userPhotos = [];

// ---------- FUNZIONI ----------

// Day/Night Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    currentTheme = document.body.classList.contains('dark') ? 'night' : 'day';
});

// Lingua Toggle
langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'it' ? 'en' : 'it';
    translatePage(currentLang);
});

// Traduzione semplice
function translatePage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[lang][key] || key;
    });
}

// Tooltip Foto
const tooltip = document.createElement('div');
tooltip.className = 'tooltip-photo';
document.body.appendChild(tooltip);

function showTooltip(e, photoUrl) {
    tooltip.style.left = e.pageX + 'px';
    tooltip.style.top = e.pageY + 'px';
    tooltip.style.backgroundImage = `url(${photoUrl})`;
    tooltip.style.width = '100px';
    tooltip.style.height = '100px';
    tooltip.style.backgroundSize = 'cover';
    tooltip.classList.add('show');
}

function hideTooltip() {
    tooltip.classList.remove('show');
}

// Modal Foto
function openModal(photoUrl) {
    modalImg.src = photoUrl;
    photoModal.classList.add('show');
}
function closeModal() {
    photoModal.classList.remove('show');
}
closeBtn.addEventListener('click', closeModal);
photoModal.addEventListener('click', e => {
    if (e.target === photoModal) closeModal();
});

// ---------- GRAFICO PESO ----------
async function renderChart(uid) {
    userWeights = await getUserWeights(uid);
    userPhotos = await getUserPhotos(uid); // array di {timestamp, url}

    const labels = userWeights.map(w => w.date);
    const data = userWeights.map(w => w.value);

    const ctx = chartContainer.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentLang === 'it' ? 'Peso (kg)' : 'Weight (kg)',
                data: data,
                borderColor: '#0077cc',
                backgroundColor: 'rgba(0,119,204,0.2)',
                pointRadius: 6,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    enabled: false,
                    external: context => {
                        const point = context.tooltip.dataPoints?.[0];
                        if (!point) { hideTooltip(); return; }
                        const photo = userPhotos.find(p => p.timestamp === point.label);
                        if (photo) {
                            showTooltip(context.tooltip.caretX ? {pageX: context.tooltip.caretX, pageY: context.tooltip.caretY} : {pageX:0,pageY:0}, photo.url);
                        } else {
                            hideTooltip();
                        }
                    }
                }
            }
        }
    });
}

// ---------- TRADUZIONI ----------
const translations = {
    it: {
        'weight-tracking':'Andamento Peso',
        'theme':'Tema',
        'clients':'Clienti',
        'advices':'Consigli Alimentari',
        'recipes':'Ricette',
        'upload-photo':'Upload Foto',
        'add-advice':'Aggiungi Consiglio',
        'add-recipe':'Aggiungi Ricetta',
        'upload':'Carica'
    },
    en: {
        'weight-tracking':'Weight Progress',
        'theme':'Theme',
        'clients':'Clients',
        'advices':'Food Advices',
        'recipes':'Recipes',
        'upload-photo':'Upload Photo',
        'add-advice':'Add Advice',
        'add-recipe':'Add Recipe',
        'upload':'Upload'
    }
};

// ---------- INIZIALIZZAZIONE ----------
document.addEventListener('DOMContentLoaded', async () => {
    translatePage(currentLang);
    // esempio: uid utente loggato
    const uid = 'test-user-uid';
    await renderChart(uid);
});
