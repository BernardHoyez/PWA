let extractedLinks = [];

function extract() {
  const html = document.getElementById("htmlInput").value;
  extractedLinks = extractImgboxLinks(html);
  document.getElementById("linksOutput").textContent =
    extractedLinks.join("\n");
}

function generate() {
  const wpLines = document.getElementById("wpInput").value.trim().split("\n");

  const waypoints = wpLines.map(l => {
    const [lon, lat] = l.split(",").map(Number);
    return { lon, lat };
  });

  const kml = generateKML(waypoints, extractedLinks);
  downloadKML(kml);
}

function downloadKML(text) {
  const blob = new Blob([text], {
    type: "application/vnd.google-earth.kml+xml"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scrapphoto.kml";
  a.click();
}
