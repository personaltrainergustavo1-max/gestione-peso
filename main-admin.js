import { fetchClients, fetchAdvices, fetchRecipes, uploadPhoto, logoutUser } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
  });

  // Language toggle
  document.getElementById('langToggle').addEventListener('click', () => { alert('Cambia lingua EN/IT'); });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);

  // Load clients
  const clients = await fetchClients();
  const clientSelect = document.getElementById('clientSelect');
  clientSelect.innerHTML = clients.map(c => `<option value="${c.uid}">${c.name}</option>`).join('');

  // Load advices & recipes
  const advices = await fetchAdvices();
  document.getElementById('advicesAdminList').innerHTML = advices.map(a => `<div class="list-row">${a.title}</div>`).join('');
  const recipes = await fetchRecipes();
  document.getElementById('recipesAdminList').innerHTML = recipes.map(r => `<div class="list-row">${r.title}</div>`).join('');

  // Upload photo
  document.getElementById('uploadPhotoBtn').addEventListener('click', async () => {
    const file = document.getElementById('photoUpload').files[0];
    const clientId = clientSelect.value;
    if(file && clientId) await uploadPhoto(clientId, file);
    alert('Foto caricata!');
  });
});
