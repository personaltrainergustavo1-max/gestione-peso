import { fetchClients, fetchAdvices, fetchRecipes, addAdvice, addRecipe, uploadPhoto } from './api.js';

let selectedClient = null;

// Toggles
document.getElementById('themeToggle').addEventListener('click', ()=>{
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current==='dark'?'light':'dark');
});

let lang = 'it';
document.getElementById('langToggle').addEventListener('click', ()=>{
  lang = lang==='it'?'en':'it';
  updateTranslations();
});

const i18n = {
  en:{'admin-panel':'Admin Panel','clients':'Clients','advices':'Advice','recipes':'Recipes','add-advice':'Add Advice','add-recipe':'Add Recipe','upload':'Upload','upload-photo':'Upload Client Photo','theme':'Theme'},
  it:{'admin-panel':'Pannello Admin','clients':'Clienti','advices':'Consigli Alimentari','recipes':'Ricette','add-advice':'Aggiungi Consiglio','add-recipe':'Aggiungi Ricetta','upload':'Carica','upload-photo':'Upload Foto Cliente','theme':'Tema'}
};

function updateTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = i18n[lang][el.dataset.i18n]||el.textContent;
  });
}

// Load clients
async function loadClients(){
  const clients = await fetchClients();
  const select = document.getElementById('clientSelect');
  select.innerHTML = '';
  clients.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.uid; opt.textContent = c.name;
    select.appendChild(opt);
  });
  selectedClient = select.value;
  select.addEventListener('change', e=>selectedClient=e.target.value);
}
loadClients();

// Load Advices and Recipes
async function loadAdminData(){
  const advices = await fetchAdvices();
  document.getElementById('advicesAdminList').innerHTML = advices.map(a=>`<p>${a.text}</p>`).join('');
  const recipes = await fetchRecipes();
  document.getElementById('recipesAdminList').innerHTML = recipes.map(r=>`<p>${r.text}</p>`).join('');
}
loadAdminData();

// Upload foto
document.getElementById('uploadPhotoBtn').addEventListener('click', async ()=>{
  const file = document.getElementById('photoUpload').files[0];
  if(file && selectedClient){
    const res = await uploadPhoto(selectedClient, file);
    if(res.success) alert('Foto caricata correttamente');
  }
});
