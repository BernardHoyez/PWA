async function handleZipFile(file){
    const zip = await JSZip.loadAsync(file);
    
    const visitEntry = zip.file('visit.json');
    if (!visitEntry) throw new Error('visit.json introuvable à la racine du zip');
    
    const visitText = await visitEntry.async('string');
    let visit;
    try{
        visit = JSON.parse(visitText);
    } catch(e){
        throw new Error('visit.json invalide: ' + e.message);
    }
    
    const mediaMap = {};
    const fileKeys = Object.keys(zip.files).filter(k => k.startsWith('data/'));
    
    for (const k of fileKeys){
        const fileObj = zip.files[k];
        if (fileObj.dir) continue;
        const blob = await fileObj.async('blob');
        const name = k.replace(/^data\//, '');
        mediaMap[name] = URL.createObjectURL(blob);
    }
    
    return { visit, mediaMap };
}