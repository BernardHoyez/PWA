function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371e3; // mètres
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ/2)**2 +
            Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateAzimuth(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  function toDeg(x) { return x * 180 / Math.PI; }
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2 - λ1);
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}
