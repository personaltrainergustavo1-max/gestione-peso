// main-admin.js
import {
  loginWithGoogle,
  logoutUser,
  onAuth,
  getCurrentUser,
  fetchClients,
  fetchAdvices,
  fetchRecipes,
  addAdvice,
  addRecipe,
  uploadPhotoToWorker,
  savePhotoMeta,
  updateDocApproved,
  deleteDocById,
  workerPhotoUrl
} from "./api.js";

const clientSelect = document.getElementById("clientSelect");
const advicesAdminList = document.getElementById("advicesAdminList");
const recipesAdminList = document.getElementById("recipesAdminList");
const addAdviceBtn = document.getElementById("addAdviceBtn");
const addRecipeBtn = document.getElementById("addRecipeBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const photoUploadInput = document.getElementById("photoUpload");
const loginBtn = document.getElementById("loginBtn"); // optional login button if present
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");

const ADMIN_ALLOW = ["personaltrainergustavo1@gmail.com"]; // change if needed

// init theme/lang from storage
document.body.classList.add(localStorage.getItem("theme") || "light");
document.documentElement.lang = localStorage.getItem("lang") || "it";

themeToggle?.addEventListener("click", ()=> {
  const nxt = document.body.classList.contains("dark") ? "light" : "dark";
  document.body.classList.remove("dark","light"); document.body.classList.add(nxt);
  localStorage.setItem("theme", nxt);
});
langToggle?.addEventListener("click", ()=> {
  const nxt = document.documentElement.lang === "it" ? "en" : "it";
  document.documentElement.lang = nxt;
  localStorage.setItem("lang", nxt);
});

// login / logout
loginBtn?.addEventListener("click", async ()=> { try { await loginWithGoogle(); } catch(e){ alert("Login error: "+e.message);} });
logoutBtn?.addEventListener("click", async ()=> { await logoutUser(); });

onAuth(async user => {
  if (!user) {
    // prompt admin login
    const want = confirm("Effettua login (Google) come admin?");
    if (!want) return;
    try { await loginWithGoogle(); } catch(e){ alert("Login failed: " + e.message); }
    return;
  }
  if (!ADMIN_ALLOW.includes(user.email)) {
    alert("Accesso negato per " + user.email);
    await logoutUser();
    return;
  }
  // load clients and default client view
  await populateClients();
});

async function populateClients() {
  const clients = await fetchClients();
  clientSelect.innerHTML = clients.map(c=>`<option value="${c.uid}">${escapeHtml(c.displayName)}</option>`).join("");
  if (clients.length>0) {
    clientSelect.value = clients[0].uid;
    await loadForClient(clients[0].uid);
  } else {
    advicesAdminList.innerHTML = "<p class='muted'>Nessun cliente trovato</p>";
    recipesAdminList.innerHTML = "<p class='muted'>Nessun cliente trovato</p>";
  }
  clientSelect.addEventListener("change", async ()=> {
    await loadForClient(clientSelect.value);
  });
}

async function loadForClient(uid) {
  // advices (including drafts)
  const advs = await fetchAdvices({ clientId: uid, onlyApproved: false });
  advicesAdminList.innerHTML = "";
  advs.forEach(a=>{
    const div = document.createElement("div");
    div.className = "list-row";
    div.innerHTML = `<div><strong>${escapeHtml(a.title||"(no title)")}</strong><div class="muted">${escapeHtml(a.text||"")}</div></div>
      <div>
        <button class="small" data-id="${a.id}" data-action="toggle">${a.approved ? "Unpublish":"Approve"}</button>
        <button class="small danger" data-id="${a.id}" data-action="delete">Delete</button>
      </div>`;
    advicesAdminList.appendChild(div);
  });
  attachAdminButtons(advicesAdminList, "advices");

  // recipes
  const recs = await fetchRecipes({ clientId: uid, onlyApproved: false });
  recipesAdminList.innerHTML = "";
  recs.forEach(r=>{
    const div = document.createElement("div");
    div.className = "list-row";
    div.innerHTML = `<div><strong>${escapeHtml(r.title||"(no title)")}</strong><div class="muted">${escapeHtml(r.text||"")}</div></div>
      <div>
        <button class="small" data-id="${r.id}" data-action="toggle">${r.approved ? "Unpublish":"Approve"}</button>
        <button class="small danger" data-id="${r.id}" data-action="delete">Delete</button>
      </div>`;
    recipesAdminList.appendChild(div);
  });
  attachAdminButtons(recipesAdminList, "recipes");
}

function attachAdminButtons(container, collectionName) {
  container.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "toggle") {
        // fetch current doc to read approved flag
        try {
          const colDoc = collectionName;
          // flip using getDoc then update
          const fullDocRef = `${collectionName}/${id}`;
          // direct Firestore helper:
          // we don't have getDoc wrapper exported, so call updateDocApproved with optimistic flip:
          const confirmFlip = confirm("Confermi la modifica pubblicazione?");
          if (!confirmFlip) return;
          // We will read current doc via getDoc
          // use dynamic import of getDoc/doc from firestore
          const { doc: docRef, getDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
          const r = docRef((await import("./api.js")).db, collectionName, id);
          const snap = await getDoc(r);
          const current = snap.exists() ? snap.data() : null;
          const newVal = !(current && current.approved);
          await updateDocApproved(collectionName, id, newVal);
          await loadForClient(clientSelect.value);
        } catch (err) {
          console.error(err); alert("Errore: " + err.message);
        }
      } else if (action === "delete") {
        if (!confirm("Eliminare definitivamente?")) return;
        try {
          await deleteDocById(collectionName, id);
          await loadForClient(clientSelect.value);
        } catch (err) {
          console.error(err); alert("Errore: " + err.message);
        }
      }
    });
  });
}

// add advice/recipe simple prompts
addAdviceBtn?.addEventListener("click", async ()=>{
  const clientId = clientSelect.value;
  if(!clientId) return alert("Seleziona cliente");
  const title = prompt("Titolo (opzionale):", "");
  const text = prompt("Testo consiglio (obbligatorio):", "");
  if(!text) return alert("Testo richiesto");
  try {
    await addAdvice({ clientId, title, text, approved: false, author: getCurrentUser()?.displayName || getCurrentUser()?.email || "admin" });
    await loadForClient(clientId);
  } catch(e){ console.error(e); alert("Errore salvataggio: " + e.message); }
});
addRecipeBtn?.addEventListener("click", async ()=>{
  const clientId = clientSelect.value;
  if(!clientId) return alert("Seleziona cliente");
  const title = prompt("Titolo ricetta:", "");
  const text = prompt("Testo ricetta (ingredienti/procedimento):", "");
  if(!text) return alert("Testo richiesto");
  try {
    await addRecipe({ clientId, title, text, approved: false, author: getCurrentUser()?.displayName || getCurrentUser()?.email || "admin" });
    await loadForClient(clientId);
  } catch(e){ console.error(e); alert("Errore salvataggio: " + e.message); }
});

// upload photo
uploadPhotoBtn?.addEventListener("click", async ()=>{
  const file = photoUploadInput.files[0];
  const clientId = clientSelect.value;
  if (!clientId) return alert("Seleziona cliente");
  if (!file) return alert("Seleziona file");
  try {
    const res = await uploadPhotoToWorker(clientId, file);
    if (res && (res.key || res.publicUrl)) {
      const publicUrl = res.publicUrl || workerPhotoUrl(res.key);
      await savePhotoMeta(clientId, { key: res.key, publicUrl });
      alert("Foto caricata con successo");
      await loadForClient(clientId);
    } else throw new Error("Risposta worker non valida");
  } catch (e) {
    console.error(e);
    alert("Upload fallito: " + e.message);
  }
});

// small helper
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
