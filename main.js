import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
  authDomain: "gestione-peso-1d758.firebaseapp.com",
  projectId: "gestione-peso-1d758",
  storageBucket: "gestione-peso-1d758.appspot.com",
  messagingSenderId: "121949363903",
  appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
  measurementId: "G-WGBB30D5FK"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");
const advicesList = document.getElementById("advicesList");
const recipesList = document.getElementById("recipesList");
const photosGrid = document.getElementById("photosGrid");
const weightChartEl = document.getElementById("weightChart");

// Theme toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// Language toggle
langToggle.addEventListener("click", () => {
  const current = document.documentElement.lang;
  document.documentElement.lang = current === "it" ? "en" : "it";
  loadTranslations();
});

// Example translations
const translations = {
  en: { "dashboard":"Client Dashboard","weight-trend":"Weight Trend","advices":"Diet Advices","recipes":"Recipes","photos":"Photos","theme":"Theme" },
  it: { "dashboard":"Dashboard Cliente","weight-trend":"Andamento Peso","advices":"Consigli Alimentari","recipes":"Ricette","photos":"Foto Progressi","theme":"Tema" }
};
function loadTranslations() {
  const lang = document.documentElement.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.innerText = translations[lang][key];
  });
}

// Fetch Firestore data
async function loadClientData(uid) {
  // Advices
  const advicesSnap = await getDocs(collection(db, `users/${uid}/advices`));
  advicesList.innerHTML = "";
  advicesSnap.forEach(doc => {
    const div = document.createElement("div");
    div.classList.add("card-item");
    div.innerText = doc.data().text;
    advicesList.appendChild(div);
  });

  // Recipes
  const recipesSnap = await getDocs(collection(db, `users/${uid}/recipes`));
  recipesList.innerHTML = "";
  recipesSnap.forEach(doc => {
    const div = document.createElement("div");
    div.classList.add("card-item");
    div.innerText = doc.data().text;
    recipesList.appendChild(div);
  });

  // Photos
  const photosSnap = await getDocs(collection(db, `users/${uid}/photos`));
  photosGrid.innerHTML = "";
  photosSnap.forEach(doc => {
    const img = document.createElement("img");
    img.src = doc.data().url;
    img.classList.add("photo-thumb");
    img.addEventListener("click", () => openModal(img));
    photosGrid.appendChild(img);
  });

  // Weight chart
  const weightsSnap = await getDocs(query(collection(db, `users/${uid}/weights`), orderBy("date")));
  const labels = [];
  const data = [];
  weightsSnap.forEach(doc => {
    labels.push(new Date(doc.data().date.seconds*1000).toLocaleDateString());
    data.push(doc.data().weight);
  });
  new Chart(weightChartEl, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Weight', data, borderColor: '#007bff', fill: false }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Photo modal
const modal = document.getElementById("photoModal");
const modalImg = document.getElementById("modalImg");
const caption = document.getElementById("caption");
const closeModal = modal.querySelector(".close");
function openModal(img) {
  modal.style.display = "block";
  modalImg.src = img.src;
  caption.innerText = img.alt || "";
}
closeModal.onclick = () => modal.style.display = "none";

// Auth listener
onAuthStateChanged(auth, user => {
  if (user) loadClientData(user.uid);
  else window.location.href = "login.html";
});

// Initialize translations
loadTranslations();
