import { fetchWeights, fetchPhotos, fetchAdvices, fetchRecipes } from './api.js';
import Chart from 'chart.js/auto';

// Day/Night toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
});

// Lingua toggle
let lang = 'it';
document.getElementById('langToggle').addEventListener('click', () => {
  lang = lang === 'it' ? 'en' : 'it';
  updateTranslations();
});

const i18n = {
  en: { dashboard:"Dashboard", "weight-trend":"Weight Trend", "progress-photos":"Progress Photos", advices:"Advice", recipes:"Recipes", theme:"Theme" },
  it: { dashboard:"Dashboard", "weight-trend":"Andamento Peso", "progress-photos":"Progressi Foto", advices:"Consigli Alimentari", recipes:"Ricette", theme:"Tema" }
};

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = i18n[lang][el.dataset.i18n] || el.textContent;
  });
}

// Modal foto
const modal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");
const captionText = document.getElementById("caption");

document.addEventListener('click', e=>{
  if(e.target.closest('.photo-gallery img')){
    const img = e.target;
    modal.style.display = "block";
    modalImg.src = img.src;
    captionText.textContent = img.alt;
  }
});
document.querySelector(".close").onclick = ()=> modal.style.display="none";

// Grafico peso
const ctx = document.getElementById('weightChart').getContext('2d');
const weightChart = new Chart(ctx, { type:'line', data:{labels:[], datasets:[{label:'Peso', data:[], borderColor:'#5c6bc0', fill:false}]}, options:{responsive:true} });

// Load dashboard
async function loadDashboard(){
  const weights = await fetchWeights();
  weightChart.data.labels = weights.map(w=>w.date);
  weightChart.data.datasets[0].data = weights.map(w=>w.value);
  weightChart.update();

  const photos = await fetchPhotos();
  const gallery = document.querySelector('.photo-gallery');
  gallery.innerHTML = '';
  photos.forEach(p=>{
    const img = document.createElement('img'); img.src=p.url; img.alt=p.date;
    gallery.appendChild(img);
  });

  const advices = await fetchAdvices();
  const advList = document.querySelector('.advices-list');
  advList.innerHTML = advices.map(a=>`<p>${a.text}</p>`).join('');

  const recipes = await fetchRecipes();
  const recList = document.querySelector('.recipes-list');
  recList.innerHTML = recipes.map(r=>`<p>${r.text}</p>`).join('');
}

loadDashboard();
