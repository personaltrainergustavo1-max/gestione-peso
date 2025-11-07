// main.js (client)
import {
  loginWithGoogle,
  logoutUser,
  onAuth,
  getCurrentUser,
  fetchAdvices,
  fetchRecipes,
  fetchWeights,
  fetchPhotos,
  workerPhotoUrl
} from "./api.js";

// DOM
const weightCanvas = document.getElementById("weightChart");
const advicesList = document.getElementById("advicesList");
const recipesList = document.getElementById("recipesList");
const photosList = document.getElementById("photosList");
const photoModal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");
const userInfo = document.getElementById("userInfo");

let chartInstance = null;
let photos = [];

// theme/lang init
function applyTheme(theme) {
  document.body.classList.remove("light", "dark");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
}
function applyLang(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);
  translatePage();
}
applyTheme(localStorage.getItem("theme") || "light");
applyLang(localStorage.getItem("lang") || "it");

// toggles
themeToggle?.addEventListener("click", ()=> {
  const nxt = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(nxt);
});
langToggle?.addEventListener("click", ()=> {
  applyLang(document.documentElement.lang === "it" ? "en" : "it");
});

// login/logout handlers (buttons must exist in HTML)
loginBtn?.addEventListener("click", async ()=> {
  try { await loginWithGoogle(); } catch(e){ console.error(e); alert("Login failed: " + e.message); }
});
logoutBtn?.addEventListener("click", async ()=> {
  await logoutUser();
});

// minimal translations
function translatePage(){
  const lang = document.documentElement.lang;
  const map = {
    it: {
      "dashboard":"Dashboard Cliente","theme":"Tema","logout":"Logout",
      "weight-progress":"Andamento Peso","advices":"Consigli Alimentari","recipes":"Ricette","progress-photos":"Foto Progressi"
    },
    en: {
      "dashboard":"Client Dashboard","theme":"Theme","logout":"Logout",
      "weight-progress":"Weight Progress","advices":"Advices","recipes":"Recipes","progress-photos":"Progress Photos"
    }
  };
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.dataset.i18n;
    if(map[lang] && map[lang][k]) el.innerText = map[lang][k];
  });
}
translatePage();

// modal open/close
function openPhotoModal(url) {
  modalImage.src = url;
  photoModal.classList.add("show");
}
function closePhotoModal() {
  photoModal.classList.remove("show");
}
photoModal.querySelector(".close")?.addEventListener("click", closePhotoModal);
photoModal.addEventListener("click", e => { if(e.target === photoModal) closePhotoModal(); });

// auth observer
onAuth(async user => {
  if (!user) {
    // not logged
    loginBtn && (loginBtn.style.display = "inline-block");
    logoutBtn && (logoutBtn.style.display = "none");
    document.querySelector(".dashboard")?.classList.add("hidden");
    userInfo && (userInfo.innerText = "");
    return;
  }
  // logged in
  loginBtn && (loginBtn.style.display = "none");
  logoutBtn && (logoutBtn.style.display = "inline-block");
  document.querySelector(".dashboard")?.classList.remove("hidden");
  userInfo && (userInfo.innerText = `Ciao, ${user.displayName || user.email}`);
  await loadDashboard(user.uid);
});

// load dashboard data
async function loadDashboard(uid) {
  try {
    const [advices, recipes, weights, ps] = await Promise.all([
      fetchAdvices({ clientId: uid, onlyApproved: true }),
      fetchRecipes({ clientId: uid, onlyApproved: true }),
      fetchWeights(uid),
      fetchPhotos(uid)
    ]);
    photos = ps || [];

    // advices
    advicesList.innerHTML = "";
    if (advices.length === 0) advicesList.innerHTML = "<p class='muted'>Nessun consiglio al momento.</p>";
    advices.forEach(a=>{
      const div = document.createElement("div");
      div.className = "list-row";
      div.innerHTML = `<div><strong>${a.title || ""}</strong><div class="muted">${a.text || ""}</div></div>`;
      advicesList.appendChild(div);
    });

    // recipes
    recipesList.innerHTML = "";
    if (recipes.length === 0) recipesList.innerHTML = "<p class='muted'>Nessuna ricetta al momento.</p>";
    recipes.forEach(r=>{
      const div = document.createElement("div");
      div.className = "list-row";
      div.innerHTML = `<div><strong>${r.title || ""}</strong><div class="muted">${r.text || ""}</div></div>`;
      recipesList.appendChild(div);
    });

    // photos grid
    photosList.innerHTML = "";
    photos.forEach(p=>{
      const src = p.url || workerPhotoUrl(p.key);
      const img = document.createElement("img");
      img.src = src;
      img.className = "thumb";
      img.addEventListener("click", ()=> openPhotoModal(src));
      photosList.appendChild(img);
    });

    // chart
    const labels = weights.map(w=>{
      try { const d = new Date(w.date); return isNaN(d) ? String(w.date).slice(0,10) : d.toLocaleDateString(); } catch { return ""; }
    });
    const data = weights.map(w=> Number(w.weight) || 0);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(weightCanvas, {
      type: "line",
      data: { labels, datasets: [{ label: document.documentElement.lang === "it" ? "Peso (kg)" : "Weight (kg)", data, borderColor: "#007bff", backgroundColor: "rgba(0,123,255,0.12)", tension:0.3 }] },
      options: { responsive:true, maintainAspectRatio:false }
    });

  } catch (e) {
    console.error("Dashboard load failed:", e);
    alert("Errore caricamento dashboard: " + e.message);
  }
}
