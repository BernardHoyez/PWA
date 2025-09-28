// zip-handler.js — charge et extrait visit.json + crée objectURLs pour médias


async function handleZipFile(file){
const zip = await JSZip.loadAsync(file);
// read visit.json
const visitEntry = zip.file('visit.json');
if (!visitEntry) throw new Error('visit.json introuvable à la racine du zip');
const visitText = await visitEntry.async('string');
let visit;
try{ visit = JSON.parse(visitText); }
catch(e){ throw new Error('visit.json invalide: ' + e.message); }


// Extract media files from data/ and build a map name -> objectURL
const mediaMap = {}; // filename -> objectURL
const fileKeys = Object.keys(zip.files).filter(k => k.startsWith('data/'));
for (const k of fileKeys){
const fileObj = zip.files[k];
if (fileObj.dir) continue;
const blob = await fileObj.async('blob');
const name = k.replace(/^data\//, ''); // store without data/
mediaMap[name] = URL.createObjectURL(blob);
}


return { visit, mediaMap };
}