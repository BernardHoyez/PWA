#!/usr/bin/env node
/**
 * build.js — Génère randonnees.json en scannant le dossier randonnees/
 * Usage : node build.js
 */

const fs   = require('fs');
const path = require('path');

const RANDO_DIR = path.join(__dirname, 'randonnees');
const OUT_FILE  = path.join(__dirname, 'randonnees.json');

if (!fs.existsSync(RANDO_DIR)) {
  console.error('❌  Dossier "randonnees/" introuvable.');
  process.exit(1);
}

const entries = fs.readdirSync(RANDO_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => {
    const name   = d.name;                          // ex: 2026-roubier_test_rougiers
    const viewer = path.join(RANDO_DIR, name, name + '.html');
    const hasViewer = fs.existsSync(viewer);

    // Titre lisible : "2026 · Roubier test rougiers"
    const parts  = name.split('-');
    const year   = parts[0] || '';
    const label  = parts.slice(1).join(' ').replace(/_/g, ' ');
    const title  = year + (label ? ' · ' + label.charAt(0).toUpperCase() + label.slice(1) : '');

    return { name, title, year, hasViewer };
  })
  // Tri anti-chronologique (les plus récentes en premier)
  .sort((a, b) => b.name.localeCompare(a.name));

fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 2), 'utf8');

console.log(`✅  randonnees.json généré — ${entries.length} randonnée(s) :`);
entries.forEach(e =>
  console.log(`   ${e.hasViewer ? '✅' : '⚠️ '} ${e.title} (${e.name})`)
);
