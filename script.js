// script.js (module)
const WORKER_URL = "https://gino.personaltrainergustavo1.workers.dev";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
  authDomain: "gestione-peso-1d758.firebaseapp.com",
  projectId: "gestione-peso-1d758",
  storageBucket: "gestione-peso-1d758.firebasestorage.app",
  messagingSenderId: "121949363903",
  appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
  measurementId: "G-WGBB30D5FK"
};

// firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// UI elements (index + admin share)
const langEl = document.getElementById('lang');
const themeToggle = document.getElementById('themeToggle') || document.getElementById('adminThemeToggle');
const loginBtn = document.getElementById('btnLogin') || document.getElementById('adminLogin');
const quickSignIn = document.getElementById('quickSignIn');
const logoutBtn = document.getElementById('btnLogout') || document.getElementById('adminLogout');

const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

const menu = document.getElementById('menu');
const panelContainer = document.getElementById('panelContainer');

const photosGrid = document.getElementById('photosGrid');
const advicesList = document.getElementById('advicesList');
const recipesList = document.getElementById('recipesList');

const photoFile = document.getElementById('photoFile');
const uploadBtn = document.getElementById('uploadBtn');
const weightInput = document.getElementById('weightInput');
const saveWeightBtn = document.getElementById('saveWeight');

const chartEl = document.getElementById('chart');
const openChartDetail = document.getElementById('openChartDetail');

const aiQ = document.getElementById('aiQ');
const aiAsk = document.getElementById('aiAsk');
const aiOut = document.getElementById('aiOut');

const modalRoot = document.getElementById('modalRoot');

let currentUser = null;
let chart = null;

// translations minimal
const T = {
  it: { login: "Accedi con Google", welcome: "Benvenuto", uploadSuccess: "Foto caricata", uploadFail: "Upload fallito" },
  en: { login: "Sign in with Google", welcome: "Welcome", uploadSuccess: "Photo uploaded", uploadFail: "Upload failed" }
};

// THEME: auto detect + toggle
(function initTheme(){
  const saved = localStorage.getItem('cp_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const mode = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', mode);
  const tBtn = document.querySelector('[id="themeToggle"], [id="adminThemeToggle"]');
  if(tBtn) tBtn.textContent = mode === 'dark' ? '☀️' : '🌙';
  if(themeToggle) themeToggle.addEventListener('click', ()=> {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cp_theme', next);
    if(tBtn) tBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
})();

// LANGUAGE
const savedLang = localStorage.getItem('cp_lang') || 'it';
if(langEl) langEl.value = savedLang;
applyLang(savedLang);
if(langEl) langEl.addEventListener('change', e => { localStorage.setItem('cp_lang', e.target.value); applyLang(e.target.value); });
function applyLang(l){
  if(document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').textContent = T[l].welcome;
  if(document.getElementById('quickSignIn')) document.getElementById('quickSignIn').textContent = T[l].login;
}

// AUTH handlers (shared)
if(loginBtn) loginBtn.addEventListener('click', ()=> signIn());
if(quickSignIn) quickSignIn.addEventListener('click', ()=> signIn());
if(logoutBtn) logoutBtn.addEventListener('click', async ()=> { await signOut(auth); });

async function signIn(){
  try {
    const res = await signInWithPopup(auth, provider);
    const u = res.user;
    await setDoc(doc(db,'users',u.uid), {
      uid: u.uid, name: u.displayName || "", email: u.email || "", photoURL: u.photoURL || "", lastSeen: serverTimestamp()
    }, { merge: true });
  } catch(e){
    console.error('signin', e);
    alert(e.message || e);
  }
}

// AUTH STATE
onAuthStateChanged(auth, async user => {
  // admin.html may not have these elements; guard
  if(!user){
    if(loginCard) loginCard.style.display = 'block';
    if(dashboard) dashboard.style.display = 'none';
    if(document.getElementById('authWrap')) document.getElementById('authWrap').style.display='flex';
    if(document.getElementById('btnLogout')) document.getElementById('btnLogout').style.display='none';
    return;
  }
  currentUser = user;
  // index dashboard UI
  if(loginCard) loginCard.style.display = 'none';
  if(dashboard) dashboard.style.display = 'block';
  if(document.getElementById('btnLogout')) document.getElementById('btnLogout').style.display='inline-block';
  if(document.getElementById('btnLogin')) document.getElementById('btnLogin').style.display='none';
  if(userPhoto) { userPhoto.src = user.photoURL || "https://via.placeholder.com/96"; userPhoto.alt = (user.displayName||'') + ' photo'; }
  if(userName) userName.textContent = user.displayName || 'Client';
  if(userEmail) userEmail.textContent = user.email || '';
  // load client data if index
  if(document.body.contains(chartEl)) {
    await loadWeightsAndRender();
    await loadPhotos();
    await loadAdvices();
    await loadRecipes();
  }
  // admin: load clients and drafts
  if(document.body.classList.contains('admin') || document.getElementById('clientsList')) {
    await loadClientsUI();
    await renderDraftsForFilter();
    checkAdminAccess(user);
  }
});

// MENU (index) show/hide panels
if(menu){
  menu.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      menu.querySelectorAll('button').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      const panel = btn.dataset.panel;
      document.querySelectorAll('[id^="panel-"]').forEach(p=>p.style.display='none');
      const el = document.getElementById('panel-'+panel);
      if(el) el.style.display='block';
    });
  });
}

// ====== CHART & WEIGHTS ======
async function loadWeightsAndRender(){
  if(!currentUser) return;
  try {
    const q = query(collection(db,'users',currentUser.uid,'weights'), orderBy('ts','asc'));
    const snap = await getDocs(q);
    const labels=[], data=[];
    snap.forEach(d=>{ const v=d.data(); const dt = v.ts ? new Date(v.ts.seconds*1000) : new Date(); labels.push(dt.toLocaleDateString()); data.push(v.value); });
    renderChart(labels, data);
  } catch(e){ console.error('loadWeights', e); }
}

function renderChart(labels, data){
  if(!chart){
    const ctx = chartEl.getContext('2d');
    chart = new Chart(ctx, { type: 'line', data:{ labels, datasets:[{ label:'Peso', data, tension:0.3, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0ea5ff' }] }, options:{ responsive:true, plugins:{legend:{display:false}} } });
  } else {
    chart.data.labels = labels; chart.data.datasets[0].data = data; chart.update();
  }
}

if(saveWeightBtn){
  saveWeightBtn.addEventListener('click', async ()=>{
    if(!currentUser) return alert('Login required');
    const v = Number(weightInput.value);
    if(!v) return alert('Inserisci valore valido');
    await addDoc(collection(db,'users',currentUser.uid,'weights'), { value: v, ts: serverTimestamp() });
    weightInput.value = ''; await loadWeightsAndRender(); notify('Peso salvato');
  });
}

// Chart detail modal (fixed size + closable)
if(openChartDetail){
  openChartDetail.addEventListener('click', ()=> showChartModal());
}

function showChartModal(){
  if(!currentUser) return;
  // create modal
  modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><button class="close-btn" id="closeModal">×</button><h3>Andamento Peso — dettaglio</h3><canvas id="bigChart" height="260"></canvas></div></div>`;
  modalRoot.style.display='block'; modalRoot.setAttribute('aria-hidden','false');
  document.getElementById('closeModal').addEventListener('click', ()=> { modalRoot.style.display='none'; modalRoot.innerHTML=''; modalRoot.setAttribute('aria-hidden','true'); });
  // render full chart
  (async ()=>{
    const q = query(collection(db,'users',currentUser.uid,'weights'), orderBy('ts','asc'));
    const snap = await getDocs(q);
    const labs=[], data=[];
    snap.forEach(d=>{ const v=d.data(); labs.push(v.ts? new Date(v.ts.seconds*1000).toLocaleDateString() : ''); data.push(v.value); });
    const ctx = document.getElementById('bigChart').getContext('2d');
    new Chart(ctx, { type:'line', data:{ labels:labs, datasets:[{ label:'Peso', data, tension:0.2, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0ea5ff' }]}, options:{responsive:true} });
  })();
}

// ====== PHOTOS (upload via Worker /upload) ======
async function loadPhotos(){
  if(!currentUser || !photosGrid) return;
  photosGrid.innerHTML = '';
  const q = query(collection(db,'users',currentUser.uid,'photos'), orderBy('uploadedAt','desc'));
  const snap = await getDocs(q);
  const arr=[];
  snap.forEach(d=>arr.push(d.data()));
  if(arr.length===0){ photosGrid.innerHTML = '<div class="small">Nessuna foto</div>'; return; }
  arr.forEach(p=>{
    const card = document.createElement('button'); card.className='card'; card.style.display='inline-block'; card.style.textAlign='center'; card.style.padding='8px';
    card.innerHTML = `<img src="${p.url}" class="thumb" alt="progress photo"><div class="small">${new Date((p.uploadedAt?.seconds||Date.now())*1000).toLocaleDateString()}</div>`;
    card.addEventListener('click', ()=> showPhotoModal(p.url));
    photosGrid.appendChild(card);
  });
}

if(uploadBtn){
  uploadBtn.addEventListener('click', async ()=>{
    if(!currentUser) return alert('Login required');
    if(!photoFile.files.length) return alert('Seleziona file');
    const file = photoFile.files[0];
    uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading...';
    try {
      const idToken = await currentUser.getIdToken();
      const fd = new FormData(); fd.append('file', file); fd.append('uid', currentUser.uid);
      const res = await fetch(`${WORKER_URL}/upload`, { method: 'POST', headers: { Authorization: 'Bearer ' + idToken }, body: fd });
      const j = await res.json();
      if(!j.key && !j.url) throw new Error('upload failed');
      const url = j.url || `${WORKER_URL}/file/${encodeURIComponent(j.key)}`;
      await addDoc(collection(db,'users',currentUser.uid,'photos'), { url, key:j.key, filename:file.name, uploadedAt: serverTimestamp() });
      notify(T[localStorage.getItem('cp_lang')||'it'].uploadSuccess);
      await loadPhotos();
    } catch(e){ console.error(e); alert((T[localStorage.getItem('cp_lang')||'it'].uploadFail||'Upload failed') + ': ' + (e.message||e)); }
    finally { uploadBtn.disabled=false; uploadBtn.textContent='Carica'; photoFile.value=''; }
  });
}

function showPhotoModal(url){
  modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><button class="close-btn" id="closeModal">×</button><img src="${url}" style="width:100%;border-radius:8px" alt="Foto progresso"></div></div>`;
  modalRoot.style.display='block'; modalRoot.setAttribute('aria-hidden','false');
  document.getElementById('closeModal').addEventListener('click', ()=> { modalRoot.style.display='none'; modalRoot.innerHTML=''; modalRoot.setAttribute('aria-hidden','true'); });
}

// ====== ADVICES & RECIPES (client view only approved+assigned) ======
async function loadAdvices(){
  if(!currentUser || !advicesList) return;
  advicesList.innerHTML = 'Loading...';
  const q = query(collection(db,'advices'), where('approved','==',true), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  if(snap.empty){ advicesList.innerHTML = '<div class="small">Nessun consiglio</div>'; return; }
  advicesList.innerHTML = snap.docs.map(d=>{
    const data = d.data(); const assigned = data.assignedTo || 'all';
    if(assigned !== 'all' && assigned !== currentUser.uid) return '';
    return `<article class="card" style="margin-bottom:8px"><strong>${data.title||'Consiglio'}</strong><p class="small">${(data.text||'').slice(0,220)}</p><div class="small">Autore: ${data.author||'coach'}</div></article>`;
  }).join('');
}

async function loadRecipes(){
  if(!currentUser || !recipesList) return;
  recipesList.innerHTML = 'Loading...';
  const q = query(collection(db,'recipes'), where('approved','==',true), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  if(snap.empty){ recipesList.innerHTML = '<div class="small">Nessuna ricetta</div>'; return; }
  recipesList.innerHTML = snap.docs.map(d=>{
    const data = d.data(); const assigned = data.assignedTo || 'all';
    if(assigned !== 'all' && assigned !== currentUser.uid) return '';
    return `<article class="card" style="margin-bottom:8px"><strong>${data.title||data.food||'Ricetta'}</strong><p class="small">${(data.generatedText||data.text||'').slice(0,240)}</p></article>`;
  }).join('');
}

// ====== AI Assistant (via Worker) ======
if(aiAsk){
  aiAsk.addEventListener('click', async ()=>{
    const q = aiQ.value.trim(); if(!q) return;
    aiOut.textContent = '...';
    try {
      const res = await fetch(`${WORKER_URL}/api/chat`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messages:[{ role:'user', content:q }] }) });
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content || j.choices?.[0]?.text || JSON.stringify(j);
      aiOut.textContent = text;
    } catch(e){ aiOut.textContent = 'AI error: ' + (e.message||e); }
  });
}

// ====== INDEX UTIL ======
function notify(msg, time=2200){ const n=document.createElement('div'); n.style.position='fixed'; n.style.right='18px'; n.style.bottom='18px'; n.style.background='var(--card)'; n.style.padding='10px 12px'; n.style.borderRadius='8px'; n.style.boxShadow='var(--card-shadow)'; n.textContent=msg; document.body.appendChild(n); setTimeout(()=>n.remove(),time); }

// ====== ADMIN FUNCTIONS (load clients & drafts) ======
/* These run when admin.html loads; admin.html contains elements with these IDs */
async function loadClientsUI(){
  const clientsList = document.getElementById('clientsList');
  const clientSelect = document.getElementById('clientSelect');
  const filterClient = document.getElementById('filterClient');
  if(!clientsList || !clientSelect) return;
  clientsList.innerHTML = ''; clientSelect.innerHTML = '<option value="all">Tutti</option>'; if(filterClient) filterClient.innerHTML = '<option value="all">Tutti</option>';
  const q = query(collection(db,'users'), orderBy('email','asc'));
  const snap = await getDocs(q);
  if(snap.empty){ clientsList.innerHTML = '<div class="small">Nessun cliente</div>'; return; }
  snap.forEach(d=>{
    const data = d.data(); const id = d.id; const label = data.name || data.email || id;
    const opt = document.createElement('option'); opt.value=id; opt.textContent=label; clientSelect.appendChild(opt);
    if(filterClient){ const opt2 = document.createElement('option'); opt2.value=id; opt2.textContent=label; filterClient.appendChild(opt2); }
    const row = document.createElement('div'); row.className='small card'; row.style.marginBottom='6px'; row.tabIndex=0; row.innerHTML=`<strong>${label}</strong><div class="small">${data.email||''}</div>`;
    row.addEventListener('click', ()=> { if(filterClient) filterClient.value = id; renderDraftsForFilter(); });
    clientsList.appendChild(row);
  });
}

async function renderDraftsForFilter(){
  const draftsList = document.getElementById('draftsList');
  const filterClient = document.getElementById('filterClient');
  if(!draftsList) return;
  const f = filterClient ? filterClient.value : 'all';
  draftsList.innerHTML = '';
  const advSnap = await getDocs(query(collection(db,'advices'), orderBy('createdAt','desc')));
  const recSnap = await getDocs(query(collection(db,'recipes'), orderBy('createdAt','desc')));
  const items = [];
  advSnap.forEach(d=>items.push({ id:d.id, kind:'advices', data:d.data() }));
  recSnap.forEach(d=>items.push({ id:d.id, kind:'recipes', data:d.data() }));
  items.sort((a,b)=> (b.data?.createdAt?.seconds||0) - (a.data?.createdAt?.seconds||0));
  if(items.length===0){ draftsList.innerHTML = '<div class="small">Nessuna bozza</div>'; return; }
  items.forEach(it=>{
    const assigned = it.data.assignedTo || 'all';
    if(f !== 'all' && assigned !== 'all' && assigned !== f) return;
    const div = document.createElement('div'); div.className='card'; div.style.marginBottom='8px';
    const title = it.data.title || it.data.food || 'Elemento';
    const text = (it.data.text || it.data.generatedText || '').slice(0,220);
    const status = it.data.approved ? '✅ Pubblicata' : '🕓 Bozza';
    div.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${title}</strong><div class="small">${assigned==='all'?'Tutti':assigned}</div></div><div class="small">${status}</div></div><p class="small">${text}</p>`;
    const approveBtn = document.createElement('button'); approveBtn.textContent='Approva & Pubblica'; approveBtn.className='btn';
    approveBtn.addEventListener('click', async ()=> { await updateDoc(doc(db,it.kind,it.id), { approved:true }); notify('Pubblicato'); renderDraftsForFilter(); });
    const editBtn = document.createElement('button'); editBtn.textContent='Modifica'; editBtn.className='btn-ghost';
    editBtn.addEventListener('click', ()=> { document.getElementById('kind').value = it.kind; document.getElementById('title').value = it.data.title || it.data.food || ''; document.getElementById('text').value = it.data.text || it.data.generatedText || ''; document.getElementById('clientSelect').value = it.data.assignedTo || 'all'; window.scrollTo({top:0,behavior:'smooth'}); });
    const actions = document.createElement('div'); actions.style.marginTop='8px'; actions.style.display='flex'; actions.style.gap='8px'; actions.appendChild(approveBtn); actions.appendChild(editBtn);
    div.appendChild(actions); draftsList.appendChild(div);
  });
}

// Save draft (admin)
const saveDraftBtn = document.getElementById('saveDraft');
if(saveDraftBtn){
  saveDraftBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    const kind = document.getElementById('kind').value;
    const title = document.getElementById('title').value.trim();
    const text = document.getElementById('text').value.trim();
    const assigned = document.getElementById('clientSelect').value || 'all';
    if(!title || !text) return alert('Inserisci titolo e testo');
    await addDoc(collection(db, kind), { title, text, assignedTo: assigned, approved:false, author: currentUser?.email || 'admin', createdAt: serverTimestamp() });
    document.getElementById('title').value=''; document.getElementById('text').value=''; document.getElementById('clientSelect').value='all';
    notify('Bozza salvata'); renderDraftsForFilter();
  });
}

// AI generation in admin (uses worker)
const genBtn = document.getElementById('generateAI');
if(genBtn){
  genBtn.addEventListener('click', async ()=>{
    const kind = document.getElementById('kind').value;
    const promptTarget = document.getElementById('title').value || 'ingredient';
    genBtn.disabled = true; genBtn.textContent = 'Generating...';
    try {
      const prompt = kind==='recipes' ? `Create 5 simple recipes using "${promptTarget}". Include title, short ingredients, short instructions.` : `Create a concise dietary advice about "${promptTarget}". Title and short practical description.`;
      const res = await fetch(`${WORKER_URL}/api/chat`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messages:[{ role:'user', content: prompt }] }) });
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content || j.choices?.[0]?.text || JSON.stringify(j);
      document.getElementById('text').value = text;
    } catch(e){ alert('AI error: ' + (e.message||e)); }
    genBtn.disabled = false; genBtn.textContent='Genera con AI';
  });
}

// Admin access check (email whitelist)
function checkAdminAccess(user){
  const adminEmail = "personaltrainergustavo1@gmail.com";
  if(!user) return;
  if(user.email !== adminEmail){
    alert('Accesso negato: non sei admin.');
    window.location.href = 'index.html';
  }
}

// Export helpers (if needed)
export { loadClientsUI, renderDraftsForFilter };

// End of script.js
