/* app.js - logique principale pour editpoi PWA
Dépendances externes : Leaflet, JSZip, FileSaver, exif-js
IndexedDB pour sauvegarde locale automatique (clé: 'draft')
*/


const DB_NAME = 'editpoiDB';
const DB_VERSION = 1;
const STORE_NAME = 'currentVisit';


let db = null;
let visit = { title: '', pois: [] };
let editingIndex = -1;
let map, marker;


// ---------------- IndexedDB helpers ----------------
function openDB(){
return new Promise((resolve, reject)=>{
const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = e => {
const idb = e.target.result;
if(!idb.objectStoreNames.contains(STORE_NAME)){
idb.createObjectStore(STORE_NAME, { keyPath: 'id' });
}
};
req.onsuccess = e => { db = e.target.result; resolve(db); };
req.onerror = e => reject(e.target.error);
});
}


function saveDraft(){
if(!db) return;
const tx = db.transaction(STORE_NAME, 'readwrite');
const store = tx.objectStore(STORE_NAME);
const toSave = { id: 'draft', visit };
const req = store.put(toSave);
req.onsuccess = ()=>{ console.log('Brouillon enregistré'); };
req.onerror = e => console.warn('Erreur saveDraft', e.target.error);
}


function loadDraft(){
return new Promise((resolve,reject)=>{
if(!db) return resolve(null);
const tx = db.transaction(STORE_NAME, 'readonly');
const store = tx.objectStore(STORE_NAME);
const req = store.get('draft');
req.onsuccess = e => { resolve(e.target.result ? e.target.result.visit : null); };
req.onerror = e => reject(e.target.error);
});
}


function clearDraft(){
if(!db) return;
const tx = db.transaction(STORE_NAME, 'readwrite');
const store = tx.objectStore(STORE_NAME);
const req = store.delete('draft');
req.onsuccess = ()=>{ console.log('Brouillon effacé'); };
}


// ---------------- helpers généraux ----------------
function uid(){ return 'poi-' + Date.now() + '-' + Math.floor(Math.random()*10000); }


// ---------------- initialisation ----------------
savePoi.addEventListener('click', as