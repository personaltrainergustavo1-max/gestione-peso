// main-admin.js
// Admin UI — Firestore + Cloudflare Worker upload
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// -------------------------- CONFIG FIREBASE --------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
  authDomain: "gestione-peso-1d758.firebaseapp.com",
  projectId: "gestione-peso-1d758",
  storageBucket: "gestione-peso-1d758.appspot.com",
  messagingSenderId: "121949363903",
  appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
  measurementId: "G-WGBB30D5FK"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------------- CONFIG AZIENDA / SICUREZZA --------------------------
const ADMIN_EMAIL = "personaltrainergustavo1@gmail.com"; // cambia qui se necessario
const WORKER_UPLOAD_URL = "https://gino.personaltrainergustavo1.workers.dev/upload"; // endpoint Worker per PUT photo

// -------------------------- ELEMENTI DOM --------------------------
const clientSelect = document.getElementById("clientSelect");
const clientInfo = document.getElementById("clientInfo");

const advicesAdminList = document.getElementById("advicesAdminList");
const recipesAdminList = document.getElementById("recipesAdminList");
const addAdviceBtn = document.getElementById("addAdviceBtn");
const addRecipeBtn = document.getElementById("addRecipeBtn");

const photoUpload = document.getElementById("photoUpload");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const uploadFeedback = document.getElementById("uploadFeedback");

const adminEmailBadge = document.getElementById("adminEmailBadge");
const signOutBtn = document.getElementById("signOutBtn");

// Modali e campi
const modalAdvice = document.getElementById("modalAdvice");
const modalRecipe = document.getElementById("modalRecipe");
const adviceTitle = document.getElementById("adviceTitle");
const adviceBody = document.getElementById("adviceBody");
const adviceApproved = document.getElementById("adviceApproved");
const saveAdviceBtn = document.getElementById("saveAdviceBtn");

const recipeTitle = document.getElementById("recipeTitle");
const recipeBody = document.getElementById("recipeBody");
const recipeApproved = document.getElementById("recipeApproved");
const saveRecipeBtn = document.getElementById("saveRecipeBtn");

// -------------------------- HELPERS MODALI --------------------------
function openModal(id) {
  const node = document.getElementById(id);
  if(!node) return;
  node.style.display = "flex";
  node.setAttribute("aria-hidden","false");
}
function closeModal(id) {
  const node = document.getElementById(id);
  if(!node) return;
  node.style.display = "none";
  node.setAttribute("aria-hidden","true");
}
document.querySelectorAll(".closeBtn").forEach(btn=>{
  btn.addEventListener("click", e=>{
    const t = btn.getAttribute("data-target") || btn.closest(".modal")?.id;
    if(t) closeModal(t);
  });
});
document.querySelectorAll(".cancelBtn").forEach(b=>{
  b.addEventListener("click", e=>{
    const t = b.getAttribute("data-target");
    if(t) closeModal(t);
  });
});

// -------------------------- AUTH & ADMIN CHECK --------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // non loggato → reindirizza al login
    window.location.href = "login.html";
    return;
  }
  // verifica admin
  const email = user.email || "";
  adminEmailBadge.innerText = email;
  if (email !== ADMIN_EMAIL) {
    alert("Accesso riservato all'admin.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }
  // Carica dati
  await loadClients();
  await loadAdvices();
  await loadRecipes();
});

// Sign out
signOutBtn.addEventListener("click", async ()=>{
  await signOut(auth);
  window.location.href = "login.html";
});

// -------------------------- CARICA CLIENTI --------------------------
async function loadClients() {
  clientSelect.innerHTML = "<option value=''>Seleziona cliente...</option>";
  const usersSnap = await getDocs(collection(db, "users"));
  usersSnap.forEach(snap=>{
    const data = snap.data();
    const opt = document.createElement("option");
    opt.value = snap.id;
    opt.textContent = data.displayName || data.email || snap.id;
    clientSelect.appendChild(opt);
  });

  clientSelect.addEventListener("change", ()=>{
    const uid = clientSelect.value;
    if(!uid) clientInfo.innerText = "";
    else clientInfo.innerText = `Cliente selezionato: ${clientSelect.options[clientSelect.selectedIndex].text}`;
  });
}

// -------------------------- ADVICE CRUD --------------------------
async function loadAdvices(){
  advicesAdminList.innerHTML = "";
  const advRef = collection(db, "advices");
  const advSnap = await getDocs(query(advRef, orderBy("createdAt", "desc")));
  advSnap.forEach(docSnap=>{
    const d = docSnap.data();
    const id = docSnap.id;
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `
      <div class="list-left"><strong>${d.title || "(no title)"}</strong><div class="muted">${d.text}</div></div>
      <div class="list-right">
        <button class="small" data-id="${id}" data-action="toggle">${d.approved ? "Unpublish":"Approve"}</button>
        <button class="small danger" data-id="${id}" data-action="delete">Delete</button>
      </div>
    `;
    advicesAdminList.appendChild(row);
  });
  // bind events
  advicesAdminList.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", async (e)=>{
      const id = b.getAttribute("data-id");
      const action = b.getAttribute("data-action");
      if(action === "toggle"){
        const ref = doc(db, "advices", id);
        const snap = await getDocs(query(collection(db,"advices"), where("__name__","==",id)));
        // simply flip approved
        // better: fetch doc, then update
        try{
          // read to know current
          const docSnap = (await getDocs(doc(db,"advices",id))).docs?.[0];
        }catch(e){}
        // do optimistic update
        // Use updateDoc would be better but we will set approved to opposite
        const dref = doc(db,"advices",id);
        const current = (await importDocData(dref));
        if(current) {
          await updateDoc(dref, { approved: !current.approved });
          loadAdvices();
        }
      } else if(action === "delete"){
        if(!confirm("Eliminare questo consiglio?")) return;
        await deleteDoc(doc(db,"advices",id));
        loadAdvices();
      }
    });
  });
}

// -------------------------- RECIPE CRUD --------------------------
async function loadRecipes(){
  recipesAdminList.innerHTML = "";
  const ref = collection(db,"recipes");
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const id = docSnap.id;
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `
      <div class="list-left"><strong>${d.title || "(no title)"}</strong><div class="muted">${d.text}</div></div>
      <div class="list-right">
        <button class="small" data-id="${id}" data-action="toggle">${d.approved ? "Unpublish":"Approve"}</button>
        <button class="small danger" data-id="${id}" data-action="delete">Delete</button>
      </div>
    `;
    recipesAdminList.appendChild(row);
  });

  recipesAdminList.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const id = b.getAttribute("data-id");
      const action = b.getAttribute("data-action");
      if(action==="toggle"){
        const dref = doc(db,"recipes",id);
        const current = await importDocData(dref);
        if(current) {
          await updateDoc(dref, { approved: !current.approved });
          loadRecipes();
        }
      } else if(action==="delete"){
        if(!confirm("Eliminare questa ricetta?")) return;
        await deleteDoc(doc(db,"recipes",id));
        loadRecipes();
      }
    });
  });
}

// helper: read a single doc (Firestore modular doesn't have simple getDoc import used earlier)
async function importDocData(ref){
  try{
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }catch(e){
    console.error(e);
    return null;
  }
}

// -------------------------- ADD NEW ADVICE / RECIPE --------------------------
addAdviceBtn.addEventListener("click", ()=> {
  adviceTitle.value = "";
  adviceBody.value = "";
  adviceApproved.checked = false;
  openModal("modalAdvice");
});
saveAdviceBtn.addEventListener("click", async ()=>{
  const clientId = clientSelect.value || null;
  if(!adviceBody.value.trim()) { alert("Inserisci il testo del consiglio."); return; }
  const id = `adm-${Date.now()}`;
  await setDoc(doc(db,"advices",id), {
    title: adviceTitle.value || "",
    text: adviceBody.value,
    clientId,
    approved: !!adviceApproved.checked,
    createdAt: Date.now()
  });
  closeModal("modalAdvice");
  loadAdvices();
});

addRecipeBtn.addEventListener("click", ()=>{
  recipeTitle.value = "";
  recipeBody.value = "";
  recipeApproved.checked = false;
  openModal("modalRecipe");
});
saveRecipeBtn.addEventListener("click", async ()=>{
  const clientId = clientSelect.value || null;
  if(!recipeBody.value.trim()) { alert("Inserisci il testo della ricetta."); return; }
  const id = `admrec-${Date.now()}`;
  await setDoc(doc(db,"recipes",id), {
    title: recipeTitle.value || "",
    text: recipeBody.value,
    clientId,
    approved: !!recipeApproved.checked,
    createdAt: Date.now()
  });
  closeModal("modalRecipe");
  loadRecipes();
});

// -------------------------- UPLOAD FOTO (to Worker -> R2) --------------------------
uploadPhotoBtn.addEventListener("click", async ()=>{
  const clientId = clientSelect.value;
  if(!clientId) { alert("Seleziona un cliente."); return; }
  const file = photoUpload.files[0];
  if(!file) { alert("Seleziona una foto."); return; }

  // require login token for worker auth
  const user = auth.currentUser;
  if(!user) { alert("Utente non autenticato"); return; }
  const token = await user.getIdToken();

  try {
    uploadFeedback.innerText = "Caricamento in corso...";
    const res = await fetch(WORKER_UPLOAD_URL + `?clientId=${encodeURIComponent(clientId)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": file.type
      },
      body: file
    });
    if(!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    if(json && json.key){
      // salva riferimento in Firestore users/{clientId}/photos
      const photoId = `photo-${Date.now()}`;
      await setDoc(doc(db, `users/${clientId}/photos/${photoId}`), {
        key: json.key,
        url: json.publicUrl || json.url || `${WORKER_UPLOAD_URL.replace("/upload","/photo")}/${json.key}`,
        createdAt: Date.now()
      });
      uploadFeedback.innerText = "Upload completato!";
      photoUpload.value = "";
    } else {
      uploadFeedback.innerText = "Upload completato ma risposta Worker mancante.";
    }
  } catch(err) {
    console.error(err);
    uploadFeedback.innerText = "Errore durante upload.";
  }
});

// -------------------------- INIZIALIZZAZIONE UTILE --------------------------
(async function init(){
  // mostra admin email se già loggato (potrebbe essere vuoto fino a onAuthStateChanged)
})();
