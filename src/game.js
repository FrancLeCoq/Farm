(() => {
  'use strict';

  const CFG = window.FRANC_CONFIG;
  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d');

  const UI = {
    coins: $('#coins'),
    level: $('#level'),
    season: $('#seasonLabel'),
    holder: $('#holderBtn'),
    objectiveIcon: $('#objectiveIcon'),
    objectiveTitle: $('#objectiveTitle'),
    objectiveText: $('#objectiveText'),
    objectiveProgress: $('#objectiveProgress'),
    selectionTitle: $('#selectionTitle'),
    selectionText: $('#selectionText'),
    selectionAction: $('#selectionAction'),
    sheet: $('#sheet'),
    sheetTitle: $('#sheetTitle'),
    sheetBody: $('#sheetBody'),
    toasts: $('#toasts'),
    intro: $('#intro')
  };

  const TILE_W = CFG.tile.w;
  const TILE_H = CFG.tile.h;
  const COLORS = {
    grass1: '#3bb66f', grass2: '#279457', grassLine: 'rgba(255,255,255,.15)',
    soil1: '#9a6234', soil2: '#70411f', soilLine: 'rgba(255,238,198,.18)',
    road1: '#8a7b6a', road2: '#63584c', water: '#2563eb', shadow: 'rgba(0,0,0,.26)'
  };

  const state = loadState() || newState();
  const world = {
    tool: 'inspect', crop: 'wheat', building: 'coop', selected: null,
    camera: { x: 0, y: 70, scale: 1 },
    pointer: { down: false, x: 0, y: 0, sx: 0, sy: 0, moved: false },
    lastFrame: performance.now(),
    tickAcc: 0,
    sparkles: [],
    clouds: Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: Math.random() * .42, s: .6 + Math.random() * 1.2, phase: i * 93 }))
  };

  // ---------- State ----------
  function newState() {
    const now = Date.now();
    const grid = [];
    for (let y = 0; y < CFG.gridSize; y++) {
      const row = [];
      for (let x = 0; x < CFG.gridSize; x++) {
        row.push({ terrain: 'grass', crop: null, building: null, deco: null, locked: Math.abs(x - 4.5) + Math.abs(y - 4.5) > 7 });
      }
      grid.push(row);
    }
    // Starting clearing.
    for (let y = 2; y <= 7; y++) for (let x = 2; x <= 7; x++) grid[y][x].locked = false;
    grid[5][5].building = { type: 'coop', placedAt: now, readyAt: now + 38000 };
    grid[5][4].deco = 'road'; grid[4][4].deco = 'road'; grid[4][5].deco = 'road';
    return {
      createdAt: now, lastSeen: now, coins: CFG.startCoins, xp: 0, level: 1,
      holder: new URLSearchParams(location.search).get('holder') === '1' || localStorage.getItem('franc_holder') === '1',
      grid, inv: { wheat: 2 }, stats: { plowed: 0, harvested: 0, coopBuilt: 1, ordersDone: 0 },
      quest: 0, orders: [0, 1, 2], seenIntro: false, messages: [], version: CFG.version
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CFG.saveKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.grid) return null;
      parsed.holder = parsed.holder || new URLSearchParams(location.search).get('holder') === '1' || localStorage.getItem('franc_holder') === '1';
      return parsed;
    } catch { return null; }
  }

  function saveState() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(CFG.saveKey, JSON.stringify(state)); } catch { /* ignore quota */ }
  }

  function resetState() {
    localStorage.removeItem(CFG.saveKey);
    location.reload();
  }

  // ---------- Economy ----------
  function addCoins(amount, label = '') {
    state.coins += Math.max(0, Math.floor(amount));
    if (amount > 0) toast(`+${Math.floor(amount)} 🪙 ${label}`.trim());
  }

  function spend(amount) {
    amount = Math.floor(amount);
    if (state.coins < amount) { toast('Pas assez de francs 🪙'); return false; }
    state.coins -= amount;
    return true;
  }

  function addXp(amount) {
    state.xp += amount;
    let needed = xpNeeded(state.level);
    while (state.xp >= needed) {
      state.xp -= needed;
      state.level += 1;
      state.stats.level = state.level;
      toast(`Niveau ${state.level} débloqué 👑`);
      world.sparkles.push({ kind: 'level', x: innerWidth / 2, y: innerHeight / 2, t: 0 });
      needed = xpNeeded(state.level);
    }
  }

  function xpNeeded(level) { return 110 + level * 55 + Math.floor(level * level * 9); }
  function invCount(key) { return state.inv[key] || 0; }
  function addInv(key, amount) { state.inv[key] = Math.max(0, (state.inv[key] || 0) + amount); }
  function removeInv(key, amount) {
    if (invCount(key) < amount) return false;
    state.inv[key] -= amount;
    return true;
  }

  function canMeetNeed(need) {
    return Object.entries(need).every(([k, qty]) => invCount(k) >= qty);
  }

  function consumeNeed(need) {
    if (!canMeetNeed(need)) return false;
    Object.entries(need).forEach(([k, qty]) => removeInv(k, qty));
    return true;
  }

  function currentQuest() { return CFG.quests[Math.min(state.quest, CFG.quests.length - 1)]; }
  function metricValue(metric) { return metric === 'level' ? state.level : (state.stats[metric] || 0); }
  function checkQuestReward() {
    const q = currentQuest();
    if (!q || metricValue(q.metric) < q.target) return;
    addCoins(q.reward, 'récompense quête');
    addXp(Math.floor(q.reward / 3));
    state.quest = Math.min(state.quest + 1, CFG.quests.length - 1);
    toast('Quête validée 📜');
  }

  // ---------- Offline progress ----------
  function applyOfflineProgress() {
    const now = Date.now();
    const elapsed = Math.min(8 * 3600 * 1000, Math.max(0, now - (state.lastSeen || now)));
    if (elapsed < 15000) return;
    let produced = [];
    eachCell((cell) => {
      if (!cell.building) return;
      const def = CFG.buildings[cell.building.type];
      if (!def || !def.prod) return;
      let readyAt = cell.building.readyAt || now + def.prod.every * 1000;
      let count = 0;
      while (readyAt <= now && count < 40) {
        if (def.input && !consumeNeed(def.input)) break;
        addInv(def.prod.item, def.prod.qty);
        produced.push(def.prod.emoji);
        readyAt += def.prod.every * 1000;
        count++;
      }
      cell.building.readyAt = readyAt;
    });
    if (produced.length) toast(`Production hors-ligne : ${produced.slice(0, 8).join(' ')}`);
    state.lastSeen = now;
  }

  // ---------- Grid helpers ----------
  function eachCell(fn) {
    for (let y = 0; y < state.grid.length; y++) for (let x = 0; x < state.grid[y].length; x++) fn(state.grid[y][x], x, y);
  }
  function cellAt(x, y) { return state.grid[y] && state.grid[y][x]; }
  function inBounds(x, y) { return x >= 0 && y >= 0 && y < state.grid.length && x < state.grid[y].length; }
  function tileCenter(x, y) { return { x: (x - y) * TILE_W / 2, y: (x + y) * TILE_H / 2 }; }
  function screenToWorld(px, py) {
    const rect = canvas.getBoundingClientRect();
    const sx = (px - rect.left - rect.width / 2 - world.camera.x) / world.camera.scale;
    const sy = (py - rect.top - 150 - world.camera.y) / world.camera.scale;
    const x = Math.floor((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
    const y = Math.floor((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
    return { x, y };
  }

  // ---------- Actions ----------
  function handleTile(x, y) {
    if (!inBounds(x, y)) return;
    const cell = cellAt(x, y);
    if (cell.locked) return unlockLand(x, y);
    world.selected = { x, y };

    if (world.tool === 'plow') return plow(cell, x, y);
    if (world.tool === 'plant') return plant(cell, x, y, world.crop);
    if (world.tool === 'build') return build(cell, x, y, world.building);
    if (world.tool === 'road') return placeRoad(cell, x, y);
    return inspect(cell, x, y);
  }

  function unlockLand(x, y) {
    const cost = 75 + unlockedCount() * 6;
    if (!spend(cost)) return;
    cellAt(x, y).locked = false;
    addXp(6);
    toast('Terrain débloqué 🟩');
    saveState(); renderUI();
  }

  function unlockedCount() {
    let n = 0; eachCell((c) => { if (!c.locked) n++; }); return n;
  }

  function plow(cell, x, y) {
    if (cell.building) return toast('Impossible sous un bâtiment.');
    if (cell.terrain === 'soil') return toast('Déjà labouré.');
    const cost = 6;
    if (!spend(cost)) return;
    cell.terrain = 'soil'; cell.deco = null;
    state.stats.plowed += 1; addXp(2);
    popAt(x, y, '🚜');
    checkQuestReward(); saveState(); renderUI();
  }

  function plant(cell, x, y, key) {
    const crop = CFG.crops[key];
    if (!crop) return;
    if (crop.holder && !state.holder) return holderGate();
    if (cell.terrain !== 'soil' || cell.building) return toast('Il faut une parcelle labourée.');
    if (cell.crop) return inspect(cell, x, y);
    if (!spend(crop.seed)) return;
    cell.crop = { key, plantedAt: Date.now(), readyAt: Date.now() + crop.grow * 1000 };
    addXp(1);
    popAt(x, y, crop.emoji);
    saveState(); renderUI();
  }

  function harvest(cell, x, y) {
    if (!cell.crop) return false;
    const crop = CFG.crops[cell.crop.key];
    if (Date.now() < cell.crop.readyAt) { toast('Ça pousse encore 🌱'); return false; }
    addInv(cell.crop.key, 1);
    addXp(crop.xp);
    state.stats.harvested += 1;
    cell.crop = null;
    popAt(x, y, crop.emoji);
    checkQuestReward(); saveState(); renderUI();
    return true;
  }

  function build(cell, x, y, key) {
    const def = CFG.buildings[key];
    if (!def) return;
    if (def.holder && !state.holder) return holderGate();
    if (cell.building || cell.crop) return toast('Case occupée.');
    if (cell.terrain !== 'grass' && cell.terrain !== 'soil') return toast('Terrain non compatible.');
    if (!spend(def.cost)) return;
    cell.building = { type: key, placedAt: Date.now(), readyAt: Date.now() + ((def.prod?.every || 30) * 1000) };
    cell.terrain = 'grass'; cell.crop = null; cell.deco = null;
    addXp(def.xp);
    if (key === 'coop') state.stats.coopBuilt += 1;
    popAt(x, y, def.emoji);
    checkQuestReward(); saveState(); renderUI();
  }

  function placeRoad(cell, x, y) {
    if (cell.building || cell.crop) return toast('Case occupée.');
    if (cell.deco === 'road') { cell.deco = null; toast('Route retirée'); }
    else {
      if (!spend(CFG.decorations.road.cost)) return;
      cell.deco = 'road'; addXp(CFG.decorations.road.xp); popAt(x, y, '🧱');
    }
    saveState(); renderUI();
  }

  function inspect(cell, x, y) {
    if (cell.crop) {
      const crop = CFG.crops[cell.crop.key];
      const remain = Math.max(0, Math.ceil((cell.crop.readyAt - Date.now()) / 1000));
      if (remain <= 0) harvest(cell, x, y);
      else setSelection(crop.name, `Prêt dans ${formatTime(remain)}. Valeur stock : ${crop.sell} 🪙.`, null);
      return;
    }
    if (cell.building) return inspectBuilding(cell, x, y);
    if (cell.locked) return setSelection('Terrain sauvage', 'Touche pour acheter cette parcelle et agrandir le poulailler.', null);
    setSelection('Case libre', 'Choisis un outil : labourer, planter, bâtir ou tracer une route.', null);
  }

  function inspectBuilding(cell, x, y) {
    const def = CFG.buildings[cell.building.type];
    if (!def || !def.prod) return;
    const remain = Math.ceil((cell.building.readyAt - Date.now()) / 1000);
    if (remain > 0) {
      const input = def.input ? ` Besoin : ${needText(def.input)}.` : '';
      setSelection(def.name, `${def.prod.name} dans ${formatTime(remain)}.${input}`, null);
      return;
    }
    // Building is ready.
    if (def.input && !canMeetNeed(def.input)) {
      setSelection(def.name, `Production prête mais il manque : ${needText(def.input)}.`, null);
      toast('Ressources insuffisantes pour relancer.');
      return;
    }
    if (def.input) consumeNeed(def.input);
    addInv(def.prod.item, def.prod.qty);
    addXp(Math.max(4, Math.floor((def.prod.sell || 40) / 20)));
    cell.building.readyAt = Date.now() + def.prod.every * 1000;
    popAt(x, y, def.prod.emoji);
    toast(`${def.prod.name} collecté ${def.prod.emoji}`);
    saveState(); renderUI();
  }

  function harvestAll() {
    let count = 0;
    eachCell((cell, x, y) => { if (cell.crop && Date.now() >= cell.crop.readyAt) { harvest(cell, x, y); count++; } });
    if (!count) toast('Aucune culture prête.');
  }

  function sellItem(key, amount = 1) {
    const value = itemSellValue(key);
    if (!value || invCount(key) < amount) return;
    removeInv(key, amount);
    addCoins(value * amount, 'vente');
    saveState(); renderUI();
  }

  function itemSellValue(key) {
    if (CFG.crops[key]) return CFG.crops[key].sell;
    for (const b of Object.values(CFG.buildings)) if (b.prod?.item === key) return b.prod.sell;
    return 0;
  }

  function completeOrder(index) {
    const order = CFG.orders[index];
    if (!order) return;
    if (order.holder && !state.holder) return holderGate();
    if (!consumeNeed(order.need)) { toast('Commande incomplète 📦'); return; }
    addCoins(order.reward, 'commande');
    addXp(order.xp);
    state.stats.ordersDone += 1;
    const next = (Math.max(...state.orders) + 1) % CFG.orders.length;
    state.orders = state.orders.map((i) => i === index ? next : i);
    checkQuestReward(); saveState(); renderUI(); openPanel('orders');
  }

  function holderGate() {
    toast('Bonus holder : ajoute ?holder=1 dans l’URL pour tester 🔓');
    setSelection('Mode Holder $FRANC', 'Ce contenu est prévu pour les holders. En test GitHub, utilise ?holder=1 pour simuler la vérification wallet.', null);
  }

  function activateHolder() {
    state.holder = true;
    localStorage.setItem('franc_holder', '1');
    toast('Mode holder activé localement 🔓');
    saveState(); renderUI();
  }

  // ---------- Panels ----------
  function openPanel(kind) {
    UI.sheet.classList.add('is-open'); UI.sheet.setAttribute('aria-hidden', 'false');
    if (kind === 'crops') return renderCropsPanel();
    if (kind === 'buildings') return renderBuildingsPanel();
    if (kind === 'orders') return renderOrdersPanel();
    if (kind === 'inventory') return renderInventoryPanel();
  }

  function closePanel() { UI.sheet.classList.remove('is-open'); UI.sheet.setAttribute('aria-hidden', 'true'); }

  function renderCropsPanel() {
    UI.sheetTitle.textContent = 'Cultures 🌾';
    UI.sheetBody.innerHTML = '<div class="card-grid"></div>';
    const grid = UI.sheetBody.firstElementChild;
    Object.entries(CFG.crops).forEach(([key, crop]) => {
      const locked = crop.holder && !state.holder;
      const div = card(crop.emoji, crop.name, `${crop.desc}<br>Coût ${crop.seed} 🪙 · Vente ${crop.sell} 🪙 · ${formatTime(crop.grow)}`);
      const btn = document.createElement('button'); btn.className = `buy-btn ${locked ? 'is-premium' : ''}`;
      btn.textContent = locked ? 'Holder' : 'Sélectionner';
      btn.onclick = () => { if (locked) return holderGate(); world.crop = key; setTool('plant'); closePanel(); toast(`${crop.name} sélectionné`); };
      div.appendChild(btn); grid.appendChild(div);
    });
  }

  function renderBuildingsPanel() {
    UI.sheetTitle.textContent = 'Bâtiments 🏠';
    UI.sheetBody.innerHTML = '<div class="card-grid"></div>';
    const grid = UI.sheetBody.firstElementChild;
    Object.entries(CFG.buildings).forEach(([key, def]) => {
      const locked = def.holder && !state.holder;
      const prod = def.prod ? `Produit ${def.prod.emoji} toutes les ${formatTime(def.prod.every)}.` : '';
      const div = card(def.emoji, def.name, `${def.desc}<br>${prod}<br>Coût ${def.cost} 🪙`);
      const btn = document.createElement('button'); btn.className = `buy-btn ${locked ? 'is-premium' : ''}`;
      btn.textContent = locked ? 'Holder' : 'Placer';
      btn.onclick = () => { if (locked) return holderGate(); world.building = key; setTool('build'); closePanel(); toast(`${def.name} sélectionné`); };
      div.appendChild(btn); grid.appendChild(div);
    });
  }

  function renderOrdersPanel() {
    UI.sheetTitle.textContent = 'Commandes 📦';
    UI.sheetBody.innerHTML = '<div class="card-grid"></div>';
    const grid = UI.sheetBody.firstElementChild;
    state.orders.forEach((idx) => {
      const order = CFG.orders[idx]; if (!order) return;
      const div = document.createElement('div'); div.className = 'order-card';
      div.innerHTML = `<div class="shop-card__icon">📦</div><div class="order-card__main"><strong>${order.name}</strong><span>${needText(order.need, true)}</span><span class="order-card__reward">+${order.reward} 🪙 · +${order.xp} XP</span></div>`;
      const btn = document.createElement('button'); btn.className = `buy-btn ${canMeetNeed(order.need) ? '' : 'is-disabled'}`;
      if (order.holder && !state.holder) { btn.className = 'buy-btn is-premium'; btn.textContent = 'Holder'; }
      else btn.textContent = canMeetNeed(order.need) ? 'Livrer' : 'Manque';
      btn.onclick = () => completeOrder(idx);
      div.appendChild(btn); grid.appendChild(div);
    });
  }

  function renderInventoryPanel() {
    UI.sheetTitle.textContent = 'Stock 🎒';
    const keys = new Set([...Object.keys(CFG.crops)]);
    Object.values(CFG.buildings).forEach((b) => { if (b.prod) keys.add(b.prod.item); });
    UI.sheetBody.innerHTML = '<div class="card-grid"></div>';
    const grid = UI.sheetBody.firstElementChild;
    Array.from(keys).forEach((key) => {
      const qty = invCount(key); if (!qty) return;
      const meta = itemMeta(key);
      const div = document.createElement('div'); div.className = 'inventory-card';
      div.innerHTML = `<div><strong>${meta.emoji} ${meta.name}</strong><span>Valeur unitaire ${itemSellValue(key)} 🪙</span></div><b>x${qty}</b>`;
      const btn = document.createElement('button'); btn.className = 'buy-btn'; btn.textContent = 'Vendre 1'; btn.onclick = () => sellItem(key, 1);
      div.appendChild(btn); grid.appendChild(div);
    });
    if (!grid.children.length) grid.innerHTML = '<p style="color:var(--muted);margin:8px">Le stock est vide. Plante, récolte ou collecte un bâtiment.</p>';
    const reset = document.createElement('button'); reset.className = 'buy-btn is-disabled'; reset.style.width = '100%'; reset.style.marginTop = '12px'; reset.textContent = 'Réinitialiser la sauvegarde'; reset.onclick = resetState;
    UI.sheetBody.appendChild(reset);
  }

  function card(icon, title, html) {
    const div = document.createElement('div'); div.className = 'shop-card';
    div.innerHTML = `<div class="shop-card__icon">${icon}</div><div class="shop-card__body"><strong>${title}</strong><span>${html}</span></div>`;
    return div;
  }

  function itemMeta(key) {
    if (CFG.crops[key]) return { name: CFG.crops[key].name, emoji: CFG.crops[key].emoji };
    for (const b of Object.values(CFG.buildings)) if (b.prod?.item === key) return { name: b.prod.name, emoji: b.prod.emoji };
    return { name: key, emoji: '📦' };
  }

  function needText(need, withOwned = false) {
    return Object.entries(need).map(([k, q]) => {
      const m = itemMeta(k); const have = invCount(k);
      return `${m.emoji} ${q}${withOwned ? ` / ${have}` : ''}`;
    }).join(' · ');
  }

  // ---------- Render UI ----------
  function renderUI() {
    UI.coins.textContent = Math.floor(state.coins).toLocaleString('fr-FR');
    UI.level.textContent = state.level;
    UI.holder.classList.toggle('is-holder', !!state.holder);
    UI.holder.textContent = state.holder ? '🔓 Holder' : '🔒 Holder';

    const q = currentQuest();
    if (q) {
      const value = Math.min(metricValue(q.metric), q.target);
      UI.objectiveIcon.textContent = q.icon;
      UI.objectiveTitle.textContent = q.title;
      UI.objectiveText.textContent = q.text + ` (${value}/${q.target})`;
      UI.objectiveProgress.style.width = `${Math.round(value / q.target * 100)}%`;
    }

    const minutes = Math.floor((Date.now() - state.createdAt) / 1000 * 3) % (24 * 60);
    const hh = Math.floor(minutes / 60);
    const label = hh < 6 ? 'Nuit calme sur la ferme' : hh < 12 ? 'Aube dans le poulailler' : hh < 18 ? 'Après-midi de récolte' : 'Coucher de soleil doré';
    UI.season.textContent = `${label} · ${String(hh).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  function setSelection(title, text, action) {
    UI.selectionTitle.textContent = title;
    UI.selectionText.textContent = text;
    if (action) { UI.selectionAction.hidden = false; UI.selectionAction.textContent = action.label; UI.selectionAction.onclick = action.fn; }
    else { UI.selectionAction.hidden = true; UI.selectionAction.onclick = null; }
  }

  function setTool(tool) {
    world.tool = tool;
    document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('is-active', b.dataset.tool === tool));
    const names = { inspect: 'Mode jeu', plow: 'Mode labour', plant: `Planter : ${CFG.crops[world.crop].name}`, build: `Bâtir : ${CFG.buildings[world.building].name}`, road: 'Tracer des routes' };
    setSelection(names[tool], 'Touche une case sur la carte.', null);
  }

  function toast(msg) {
    const div = document.createElement('div');
    div.className = 'toast'; div.textContent = msg;
    UI.toasts.appendChild(div);
    setTimeout(() => div.remove(), 2400);
  }

  function popAt(x, y, text) {
    const p = tileCenter(x + .5, y + .5);
    world.sparkles.push({ kind: 'text', text, x: p.x, y: p.y - 34, t: 0 });
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, '0')}`;
    return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`;
  }

  // ---------- Canvas drawing ----------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now = performance.now()) {
    const rect = canvas.getBoundingClientRect();
    const dt = Math.min(0.05, (now - world.lastFrame) / 1000);
    world.lastFrame = now; world.tickAcc += dt;
    if (world.tickAcc > 1) { tick(); world.tickAcc = 0; }

    drawSky(rect.width, rect.height, now);
    ctx.save();
    ctx.translate(rect.width / 2 + world.camera.x, 150 + world.camera.y);
    ctx.scale(world.camera.scale, world.camera.scale);

    const cells = [];
    eachCell((cell, x, y) => cells.push({ cell, x, y, z: x + y }));
    cells.sort((a, b) => a.z - b.z);
    for (const c of cells) drawTile(c.cell, c.x, c.y, now);
    for (const c of cells) drawContent(c.cell, c.x, c.y, now);
    drawFrancis(now);
    drawWorldFx(dt);
    ctx.restore();
    requestAnimationFrame(draw);
  }

  function drawSky(w, h, now) {
    const minutes = Math.floor((Date.now() - state.createdAt) / 1000 * 3) % (24 * 60);
    const hh = minutes / 60;
    const night = hh < 6 || hh > 20;
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    if (night) { grd.addColorStop(0, '#091026'); grd.addColorStop(.45, '#15214a'); grd.addColorStop(1, '#10271f'); }
    else if (hh < 9 || hh > 17) { grd.addColorStop(0, '#fb923c'); grd.addColorStop(.44, '#38bdf8'); grd.addColorStop(1, '#236b3f'); }
    else { grd.addColorStop(0, '#38bdf8'); grd.addColorStop(.48, '#60a5fa'); grd.addColorStop(1, '#277348'); }
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (const cl of world.clouds) {
      const x = ((cl.x * w + now * .006 * cl.s + cl.phase) % (w + 180)) - 90;
      const y = 85 + cl.y * 190;
      drawCloud(x, y, cl.s, night ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.34)');
    }
    ctx.restore();

    ctx.globalAlpha = night ? .45 : .18;
    ctx.fillStyle = night ? '#dbeafe' : '#fff7d6';
    ctx.beginPath(); ctx.arc(w - 72, 94, night ? 24 : 36, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawCloud(x, y, s, fill) {
    ctx.fillStyle = fill; ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y - 8 * s, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 18 * s, 0, Math.PI * 2);
    ctx.fillRect(x - 4 * s, y - 2 * s, 62 * s, 19 * s); ctx.fill();
  }

  function drawTile(cell, x, y) {
    const p = tileCenter(x, y);
    const selected = world.selected && world.selected.x === x && world.selected.y === y;
    let top = cell.locked ? '#233047' : (cell.terrain === 'soil' ? COLORS.soil1 : COLORS.grass1);
    let side = cell.locked ? '#151e30' : (cell.terrain === 'soil' ? COLORS.soil2 : COLORS.grass2);
    if (cell.deco === 'road') { top = COLORS.road1; side = COLORS.road2; }
    drawDiamond(p.x, p.y, top, side, selected ? 'rgba(255,209,92,.98)' : (cell.terrain === 'soil' ? COLORS.soilLine : COLORS.grassLine));
    if (cell.locked) {
      ctx.save(); ctx.globalAlpha = .55; ctx.fillStyle = '#0f172a'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🔒', p.x, p.y + 10); ctx.restore();
    }
    if (cell.deco === 'road') drawRoadMark(p.x, p.y);
  }

  function drawDiamond(x, y, top, side, line) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2); ctx.lineTo(x, y + TILE_H); ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2); ctx.closePath();
    ctx.fillStyle = side; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2 - 5); ctx.lineTo(x, y + TILE_H - 5); ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2 - 5); ctx.closePath();
    ctx.fillStyle = top; ctx.fill(); ctx.strokeStyle = line; ctx.stroke();
  }

  function drawRoadMark(x, y) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 18, y + 19); ctx.lineTo(x + 18, y + 19); ctx.stroke(); ctx.restore();
  }

  function drawContent(cell, x, y, now) {
    const p = tileCenter(x, y);
    if (cell.crop) drawCrop(cell, p.x, p.y, now);
    if (cell.building) drawBuilding(cell, p.x, p.y, now);
  }

  function drawCrop(cell, x, y, now) {
    const crop = CFG.crops[cell.crop.key];
    const age = Math.max(0, nowMs() - cell.crop.plantedAt);
    const ratio = Math.min(1, age / (crop.grow * 1000));
    const stems = ratio < .34 ? 3 : ratio < .7 ? 5 : 8;
    ctx.save(); ctx.translate(x, y + 18);
    for (let i = 0; i < stems; i++) {
      const ox = (i - stems / 2) * 5 + Math.sin(now * .003 + i) * 1.5;
      const h = 9 + ratio * 22 + (i % 2) * 4;
      ctx.strokeStyle = ratio < .5 ? '#86efac' : crop.color;
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.quadraticCurveTo(ox + 4, -h / 2, ox, -h); ctx.stroke();
      if (ratio > .7) { ctx.fillStyle = crop.color; ctx.beginPath(); ctx.ellipse(ox + 2, -h + 1, 4, 7, .5, 0, Math.PI * 2); ctx.fill(); }
    }
    if (ratio >= 1) { ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✨', 0, -36 + Math.sin(now * .006) * 3); }
    ctx.restore();
  }

  function drawBuilding(cell, x, y, now) {
    const def = CFG.buildings[cell.building.type];
    const ready = Date.now() >= (cell.building.readyAt || 0);
    ctx.save(); ctx.translate(x, y + 16);
    // Shadow.
    ctx.fillStyle = COLORS.shadow; ctx.beginPath(); ctx.ellipse(0, 8, 36, 13, 0, 0, Math.PI * 2); ctx.fill();
    // Body.
    ctx.fillStyle = def.color; roundedRect(-29, -43, 58, 48, 8); ctx.fill();
    ctx.fillStyle = shade(def.color, -.18); roundedRect(-24, -34, 48, 38, 6); ctx.fill();
    // Roof.
    ctx.fillStyle = shade(def.color, .25); ctx.beginPath(); ctx.moveTo(-36, -37); ctx.lineTo(0, -65); ctx.lineTo(36, -37); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke();
    // Door/window.
    ctx.fillStyle = '#1f2937'; roundedRect(-8, -16, 16, 21, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; roundedRect(12, -31, 12, 10, 3); ctx.fill();
    ctx.font = '25px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(def.emoji, 0, -39);
    if (ready) {
      ctx.font = '24px sans-serif';
      ctx.fillText(def.prod?.emoji || '✨', 0, -74 + Math.sin(now * .006) * 4);
    } else if (def.prod) {
      const remain = Math.max(0, Math.ceil((cell.building.readyAt - Date.now()) / 1000));
      ctx.fillStyle = 'rgba(7, 9, 26, .78)'; roundedRect(-22, -76, 44, 16, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(formatTime(remain), 0, -64);
    }
    ctx.restore();
  }

  function drawFrancis(now) {
    const p = tileCenter(4.5, 4.5);
    ctx.save(); ctx.translate(p.x - 80, p.y + 38 + Math.sin(now * .004) * 3);
    ctx.fillStyle = COLORS.shadow; ctx.beginPath(); ctx.ellipse(0, 16, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(0, -4, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(12, -31, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(7 + i * 7, -48 - (i % 2) * 5, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(28, -30); ctx.lineTo(46, -24); ctx.lineTo(28, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(18, -34, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-7, 17); ctx.lineTo(-13, 31); ctx.moveTo(7, 17); ctx.lineTo(13, 31); ctx.stroke();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-18, -10, 18, -1.2, 1.3); ctx.stroke();
    ctx.restore();
  }

  function drawWorldFx(dt) {
    for (let i = world.sparkles.length - 1; i >= 0; i--) {
      const fx = world.sparkles[i]; fx.t += dt;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - fx.t / 1.2);
      if (fx.kind === 'text') {
        ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(fx.text, fx.x, fx.y - fx.t * 34);
      } else {
        ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👑', fx.x, fx.y - fx.t * 40);
      }
      ctx.restore();
      if (fx.t > 1.2) world.sparkles.splice(i, 1);
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function shade(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) hex = hex.split('').map((c) => c + c).join('');
    let out = '#';
    for (let i = 0; i < 3; i++) {
      const c = parseInt(hex.substr(i * 2, 2), 16);
      const v = Math.round(Math.min(255, Math.max(0, c + c * lum)));
      out += (`00${v.toString(16)}`).slice(-2);
    }
    return out;
  }

  function nowMs() { return Date.now(); }

  function tick() {
    // Update building production readiness only through timestamps, then refresh UI.
    checkQuestReward();
    renderUI(); saveState();
  }

  // ---------- Events ----------
  function bindEvents() {
    window.addEventListener('resize', resize);
    document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
    document.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.panel)));
    document.querySelectorAll('[data-action="harvestAll"]').forEach((b) => b.addEventListener('click', harvestAll));
    $('#sheetClose').addEventListener('click', closePanel);
    UI.sheet.addEventListener('click', (e) => { if (e.target === UI.sheet) closePanel(); });
    UI.holder.addEventListener('click', () => state.holder ? toast('Holder déjà actif 🔓') : activateHolder());
    $('#startGame').addEventListener('click', () => { state.seenIntro = true; UI.intro.classList.add('is-hidden'); saveState(); toast('Bienvenue, rooster 🐓'); });

    canvas.addEventListener('pointerdown', (e) => {
      world.pointer.down = true; world.pointer.sx = e.clientX; world.pointer.sy = e.clientY; world.pointer.x = e.clientX; world.pointer.y = e.clientY; world.pointer.moved = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!world.pointer.down) return;
      const dx = e.clientX - world.pointer.x; const dy = e.clientY - world.pointer.y;
      if (Math.abs(e.clientX - world.pointer.sx) + Math.abs(e.clientY - world.pointer.sy) > 8) world.pointer.moved = true;
      world.camera.x += dx; world.camera.y += dy; world.pointer.x = e.clientX; world.pointer.y = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!world.pointer.moved) { const p = screenToWorld(e.clientX, e.clientY); handleTile(p.x, p.y); }
      world.pointer.down = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); world.camera.scale = Math.min(1.55, Math.max(.72, world.camera.scale + (e.deltaY > 0 ? -.06 : .06)));
    }, { passive: false });
  }

  function bootstrap() {
    applyOfflineProgress(); resize(); bindEvents(); renderUI();
    UI.intro.classList.toggle('is-hidden', !!state.seenIntro);
    setSelection('Francis attend ton ordre', CFG.tips[Math.floor(Math.random() * CFG.tips.length)], null);
    requestAnimationFrame(draw);
  }

  bootstrap();
})();
