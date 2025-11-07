// api.js
// Central API layer: Firebase v9 modular + Cloudflare Worker upload helper
// Copy this file as-is into your repo.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyCE3yccgXo00Up-iekaAdgffOo_YyqXNuE",
  authDomain: "gestione-peso-1d758.firebaseapp.com",
  projectId: "gestione-peso-1d758",
  storageBucket: "gestione-peso-1d758.appspot.com",
  messagingSenderId: "121949363903",
  appId: "1:121949363903:web:4eb5f5a7131109ea8bb00a",
  measurementId: "G-WGBB30D5FK"
};

// Cloudflare Worker base (your worker)
const WORKER_BASE = "https://gino.personaltrainergustavo1.workers.dev";

// initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth ? getAuth(app) : null; // guard for environments
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ---------- AUTH helpers ----------
export async function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}
export async function logoutUser() {
  return signOut(auth);
}
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
export function getCurrentUser() {
  return auth.currentUser || null;
}

// ---------- Firestore helpers ----------
export async function fetchClients() {
  const col = collection(db, "users");
  const q = query(col, orderBy("displayName"));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    out.push({
      uid: d.id,
      displayName: data.displayName || data.email || d.id,
      email: data.email || ""
    });
  });
  return out;
}

export async function fetchAdvices({ clientId = null, onlyApproved = true } = {}) {
  const col = collection(db, "advices");
  let q;
  if (clientId) q = query(col, where("clientId", "==", clientId), orderBy("createdAt", "desc"));
  else q = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    if (onlyApproved && !data.approved) return;
    out.push({ id: d.id, ...data });
  });
  return out;
}

export async function fetchRecipes({ clientId = null, onlyApproved = true } = {}) {
  const col = collection(db, "recipes");
  let q;
  if (clientId) q = query(col, where("clientId", "==", clientId), orderBy("createdAt", "desc"));
  else q = query(col, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    if (onlyApproved && !data.approved) return;
    out.push({ id: d.id, ...data });
  });
  return out;
}

export async function fetchWeights(uid) {
  if (!uid) return [];
  const col = collection(db, `users/${uid}/weights`);
  const q = query(col, orderBy("date", "asc"));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    let dateVal = data.date;
    if (dateVal && dateVal.toDate) dateVal = dateVal.toDate();
    else if (typeof dateVal === "number") dateVal = new Date(dateVal);
    out.push({
      id: d.id,
      weight: data.weight,
      date: dateVal ? (dateVal instanceof Date ? dateVal.toISOString() : String(dateVal)) : ""
    });
  });
  return out;
}

export async function fetchPhotos(uid) {
  if (!uid) return [];
  const col = collection(db, `users/${uid}/photos`);
  const q = query(col, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    out.push({
      id: d.id,
      url: data.url,
      key: data.key,
      createdAt: data.createdAt
    });
  });
  return out;
}

export async function addAdvice({ clientId = null, title = "", text = "", approved = false, author = null } = {}) {
  const docRef = await addDoc(collection(db, "advices"), {
    clientId,
    title,
    text,
    approved,
    author,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function addRecipe({ clientId = null, title = "", text = "", approved = false, author = null } = {}) {
  const docRef = await addDoc(collection(db, "recipes"), {
    clientId,
    title,
    text,
    approved,
    author,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateDocApproved(collectionName, docId, newVal) {
  const r = doc(db, collectionName, docId);
  await setDoc(r, { approved: newVal }, { merge: true });
}

export async function deleteDocById(collectionName, docId) {
  const r = doc(db, collectionName, docId);
  await deleteDoc(r);
}

export async function savePhotoMeta(clientId, { key, publicUrl }) {
  const id = `photo-${Date.now()}`;
  const ref = doc(db, `users/${clientId}/photos/${id}`);
  await setDoc(ref, {
    key,
    url: publicUrl,
    createdAt: serverTimestamp()
  });
  return id;
}

// ---------- ensure user doc at first login ----------
export async function ensureUserDoc(user) {
  if (!user || !user.uid) return;
  try {
    const uref = doc(db, "users", user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, {
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true });
      console.log("User doc created for", user.uid);
    } else {
      await setDoc(uref, {
        lastLogin: serverTimestamp(),
        displayName: user.displayName || snap.data().displayName || null,
        email: user.email || snap.data().email || null
      }, { merge: true });
      console.log("User doc updated for", user.uid);
    }
  } catch (err) {
    console.error("ensureUserDoc error:", err);
    throw err;
  }
}

// ---------- Worker upload (R2) ----------
export async function uploadPhotoToWorker(clientId, file) {
  if (!clientId || !file) throw new Error("Missing clientId or file");
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const url = `${WORKER_BASE}/upload?clientId=${encodeURIComponent(clientId)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": file.type
    },
    body: file
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Worker upload failed: " + txt);
  }
  const json = await res.json();
  return json; // expects { key, publicUrl }
}

export function workerPhotoUrl(key) {
  return `${WORKER_BASE}/photo/${key}`;
}

// export low-level handles if needed
export { auth, db };
