// main-admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
    authDomain: "gestione-peso-1d758.firebaseapp.com",
    projectId: "gestione-peso-1d758",
    storageBucket: "gestione-peso-1d758.firebasestorage.app",
    messagingSenderId: "121949363903",
    appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
    measurementId: "G-WGBB30D5FK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- ELEMENTI DOM ---
const clientSelect = document.getElementById("clientSelect");
const addAdviceBtn = document.getElementById("addAdviceBtn");
const addRecipeBtn = document.getElementById("addRecipeBtn");
const adviceModal = document.getElementById("adviceModal");
const recipeModal = document.getElementById("recipeModal");
const saveAdviceBtn = document.getElementById("saveAdviceBtn");
const saveRecipeBtn = document.getElementById("saveRecipeBtn");
const adviceText = document.getElementById("adviceText");
const recipeText = document.getElementById("recipeText");
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");
const photoUpload = document.getElementById("photoUpload");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const uploadFeedback = document.getElementById("uploadFeedback");

// --- UTILITY MODALI ---
function openModal(modal) {
    modal.style.display = "flex";
    modal.classList.add("fade-in");
}
function closeModal(modal) {
    modal.classList.remove("fade-in");
    modal.style.display = "none";
}
document.querySelectorAll(".closeBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        closeModal(btn.closest(".modal"));
    });
});

// --- TOGGLE DAY/NIGHT ---
themeToggle.addEventListener("click", () => {
    const currentTheme = document.body.dataset.theme;
    document.body.dataset.theme = currentTheme === "light" ? "dark" : "light";
});

// --- TOGGLE LINGUA ---
let currentLang = "it";
const translations = {
    "admin-panel": { en: "Admin Panel", it: "Pannello Admin" },
    "clients": { en: "Clients", it: "Clienti" },
    "advices": { en: "Advices", it: "Consigli Alimentari" },
    "recipes": { en: "Recipes", it: "Ricette" },
    "add-advice": { en: "Add Advice", it: "Aggiungi Consiglio" },
    "add-recipe": { en: "Add Recipe", it: "Aggiungi Ricetta" },
    "upload-photo": { en: "Upload Client Photo", it: "Upload Foto Cliente" },
    "upload": { en: "Upload", it: "Carica" },
    "save": { en: "Save", it: "Salva" },
};
langToggle.addEventListener("click", () => {
    currentLang = currentLang === "it" ? "en" : "it";
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        el.innerText = translations[key][currentLang];
    });
});

// --- CARICAMENTO CLIENTI ---
async function loadClients() {
    const usersSnap = await getDocs(collection(db, "users"));
    clientSelect.innerHTML = "<option value=''>Seleziona Cliente</option>";
    usersSnap.forEach(docSnap => {
        const data = docSnap.data();
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = data.displayName || docSnap.id;
        clientSelect.appendChild(option);
    });
}
loadClients();

// --- APRI MODALI ---
addAdviceBtn.addEventListener("click", () => openModal(adviceModal));
addRecipeBtn.addEventListener("click", () => openModal(recipeModal));

// --- SALVA CONSIGLIO ---
saveAdviceBtn.addEventListener("click", async () => {
    const clientId = clientSelect.value;
    if (!clientId || !adviceText.value.trim()) return alert("Seleziona cliente e scrivi consiglio");
    await setDoc(doc(db, "advices", `${clientId}-${Date.now()}`), {
        text: adviceText.value,
        clientId,
        approved: true,
        createdAt: Date.now()
    });
    adviceText.value = "";
    closeModal(adviceModal);
    alert("Consiglio salvato!");
});

// --- SALVA RICETTA ---
saveRecipeBtn.addEventListener("click", async () => {
    const clientId = clientSelect.value;
    if (!clientId || !recipeText.value.trim()) return alert("Seleziona cliente e scrivi ricetta");
    await setDoc(doc(db, "recipes", `${clientId}-${Date.now()}`), {
        text: recipeText.value,
        clientId,
        approved: true,
        createdAt: Date.now()
    });
    recipeText.value = "";
    closeModal(recipeModal);
    alert("Ricetta salvata!");
});

// --- UPLOAD FOTO CLIENTE ---
uploadPhotoBtn.addEventListener("click", async () => {
    const clientId = clientSelect.value;
    if (!clientId || !photoUpload.files[0]) return alert("Seleziona cliente e foto");
    const file = photoUpload.files[0];
    const token = await auth.currentUser.getIdToken(); // Firebase Auth token
    try {
        const res = await fetch(`https://gino.personaltrainergustavo1.workers.dev/upload`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": file.type
            },
            body: file
        });
        const data = await res.json();
        if (data.success) {
            uploadFeedback.innerText = "Foto caricata con successo!";
        } else {
            uploadFeedback.innerText = "Errore durante upload";
        }
    } catch (err) {
        console.error(err);
        uploadFeedback.innerText = "Errore durante upload";
    }
});
