async function handleZip(file) {
  const zip = await JSZip.loadAsync(file);
  const visitFile = zip.file("visit.json");
  if (!visitFile) {
    alert("visit.json introuvable dans le ZIP");
    return;
  }

  const visitText = await visitFile.async("string");
  const visit = JSON.parse(visitText);

  const mediaMap = {};
  const dataFolder = zip.folder("data");
  if (dataFolder) {
    await Promise.all(
      Object.keys(dataFolder.files).map(async (path) => {
        const blob = await dataFolder.files[path].async("blob");
        mediaMap[path.split("/").pop()] = URL.createObjectURL(blob);
      })
    );
  }

  renderPOIs(visit.pois, mediaMap);
}
