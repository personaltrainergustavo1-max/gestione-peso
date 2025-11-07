import { fetchAdvices, fetchRecipes, fetchWeights, fetchPhotos, logoutUser } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
  });

  // Language toggle
  const langBtn = document.getElementById('langToggle');
  langBtn.addEventListener('click', () => { alert('Cambia lingua EN/IT'); });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);

  // Load dashboard
  await loadDashboard();
});

async function loadDashboard() {
  const advices = await fetchAdvices();
  const recipes = await fetchRecipes();
  const weights = await fetchWeights();
  const photos = await fetchPhotos();

  const advicesList = document.getElementById('advicesList');
  advicesList.innerHTML = advices.map(a => `<div class="list-row">${a.title}</div>`).join('');

  const recipesList = document.getElementById('recipesList');
  recipesList.innerHTML = recipes.map(r => `<div class="list-row">${r.title}</div>`).join('');

  // Chart
  const ctx = document.getElementById('weightChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: weights.map(w => w.date),
      datasets: [{
        label: 'Peso',
        data: weights.map(w => w.value),
        borderColor: '#6200ee',
        backgroundColor: 'rgba(98,0,238,0.2)',
        fill: true
      }]
    },
    options: { responsive:true, maintainAspectRatio:false }
  });

  // Photos modal
  const modal = document.getElementById('photoModal');
  const modalImg = document.getElementById('modalImage');
  const photosList = document.getElementById('photosList');
  photosList.innerHTML = photos.map(p => `<img src="${p.url}" class="thumb" style="width:60px;cursor:pointer;margin:2px;">`).join('');
  photosList.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', e => {
      modal.classList.add('show');
      modalImg.src = e.target.src;
    });
  });
  modal.querySelector('.close').addEventListener('click', () => modal.classList.remove('show'));
}
