async function loadZip(file) {
  const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  const zip = await JSZip.default.loadAsync(file);
  const visitJson = await zip.file("visit.json").async("string");
  const data = JSON.parse(visitJson);
  const media = {};
  await Promise.all(Object.keys(zip.files).map(async path => {
    if (path.startsWith("data/") && !zip.files[path].dir) {
      media[path] = await zip.file(path).async("blob");
    }
  }));
  return { data, media };
}
