async function loadVisitFromZip(file) {
  const zip = await JSZip.loadAsync(file);
  const visitJson = await zip.file("visit.json").async("string");
  const visit = JSON.parse(visitJson);

  // POI
  const pois = visit.pois || [];

  // Médias
  const dataFolder = zip.folder("data");
  const mediaMap = {};
  if (dataFolder) {
    const files = Object.keys(dataFolder.files);
    for (const path of files) {
      if (zip.file(path)) {
        const content = await zip.file(path).async("blob");
        mediaMap[path] = URL.createObjectURL(content);
      }
    }
  }

  return { pois, mediaMap };
}
