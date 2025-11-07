// script.js (module) - include Firebase init, auth, Firestore, worker calls,
// admin controls (only adminEmail can manage), client functions (weights/photos/chart).

// ---------- CONFIG ----------
export const CONFIG = {
  firebaseConfig: {
    apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
    authDomain: "gestione-peso-1d758.firebaseapp.com",
    projectId: "gestione-peso-1d758",
    storageBucket: "gestione-peso-1d758.firebasestorage.app",
    messagingSenderId: "121949363903",
    appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
  },
  WORKER_URL: "https://gino.personaltrainergustavo1.workers.dev",
  adminEmail: "personaltrainergustavo1@gmail.com"
};

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(CONFIG.firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---------- UTIL: get ID token ----------
export async function getIdToken() {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken(/*forceRefresh*/ true);
}

// ---------- AUTH helpers ----------
export async function loginWithGoogle() {
  const res = await signInWithPopup(auth, provider);
  return res.user;
}
export async function logout() { await signOut(auth); }

// ---------- WORKER helpers ----------
export async function aiGenerate(prompt) {
  // calls Worker /api/chat with messages format
  const res = await fetch(`${CONFIG.WORKER_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
  });
  if (!res.ok) throw new Error("AI generation failed");
  const j = await res.json();
  // prefer chat completion format
  const text = j?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.text ?? JSON.stringify(j);
  return text;
}

// ---------- STORE advice / recipes (draft & approve) ----------
export async function createAdvice({ category, title, description, tags, author }) {
  return await addDoc(collection(db, "advices"), { category, title, description, tags, author, approved: false, createdAt: serverTimestamp() });
}
export async function createRecipeDraft({ food, generatedText, author }) {
  return await addDoc(collection(db, "recipes"), { food, generatedText, author, approved: false, createdAt: serverTimestamp() });
}
export async function getDrafts(kind = "advices") {
  const q = query(collection(db, kind), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function approveDoc(kind, id) {
  const ref = doc(db, kind, id);
  await updateDoc(ref, { approved: true });
}

// ---------- Public lists (approved) ----------
export async function getApprovedAdvices(limit = 50) {
  const q = query(collection(db, "advices"), where("approved", "==", true), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getApprovedRecipes(limit = 50) {
  const q = query(collection(db, "recipes"), where("approved", "==", true), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- UPLOAD PHOTO via WORKER ----------
export async function uploadPhotoToWorker(file) {
  const idToken = await getIdToken();
  if (!idToken) throw new Error("not authenticated");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("uid", auth.currentUser.uid);
  const res = await fetch(`${CONFIG.WORKER_URL}/upload`, { method: "POST", headers: { Authorization: "Bearer " + idToken }, body: fd });
  if (!res.ok) {
    const t = await res.text().catch(()=>null);
    throw new Error("upload failed: " + (t || res.status));
  }
  const j = await res.json();
  // if worker returns url use it, otherwise build /file/<key>
  const url = j.url || `${CONFIG.WORKER_URL}/file/${encodeURIComponent(j.key)}`;
  return { key: j.key, url };
}

// ---------- Firestore save photo meta ----------
export async function savePhotoMetaForUser(uid, meta) {
  return await addDoc(collection(db, "users", uid, "photos"), meta);
}
export async function saveWeightForUser(uid, value, ts = null) {
  return await addDoc(collection(db, "users", uid, "weights"), { value, ts: ts ? ts : serverTimestamp() });
}
export async function getUserWeights(uid) {
  const q = query(collection(db, "users", uid, "weights"), orderBy("ts","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
export async function getUserPhotos(uid) {
  const q = query(collection(db, "users", uid, "photos"), orderBy("uploadedAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

// ---------- utility: find nearest photo to timestamp ----------
export function findNearestPhotoForTs(photos, tsMs) {
  if(!photos || photos.length===0) return null;
  let best = null; let bestDiff = Infinity;
  for(const p of photos){
    const pTs = (p.uploadedAt && p.uploadedAt.seconds) ? p.uploadedAt.seconds*1000 : (new Date(p.uploadedAt||p.uploadedAt)).getTime();
    if(!pTs) continue;
    const diff = Math.abs(pTs - tsMs);
    if(diff < bestDiff){ bestDiff = diff; best = p; }
  }
  // only return if within 21 days (~3 weeks)
  if(bestDiff > 21*24*3600*1000) return null;
  return best;
}
