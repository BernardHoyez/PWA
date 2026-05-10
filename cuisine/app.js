/* ═══════════════════════════════════════════
   CUISINE PWA — Application Logic
   ═══════════════════════════════════════════ */

'use strict';

// ── State ──────────────────────────────────
const STATE = {
  recettes:     [],   // rows from Recettes xlsx
  ingredients:  [],   // rows from Ingrédients xlsx
  compositions: {},   // { recipeName: [{ingredient, pct}] }
  recettesHeaders:    [],
  ingredientsHeaders: [],
  loaded: { recettes: false, ingredients: false, compo: false },
};

// Palette for compare bars
const PALETTE = [
  '#3d82f6','#a855f7','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'
];

// ── Helpers ────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast hidden', 3000);
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const headers = data.length ? Object.keys(data[0]) : [];
        resolve({ data, headers });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// Parse composition file: A1=recipe name, colB=ingredient, colC=pct
function parseCompositionExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Row 0: first cell = recipe name
        const recipeName = (raw[0] && raw[0][0]) ? String(raw[0][0]).trim() : file.name.replace(/\.[^.]+$/, '');
        const rows = [];
        for (let i = 1; i < raw.length; i++) {
          const ing = String(raw[i][1] || '').trim();
          const pct = parseFloat(String(raw[i][2] || '').replace(',', '.'));
          if (ing && !isNaN(pct)) rows.push({ ingredient: ing, pct });
        }
        resolve({ recipeName, rows });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function updateStatusBar() {
  const { recettes, ingredients, compo } = STATE.loaded;
  const nr = STATE.recettes.length;
  const ni = STATE.ingredients.length;
  const nc = Object.keys(STATE.compositions).length;

  $('#dot-recettes').className = 'status-dot' + (recettes ? ' ok' : '');
  $('#lbl-recettes').textContent = recettes ? `Recettes — ${nr} lignes` : 'Recettes — non chargé';
  $('#dot-ingredients').className = 'status-dot' + (ingredients ? ' ok' : '');
  $('#lbl-ingredients').textContent = ingredients ? `Ingrédients — ${ni} lignes` : 'Ingrédients — non chargé';
  $('#dot-compo').className = 'status-dot' + (nc > 0 ? ' ok' : '');
  $('#lbl-compo').textContent = `Compositions — ${nc} fichier${nc !== 1 ? 's' : ''}`;

  // Enable validate button if at least recettes loaded
  $('#btn-validate-import').disabled = !recettes;
}

// ── View Navigation ────────────────────────
function showView(id) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  $(`#view-${id}`).classList.remove('hidden');
  $(`[data-view="${id}"]`).classList.add('active');
  // Close sidebar on mobile
  if (window.innerWidth <= 768) $('#sidebar').classList.remove('open');
}

// ── IMPORT ────────────────────────────────
function setupImport() {
  // Recettes
  $('#file-recettes').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const { data, headers } = await parseExcel(file);
      STATE.recettes = data;
      STATE.recettesHeaders = headers;
      STATE.loaded.recettes = true;
      $('#ok-recettes').classList.remove('hidden');
      $('#ok-recettes-txt').textContent = `${data.length} recettes chargées (${headers.length} colonnes)`;
      updateStatusBar();
      showToast(`Recettes chargées : ${data.length} lignes`, 'success');
    } catch { showToast('Erreur lors de la lecture du fichier Recettes', 'error'); }
  });

  // Ingrédients
  $('#file-ingredients').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const { data, headers } = await parseExcel(file);
      STATE.ingredients = data;
      STATE.ingredientsHeaders = headers;
      STATE.loaded.ingredients = true;
      $('#ok-ingredients').classList.remove('hidden');
      $('#ok-ingredients-txt').textContent = `${data.length} ingrédients chargés (${headers.length} colonnes)`;
      updateStatusBar();
      showToast(`Ingrédients chargés : ${data.length} lignes`, 'success');
    } catch { showToast('Erreur lors de la lecture du fichier Ingrédients', 'error'); }
  });

  // Compositions (multiple files)
  $('#file-compo').addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length) return;
    const list = $('#compo-list');
    list.innerHTML = '';
    for (const file of files) {
      try {
        const { recipeName, rows } = await parseCompositionExcel(file);
        STATE.compositions[recipeName] = rows;
        const chip = document.createElement('div');
        chip.className = 'compo-chip';
        chip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${recipeName} (${rows.length} ing.)`;
        list.appendChild(chip);
      } catch { showToast(`Erreur: ${file.name}`, 'error'); }
    }
    STATE.loaded.compo = true;
    updateStatusBar();
    showToast(`${files.length} composition(s) chargée(s)`, 'success');
  });

  // Drag & drop
  [['dz-recettes','file-recettes'],['dz-ingredients','file-ingredients'],['dz-compo','file-compo']].forEach(([dzId, inputId]) => {
    const dz = $(`#${dzId}`);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const inp = $(`#${inputId}`);
      inp.files = e.dataTransfer.files;
      inp.dispatchEvent(new Event('change'));
    });
  });

  $('#btn-validate-import').addEventListener('click', () => {
    showView('compare');
    rebuildCompareDropdown();
    rebuildCriteriaSelects();
    renderCatalog('recettes');
  });

  $('#btn-add-first').addEventListener('click', () => showView('import'));

  // Demo data
  $('#btn-demo').addEventListener('click', loadDemoData);
}

// ── DEMO DATA ─────────────────────────────
function loadDemoData() {
  const origines = ['France','Italie','Belgique','Espagne','Maroc'];
  const couleurs  = ['brun','blanc','jaune','rouge','vert','noir'];
  const difficultes = ['facile','moyen','difficile'];

  // Recettes
  STATE.recettesHeaders = ['Code','Nom','Origine','Volatilité','Pimentage','Texture','Couleur','Saison','Difficulté','Temps (min)'];
  STATE.recettes = Array.from({length: 12}, (_, i) => ({
    Code: `R${String(i+1).padStart(3,'0')}`,
    Nom: ['Cake au chocolat','Tarte aux pommes','Quiche lorraine','Crème brûlée','Madeleine','Financier','Soufflé au fromage','Bouillabaisse','Ratatouille','Profiteroles','Clafoutis','Mousse au chocolat'][i],
    Origine: origines[i % origines.length],
    Volatilité: +(Math.random()*5).toFixed(1),
    Pimentage: +(Math.random()*3).toFixed(1),
    Texture: ['croustillant','moelleux','crémeux','fondant','aérien'][i % 5],
    Couleur: couleurs[i % couleurs.length],
    Saison: ['printemps','été','automne','hiver','toute l\'année'][i % 5],
    Difficulté: difficultes[i % 3],
    'Temps (min)': [45,60,50,90,30,25,70,120,55,80,40,35][i],
  }));
  STATE.loaded.recettes = true;

  // Ingrédients
  const ingNames = ['Farine','Beurre','Sucre','Chocolat noir','Œufs','Lait','Crème fraîche','Levure','Sel','Cacao','Vanille','Noisettes'];
  STATE.ingredientsHeaders = ['Code','Nom','Origine','Couleur','Catégorie','Allergène','Calories (kcal/100g)'];
  STATE.ingredients = ingNames.map((nom, i) => ({
    Code: `I${String(i+1).padStart(3,'0')}`,
    Nom: nom,
    Origine: origines[i % origines.length],
    Couleur: couleurs[i % couleurs.length],
    Catégorie: ['sec','matière grasse','sucrant','arôme','liquide'][i % 5],
    Allergène: ['gluten','lactose','œuf','fruit à coque','non'][i % 5],
    'Calories (kcal/100g)': [364,717,387,546,155,61,292,53,0,228,288,628][i],
  }));
  STATE.ingredientsHeaders = Object.keys(STATE.ingredients[0]);
  STATE.loaded.ingredients = true;

  // Compositions
  const compoData = {
    'Cake au chocolat':   [['Farine',30],['Beurre',20],['Sucre',20],['Chocolat noir',15],['Œufs',10],['Levure',5]],
    'Tarte aux pommes':   [['Farine',35],['Beurre',25],['Sucre',15],['Œufs',8],['Crème fraîche',12],['Vanille',5]],
    'Quiche lorraine':    [['Farine',30],['Beurre',22],['Œufs',20],['Crème fraîche',18],['Sel',3],['Lait',7]],
    'Crème brûlée':       [['Crème fraîche',50],['Œufs',20],['Sucre',15],['Vanille',5],['Lait',10]],
    'Madeleine':          [['Farine',32],['Beurre',30],['Sucre',22],['Œufs',14],['Levure',2]],
    'Financier':          [['Beurre',35],['Sucre',25],['Noisettes',20],['Farine',12],['Œufs',8]],
    'Soufflé au fromage': [['Œufs',35],['Lait',30],['Farine',15],['Beurre',10],['Sel',10]],
    'Bouillabaisse':      [['Crème fraîche',20],['Sel',5],['Vanille',0],['Lait',25],['Beurre',10],['Farine',10],['Sucre',5],['Chocolat noir',0],['Œufs',25]],
    'Ratatouille':        [['Sel',8],['Beurre',12],['Crème fraîche',0],['Lait',0],['Farine',0],['Sucre',0],['Œufs',0],['Chocolat noir',0],['Vanille',0],['Noisettes',0],['Levure',0],['Cacao',80]],
    'Profiteroles':       [['Farine',28],['Beurre',24],['Œufs',20],['Lait',15],['Crème fraîche',8],['Sucre',5]],
    'Clafoutis':          [['Lait',35],['Œufs',25],['Farine',20],['Sucre',15],['Beurre',5]],
    'Mousse au chocolat': [['Chocolat noir',40],['Crème fraîche',30],['Œufs',20],['Sucre',8],['Beurre',2]],
  };

  STATE.compositions = {};
  for (const [name, rows] of Object.entries(compoData)) {
    STATE.compositions[name] = rows.map(([ingredient, pct]) => ({ ingredient, pct }));
  }
  STATE.loaded.compo = true;

  // Update UI
  $('#ok-recettes').classList.remove('hidden');
  $('#ok-recettes-txt').textContent = `${STATE.recettes.length} recettes chargées (DÉMO)`;
  $('#ok-ingredients').classList.remove('hidden');
  $('#ok-ingredients-txt').textContent = `${STATE.ingredients.length} ingrédients chargés (DÉMO)`;
  const list = $('#compo-list');
  list.innerHTML = '';
  for (const name of Object.keys(STATE.compositions)) {
    const chip = document.createElement('div');
    chip.className = 'compo-chip';
    chip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${name}`;
    list.appendChild(chip);
  }
  updateStatusBar();
  showToast('Données de démonstration chargées !', 'success');
  $('#btn-validate-import').disabled = false;
}

// ── COMPARE ───────────────────────────────
let selectedRecipes = [];

function rebuildCompareDropdown() {
  const allNames = [...new Set([
    ...STATE.recettes.map(r => r['Nom'] || r[STATE.recettesHeaders[1]] || ''),
    ...Object.keys(STATE.compositions)
  ])].filter(Boolean).sort();

  const dropdown = $('#compare-dropdown');
  dropdown.innerHTML = '';
  allNames.forEach(name => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    const code = (STATE.recettes.find(r => (r['Nom'] || r[STATE.recettesHeaders[1]]) === name) || {})['Code'] || '';
    item.innerHTML = `<span>${name}</span><span class="di-code">${code}</span>`;
    if (selectedRecipes.includes(name)) item.classList.add('selected');
    item.addEventListener('click', () => toggleRecipeSelection(name, item, allNames));
    dropdown.appendChild(item);
  });
}

function toggleRecipeSelection(name, item, allNames) {
  if (selectedRecipes.includes(name)) {
    selectedRecipes = selectedRecipes.filter(r => r !== name);
    item.classList.remove('selected');
  } else {
    selectedRecipes.push(name);
    item.classList.add('selected');
  }
  renderSelectedChips();
}

function renderSelectedChips() {
  const wrap = $('#selected-chips');
  wrap.innerHTML = '';
  selectedRecipes.forEach((name, idx) => {
    const chip = document.createElement('div');
    chip.className = 'sel-chip';
    chip.innerHTML = `<span class="color-dot" style="background:${PALETTE[idx % PALETTE.length]}"></span>${name}<button title="Retirer">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      selectedRecipes = selectedRecipes.filter(r => r !== name);
      renderSelectedChips();
      rebuildCompareDropdown();
    });
    wrap.appendChild(chip);
  });
}

function setupCompare() {
  const input = $('#compare-search-input');
  const dropdown = $('#compare-dropdown');

  input.addEventListener('focus', () => { dropdown.classList.remove('hidden'); rebuildCompareDropdown(); });
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    $$('.dropdown-item', dropdown).forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  document.addEventListener('click', e => {
    if (!$('#compare-recipe-select').contains(e.target)) dropdown.classList.add('hidden');
  });

  $('#btn-compare').addEventListener('click', renderComparison);
}

function renderComparison() {
  const result = $('#compare-result');
  if (selectedRecipes.length < 2) {
    result.innerHTML = '<div class="empty-state"><p>Sélectionnez au moins 2 recettes à comparer.</p></div>';
    return;
  }

  // Gather all ingredients across selected recipes
  const allIngredients = new Set();
  const compoMap = {};
  selectedRecipes.forEach(name => {
    const rows = STATE.compositions[name] || [];
    compoMap[name] = {};
    rows.forEach(({ ingredient, pct }) => {
      allIngredients.add(ingredient);
      compoMap[name][ingredient] = pct;
    });
  });
  const ingList = [...allIngredients].sort();

  // Recipe header badges
  let badgesHTML = '<div class="compare-recipe-headers">';
  selectedRecipes.forEach((name, i) => {
    const color = PALETTE[i % PALETTE.length];
    badgesHTML += `<div class="recipe-header-badge" style="background:${color}18;border-color:${color}55;color:${color}">
      <span class="color-dot" style="background:${color}"></span>${name}
    </div>`;
  });
  badgesHTML += '</div>';

  // Bar chart per ingredient
  const maxPct = Math.max(...ingList.flatMap(ing => selectedRecipes.map(r => compoMap[r][ing] || 0)), 1);
  let chartsHTML = '<div class="compare-chart-section"><h3>Répartition par ingrédient</h3>';
  ingList.forEach(ing => {
    const vals = selectedRecipes.map(r => compoMap[r][ing] || 0);
    if (vals.every(v => v === 0)) return;
    chartsHTML += `<div class="bar-chart-group"><div class="bcg-label">${ing}</div><div class="bcg-bars">`;
    selectedRecipes.forEach((r, i) => {
      const pct = compoMap[r][ing] || 0;
      const w = pct > 0 ? Math.max((pct / maxPct) * 100, 2) : 0;
      const color = PALETTE[i % PALETTE.length];
      chartsHTML += `<div class="bar-row">
        <div class="bar-row-label" title="${r}">${r}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>
        <div class="bar-row-pct">${pct > 0 ? pct.toFixed(1)+'%' : '—'}</div>
      </div>`;
    });
    chartsHTML += '</div></div>';
  });
  chartsHTML += '</div>';

  // Comparison table
  let tableHTML = '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Ingrédient</th>';
  selectedRecipes.forEach((name, i) => {
    const color = PALETTE[i % PALETTE.length];
    tableHTML += `<th class="recipe-col" style="color:${color};background:${color}12">${name}</th>`;
  });
  tableHTML += '</tr></thead><tbody>';
  ingList.forEach(ing => {
    const vals = selectedRecipes.map(r => compoMap[r][ing] || 0);
    if (vals.every(v => v === 0)) return;
    tableHTML += `<tr><td class="ing-name">${ing}</td>`;
    const maxVal = Math.max(...vals);
    vals.forEach((v, i) => {
      const color = PALETTE[i % PALETTE.length];
      if (v > 0) {
        const w = maxVal > 0 ? Math.round((v / maxVal) * 80) : 0;
        tableHTML += `<td class="pct-cell"><div class="pct-bar-wrap">
          <div class="pct-bar" style="width:${w}px;background:${color}"></div>
          <div class="pct-val">${v.toFixed(1)}%</div>
        </div></td>`;
      } else {
        tableHTML += `<td class="pct-cell pct-empty">—</td>`;
      }
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody></table></div>';

  result.innerHTML = badgesHTML + chartsHTML + tableHTML;
}

// ── SEARCH ────────────────────────────────
let criteria = [];

function allIngredientNames() {
  const fromCompo = new Set(Object.values(STATE.compositions).flatMap(rows => rows.map(r => r.ingredient)));
  const fromTable = STATE.ingredients.map(r => r['Nom'] || r[STATE.ingredientsHeaders[1]] || '');
  return [...new Set([...fromCompo, ...fromTable])].filter(Boolean).sort();
}

function rebuildCriteriaSelects() {
  // Just populate ingredient options when criteria are added
}

function addCriterion() {
  const id = Date.now();
  criteria.push({ id, ingredient: '', min: 0, max: 100 });
  renderCriteriaList();
}

function removeCriterion(id) {
  criteria = criteria.filter(c => c.id !== id);
  renderCriteriaList();
}

function renderCriteriaList() {
  const container = $('#criteria-list');
  container.innerHTML = '';
  const ingNames = allIngredientNames();

  criteria.forEach(c => {
    const row = document.createElement('div');
    row.className = 'criterion-row';

    const opts = ingNames.map(n => `<option value="${n}" ${n === c.ingredient ? 'selected' : ''}>${n}</option>`).join('');
    row.innerHTML = `
      <select data-id="${c.id}" data-field="ingredient">
        <option value="">-- Sélectionner un ingrédient --</option>
        ${opts}
      </select>
      <span class="criterion-sep">entre</span>
      <input type="number" data-id="${c.id}" data-field="min" value="${c.min}" min="0" max="100" step="0.1" style="width:75px" />
      <span class="criterion-sep">%  et</span>
      <input type="number" data-id="${c.id}" data-field="max" value="${c.max}" min="0" max="100" step="0.1" style="width:75px" />
      <span class="criterion-sep">%</span>
      <button class="criterion-del" data-del="${c.id}" title="Supprimer">×</button>
    `;
    container.appendChild(row);
  });

  // Events
  $$('[data-field="ingredient"]', container).forEach(sel => {
    sel.addEventListener('change', e => {
      const id = +e.target.dataset.id;
      criteria.find(c => c.id === id).ingredient = e.target.value;
    });
  });
  $$('[data-field="min"]', container).forEach(inp => {
    inp.addEventListener('input', e => {
      const id = +e.target.dataset.id;
      criteria.find(c => c.id === id).min = parseFloat(e.target.value) || 0;
    });
  });
  $$('[data-field="max"]', container).forEach(inp => {
    inp.addEventListener('input', e => {
      const id = +e.target.dataset.id;
      criteria.find(c => c.id === id).max = parseFloat(e.target.value) || 100;
    });
  });
  $$('[data-del]', container).forEach(btn => {
    btn.addEventListener('click', () => removeCriterion(+btn.dataset.del));
  });
}

function runSearch() {
  const result = $('#search-result');
  const activeCriteria = criteria.filter(c => c.ingredient);

  if (activeCriteria.length === 0) {
    result.innerHTML = '<div class="empty-state"><p>Ajoutez au moins un critère de recherche.</p></div>';
    return;
  }

  // For each recipe, check all criteria
  const matches = [];
  for (const [recipeName, rows] of Object.entries(STATE.compositions)) {
    const ingMap = {};
    rows.forEach(({ ingredient, pct }) => { ingMap[ingredient] = pct; });

    const matchDetails = [];
    let allMatch = true;
    for (const c of activeCriteria) {
      const pct = ingMap[c.ingredient];
      if (pct === undefined || pct < c.min || pct > c.max) {
        allMatch = false;
        break;
      }
      matchDetails.push({ ingredient: c.ingredient, pct, min: c.min, max: c.max });
    }
    if (allMatch) {
      const recetteRow = STATE.recettes.find(r => (r['Nom'] || r[STATE.recettesHeaders[1]]) === recipeName);
      matches.push({ recipeName, matchDetails, row: recetteRow || {} });
    }
  }

  if (matches.length === 0) {
    result.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <p>Aucune recette ne correspond à ces critères.</p>
    </div>`;
    return;
  }

  // Render results table
  const criteriaLabels = activeCriteria.map(c => `${c.ingredient} (${c.min}–${c.max}%)`).join(', ');
  let html = `<div class="search-results-header">
    <h3>Résultats</h3>
    <span class="badge-count">${matches.length} recette${matches.length > 1 ? 's' : ''}</span>
  </div>
  <p style="font-size:12.5px;color:var(--text-3);margin-bottom:16px">Critères : ${criteriaLabels}</p>
  <div class="results-table-wrap"><table class="results-table">
    <thead><tr>
      <th>Code</th><th>Nom de la recette</th>`;

  activeCriteria.forEach(c => {
    html += `<th>${c.ingredient}</th>`;
  });
  html += `</tr></thead><tbody>`;

  matches.forEach(({ recipeName, matchDetails, row }) => {
    const code = row['Code'] || '—';
    html += `<tr><td class="code-cell">${code}</td><td>${recipeName}</td>`;
    matchDetails.forEach(d => {
      html += `<td class="pct-highlight">${d.pct.toFixed(1)}%</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  result.innerHTML = html;
}

function setupSearch() {
  $('#btn-add-criterion').addEventListener('click', () => {
    addCriterion();
  });
  $('#btn-run-search').addEventListener('click', runSearch);
  $('#btn-clear-criteria').addEventListener('click', () => {
    criteria = [];
    renderCriteriaList();
    $('#search-result').innerHTML = '';
  });

  // Add first criterion by default
  addCriterion();
}

// ── CATALOG ───────────────────────────────
let catalogTab = 'recettes';
let catalogSort = { col: null, dir: 1 };
let catalogFilter = '';

function renderCatalog(tab) {
  catalogTab = tab;
  $$('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

  const data = tab === 'recettes' ? STATE.recettes : STATE.ingredients;
  const headers = tab === 'recettes' ? STATE.recettesHeaders : STATE.ingredientsHeaders;

  const q = catalogFilter.toLowerCase();
  let filtered = q ? data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q))) : data;

  if (catalogSort.col) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[catalogSort.col], bv = b[catalogSort.col];
      return (av > bv ? 1 : av < bv ? -1 : 0) * catalogSort.dir;
    });
  }

  $('#catalog-count').textContent = `${filtered.length} / ${data.length} lignes`;

  const wrap = $('#catalog-table-wrap');
  if (!headers.length) { wrap.innerHTML = '<div class="empty-state"><p>Aucune donnée chargée.</p></div>'; return; }

  let html = '<table class="catalog-table"><thead><tr>';
  headers.forEach(h => {
    const sorted = catalogSort.col === h;
    const arrow = sorted ? (catalogSort.dir === 1 ? '▲' : '▼') : '▲';
    html += `<th data-col="${h}" class="${sorted ? 'sorted' : ''}">${h} <span class="sort-arrow">${arrow}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  filtered.slice(0, 500).forEach(row => {
    html += '<tr>';
    headers.forEach(h => { html += `<td title="${String(row[h] || '')}">${row[h] ?? ''}</td>`; });
    html += '</tr>';
  });
  if (filtered.length > 500) {
    html += `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--text-3);font-size:12px;padding:14px">… ${filtered.length - 500} lignes supplémentaires (affichées: 500)</td></tr>`;
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // Sort click
  $$('.catalog-table th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (catalogSort.col === col) catalogSort.dir *= -1;
      else { catalogSort.col = col; catalogSort.dir = 1; }
      renderCatalog(catalogTab);
    });
  });
}

function setupCatalog() {
  $$('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => { catalogFilter = ''; $('#catalog-filter').value = ''; renderCatalog(btn.dataset.tab); });
  });
  $('#catalog-filter').addEventListener('input', e => {
    catalogFilter = e.target.value;
    renderCatalog(catalogTab);
  });
}

// ── NAV ───────────────────────────────────
function setupNav() {
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      showView(view);
      if (view === 'catalog') renderCatalog(catalogTab);
      if (view === 'compare') rebuildCompareDropdown();
    });
  });

  // Mobile
  $('#btn-menu-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });
}

// ── SERVICE WORKER ─────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/PWA/cuisine/sw.js', { scope: '/PWA/cuisine/' }).catch(() => {});
  }
}

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupImport();
  setupCompare();
  setupSearch();
  setupCatalog();
  registerSW();
  updateStatusBar();
});
