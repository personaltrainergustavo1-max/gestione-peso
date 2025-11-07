import { fetchClientData, fetchAdminData, uploadPhoto } from './api.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js';

const themeBtn = document.getElementById('toggle-theme');
const langSelect = document.getElementById('lang-select');

// Day/Night toggle
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('theme-dark');
  document.body.classList.toggle('theme-light');
  localStorage.setItem('theme', document.body.className);
});

if(localStorage.getItem('theme')){
  document.body.className = localStorage.getItem('theme');
}

// Language toggle
langSelect.addEventListener('change', (e) => {
  loadLang(e.target.value);
});
function loadLang(lang){
  fetch(`lang_${lang}.json`).then(res=>res.json()).then(dict=>{
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(dict[key]) el.textContent = dict[key];
    });
  });
}
loadLang(langSelect.value);

// Cliente: grafico peso
const ctx = document.getElementById('weight-chart');
let weightChart;
fetchClientData().then(data=>{
  const labels = data.map(d=>d.date);
  const values = data.map(d=>d.weight);
  weightChart = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Peso',
        data:values,
        borderColor:'#2196f3',
        backgroundColor:'rgba(33,150,243,0.2)',
        tension:0.4,
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ display:false } }
    }
  });
});

// Foto overlay
const photosContainer = document.getElementById('photos-container');
fetchClientData().then(data=>{
  data.forEach(d=>{
    if(d.photo){
      const img = document.createElement('img');
      img.src = d.photo;
      img.className = 'photo-thumb';
      img.addEventListener('click', ()=>showModal(d.photo));
      photosContainer.appendChild(img);
    }
  });
});

// Modal
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.modal .close');
closeModal.addEventListener('click', ()=>modal.style.display='none');
function showModal(content){
  modalBody.innerHTML = `<img src="${content}" style="width:100%">`;
  modal.style.display='flex';
}

// Lista consigli/ricette
const advicesList = document.getElementById('advices-list');
const recipesList = document.getElementById('recipes-list');
fetchClientData().then(data=>{
  data.advices.forEach(a=>{
    const li = document.createElement('li');
    li.textContent = a.title;
    advicesList.appendChild(li);
  });
  data.recipes.forEach(r=>{
    const li = document.createElement('li');
    li.textContent = r.title;
    recipesList.appendChild(li);
  });
});

// Admin
const clientSelect = document.getElementById('client-select');
const advicesAdminList = document.getElementById('advices-admin-list');
const recipesAdminList = document.getElementById('recipes-admin-list');
const photoUpload = document.getElementById('photo-upload');
const uploadBtn = document.getElementById('upload-btn');

fetchAdminData().then(data=>{
  data.clients.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.uid;
    opt.textContent = c.name;
    clientSelect.appendChild(opt);
  });

  data.advices.forEach(a=>{
    const li = document.createElement('li');
    li.textContent = a.title;
    const btn = document.createElement('button');
    btn.textContent='✔';
    btn.addEventListener('click', ()=> approveAdvice(a.id,true));
    li.appendChild(btn);
    advicesAdminList.appendChild(li);
  });

  data.recipes.forEach(r=>{
    const li = document.createElement('li');
    li.textContent = r.title;
    const btn = document.createElement('button');
    btn.textContent='✔';
    btn.addEventListener('click', ()=> approveRecipe(r.id,true));
    li.appendChild(btn);
    recipesAdminList.appendChild(li);
  });
});

uploadBtn.addEventListener('click', ()=>{
  const file = photoUpload.files[0];
  const clientId = clientSelect.value;
  if(file && clientId) uploadPhoto(clientId,file);
});
