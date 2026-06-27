(() => {
  'use strict';

  const SAVE_KEY = 'francisFarmTownship_v2';
  const W = 12;
  const H = 9;
  const TILE_W = 92;
  const TILE_H = 46;
  const MAX_FACTORY_QUEUE = 2;

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');

  let TG = null;
  function initTelegram() {
    TG = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : TG;
    if (!TG) return;
    try { TG.ready(); TG.expand(); TG.setHeaderColor('#0b1f34'); TG.setBackgroundColor('#071625'); } catch (_) {}
  }
  initTelegram();
  setTimeout(initTelegram, 900);

  const haptic = (kind = 'light') => {
    try {
      initTelegram();
      if (!TG || !TG.HapticFeedback) return;
      if (kind === 'success' || kind === 'error' || kind === 'warning') TG.HapticFeedback.notificationOccurred(kind);
      else TG.HapticFeedback.impactOccurred(kind);
    } catch (_) {}
  };

  const ITEM = {
    wheat:  { name: 'Blé', icon: '🌾', cost: 1,  grow: 14000, value: 3,  xp: 2, level: 1, color: '#e8bf4f' },
    corn:   { name: 'Maïs', icon: '🌽', cost: 3,  grow: 32000, value: 7,  xp: 4, level: 2, color: '#f5d84d' },
    carrot: { name: 'Carotte', icon: '🥕', cost: 5, grow: 52000, value: 12, xp: 7, level: 3, color: '#f59a39' },
    bread:  { name: 'Pain', icon: '🍞', value: 24, xp: 8, level: 1, color: '#c78b4a' },
    feed:   { name: 'Nourriture', icon: '🌽', value: 16, xp: 6, level: 2, color: '#e0c55a' },
    eggs:   { name: 'Œufs', icon: '🥚', value: 30, xp: 10, level: 2, color: '#faf2d0' },
    milk:   { name: 'Lait', icon: '🥛', value: 42, xp: 13, level: 4, color: '#f5ffff' },
    jam:    { name: 'Confiture', icon: '🍯', value: 58, xp: 18, level: 5, color: '#ff9957' },
  };

  const RECIPES = {
    bakery: [
      { id: 'bread', name: 'Pain du coq', factory: 'bakery', inputs: { wheat: 2 }, time: 45000, xp: 8 },
      { id: 'jam', name: 'Confiture dorée', factory: 'bakery', inputs: { carrot: 2, corn: 1 }, time: 90000, xp: 18, minLevel: 5 },
    ],
    feedMill: [
      { id: 'feed', name: 'Nourriture basse-cour', factory: 'feedMill', inputs: { corn: 1 }, time: 36000, xp: 6, minLevel: 2 },
    ],
    chickenCoop: [
      { id: 'eggs', name: 'Œufs Francis', factory: 'chickenCoop', inputs: { feed: 1 }, time: 52000, xp: 10, minLevel: 2 },
    ],
    dairy: [
      { id: 'milk', name: 'Lait fermier', factory: 'dairy', inputs: { feed: 1, corn: 1 }, time: 76000, xp: 13, minLevel: 4 },
    ],
  };

  const BUILDING = {
    townhall: { name: 'Mairie du Poulailler', icon: '🏛️', cost: 0, pop: 0, color: '#d9b05f', roof: '#3b6dcc', size: 2, unique: true },
    barn: { name: 'Grange', icon: '📦', cost: 0, pop: 0, color: '#b15343', roof: '#71312b', size: 1, unique: true },
    helipad: { name: 'Héliport commandes', icon: '🚁', cost: 0, pop: 0, color: '#6f8798', roof: '#354b5a', size: 1, unique: true },
    bakery: { name: 'Boulangerie', icon: '🍞', cost: 160, pop: 0, color: '#df8c4d', roof: '#a03d2d', size: 1, unique: true, minLevel: 1 },
    feedMill: { name: 'Moulin à nourriture', icon: '🌽', cost: 210, pop: 0, color: '#b8a76a', roof: '#765b30', size: 1, unique: true, minLevel: 2 },
    chickenCoop: { name: 'Poulailler producteur', icon: '🥚', cost: 260, pop: 0, color: '#c87050', roof: '#8b3328', size: 1, unique: true, minLevel: 2 },
    dairy: { name: 'Laiterie', icon: '🥛', cost: 520, pop: 0, color: '#e6edf2', roof: '#4b83b8', size: 1, unique: true, minLevel: 4 },
    house: { name: 'Maison de fermier', icon: '🏠', cost: 120, pop: 2, color: '#f0c077', roof: '#ca4b3d', size: 1, minLevel: 1 },
    shop: { name: 'Marché', icon: '🏪', cost: 420, pop: 1, color: '#6bd0b2', roof: '#277d76', size: 1, minLevel: 3 },
    fountain: { name: 'Fontaine 1F', icon: '⛲', cost: 95, pop: 0, color: '#7dc2ff', roof: '#e9f7ff', size: 1, minLevel: 1, deco: true },
    plot: { name: 'Champ cultivable', icon: '🟫', cost: 35, pop: 0, minLevel: 1 },
  };

  const QUOTES = {
    idle: [
      'Plante, récolte, fabrique, livre. Le poulailler va devenir énorme.',
      'Ici, pas de boutique cachée. Tout se gagne en jouant.',
      'Clique un champ mûr pour récolter. Clique une usine pour récupérer la production.',
      'Le vrai empire commence avec trois graines et un coq trop confiant.',
    ],
    plant: 'Graine posée. Maintenant on laisse la magie du poulailler bosser.',
    harvest: 'Récolte propre. Francis valide.',
    craft: 'Production lancée. Les usines du coq chauffent.',
    order: 'Commande expédiée. Le héliport adore ce rythme.',
    build: 'Nouveau bâtiment posé. Le village prend forme.',
    error: 'Impossible pour le moment. Il manque des pièces, du niveau ou des ressources.',
    level: 'Niveau supérieur ! Le poulailler débloque du lourd.',
  };

  const QUESTS = [
    { text: 'Plante 3 blés.', stat: 'plant_wheat', need: 3, reward: { coins: 60, xp: 25, gems: 1 } },
    { text: 'Récolte 3 cultures.', stat: 'harvest_any', need: 3, reward: { coins: 75, xp: 30, gems: 1 } },
    { text: 'Fabrique 1 pain.', stat: 'make_bread', need: 1, reward: { coins: 120, xp: 40, gems: 1 } },
    { text: 'Livre 2 commandes hélico.', stat: 'orders_done', need: 2, reward: { coins: 170, xp: 55, gems: 2 } },
    { text: 'Construis une maison.', stat: 'build_house', need: 1, reward: { coins: 220, xp: 70, gems: 2 } },
    { text: 'Produis 2 œufs.', stat: 'make_eggs', need: 2, reward: { coins: 260, xp: 90, gems: 3 } },
    { text: 'Fais grandir le poulailler niveau 5.', stat: 'level_5', need: 1, reward: { coins: 420, xp: 120, gems: 4 } },
  ];

  let state;
  let images = {};
  let selectedTile = null;
  let selectedTool = 'inspect';
  let pendingBuild = null;
  let camera = { x: 0, y: 0 };
  let pointer = { down: false, x: 0, y: 0, moved: false, sx: 0, sy: 0 };
  let lastSave = 0;
  let toastTimer = 0;
  let floating = [];

  function now() { return Date.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmtTime(ms) {
    ms = Math.max(0, ms);
    const s = Math.ceil(ms / 1000);
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
  }
  function xpNeed(level = state.level) { return 80 + level * level * 28; }
  function getTile(x, y) { return state.tiles.find(t => t.x === x && t.y === y); }
  function hasBuilding(id) { return state.tiles.some(t => t.type === 'building' && t.building === id); }
  function inv(id) { return state.inventory[id] || 0; }
  function addInv(id, qty) { state.inventory[id] = Math.max(0, (state.inventory[id] || 0) + qty); }
  function canAfford(cost) { return state.coins >= cost; }

  function defaultTiles() {
    const tiles = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let terrain = 'grass';
        if ((x === 0 && y > 4) || (y === H - 1 && x < 4)) terrain = 'water';
        if ((x + y) % 9 === 0 && x > 1 && y > 1) terrain = 'flower';
        tiles.push({ x, y, type: terrain === 'water' ? 'water' : 'grass', terrain });
      }
    }
    const put = (x, y, data) => Object.assign(getFrom(tiles, x, y), data);
    const getFrom = (arr, x, y) => arr.find(t => t.x === x && t.y === y);
    // Core town / farm, with an isometric city-builder feeling.
    put(5, 1, { type: 'building', terrain: 'grass', building: 'townhall' });
    put(6, 1, { type: 'building', terrain: 'grass', building: 'barn' });
    put(7, 1, { type: 'building', terrain: 'grass', building: 'helipad' });
    put(4, 2, { type: 'building', terrain: 'grass', building: 'bakery' });
    put(7, 3, { type: 'building', terrain: 'grass', building: 'house' });
    put(8, 3, { type: 'building', terrain: 'grass', building: 'house' });
    [[3,3],[4,3],[5,3],[3,4],[4,4],[5,4]].forEach(([x,y]) => put(x, y, { type: 'plot', terrain: 'field', crop: null }));
    // decorative paths
    [[5,2],[6,2],[7,2],[6,3],[6,4],[6,5],[7,4],[8,4]].forEach(([x,y]) => {
      const t = getFrom(tiles, x, y);
      if (t && t.type === 'grass') t.terrain = 'path';
    });
    return tiles;
  }

  function createState() {
    return {
      version: 2,
      startedAt: now(),
      lastSeen: now(),
      day: 1,
      coins: 340,
      gems: 10,
      xp: 0,
      level: 1,
      population: 4,
      selected: 'inspect',
      pendingBuild: null,
      inventory: { wheat: 0, corn: 0, carrot: 0, bread: 0, feed: 0, eggs: 0, milk: 0, jam: 0 },
      stats: {},
      questIndex: 0,
      tiles: defaultTiles(),
      factories: {
        bakery: [], feedMill: [], chickenCoop: [], dairy: []
      },
      orders: [],
      train: null,
      gifts: { last: '' },
      settings: { sound: false },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.tiles)) return createState();
      const fresh = createState();
      return Object.assign(fresh, parsed, {
        factories: Object.assign(fresh.factories, parsed.factories || {}),
        inventory: Object.assign(fresh.inventory, parsed.inventory || {}),
        stats: Object.assign({}, parsed.stats || {}),
        gifts: Object.assign(fresh.gifts, parsed.gifts || {}),
        settings: Object.assign(fresh.settings, parsed.settings || {}),
      });
    } catch (_) {
      return createState();
    }
  }

  function saveState(force = false) {
    if (!force && now() - lastSave < 2500) return;
    lastSave = now();
    state.lastSeen = now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    state = createState();
    ensureOrders();
    updateUI();
    toast('Nouvelle ferme Francis créée.', 'success');
    saveState(true);
  }

  function stat(id, qty = 1) {
    state.stats[id] = (state.stats[id] || 0) + qty;
    const q = QUESTS[state.questIndex];
    if (q && q.stat === id) updateQuest();
    if (id === 'level_5') updateQuest();
  }

  function reward(r, label = 'Récompense') {
    if (!r) return;
    if (r.coins) state.coins += r.coins;
    if (r.gems) state.gems += r.gems;
    if (r.xp) addXP(r.xp);
    const parts = [];
    if (r.coins) parts.push(`+${r.coins} 🪙`);
    if (r.gems) parts.push(`+${r.gems} 💎`);
    if (r.xp) parts.push(`+${r.xp} XP`);
    if (parts.length) toast(`${label} · ${parts.join(' · ')}`, 'success');
  }

  function addXP(qty) {
    state.xp += qty;
    let leveled = false;
    while (state.xp >= xpNeed()) {
      state.xp -= xpNeed();
      state.level += 1;
      state.coins += 50 + state.level * 10;
      state.gems += state.level % 2 === 0 ? 1 : 0;
      leveled = true;
      if (state.level >= 5) stat('level_5', 1);
    }
    if (leveled) {
      line(QUOTES.level, 'love');
      toast(`Niveau ${state.level} ! Nouveaux bâtiments et cultures débloqués.`, 'success');
      haptic('success');
    }
  }

  function updatePopulation() {
    state.population = state.tiles.reduce((acc, t) => acc + (t.type === 'building' ? (BUILDING[t.building]?.pop || 0) : 0), 0);
  }

  function ensureOrders() {
    while (state.orders.length < 4) state.orders.push(makeOrder());
    if (!state.train && state.level >= 3) state.train = makeTrain();
  }

  function availableItemsForOrders() {
    const base = ['wheat'];
    if (state.level >= 2) base.push('corn');
    if (state.level >= 3) base.push('carrot');
    if (hasBuilding('bakery')) base.push('bread');
    if (hasBuilding('feedMill')) base.push('feed');
    if (hasBuilding('chickenCoop')) base.push('eggs');
    if (hasBuilding('dairy')) base.push('milk');
    if (state.level >= 5) base.push('jam');
    return base;
  }

  function makeOrder() {
    const names = ['Mémé Cocotte', 'Le marché du coin', 'Chef Francis', 'La mairie', 'Le trainier', 'La brigade des poussins', 'La cantine Telegram'];
    const pool = availableItemsForOrders();
    const itemCount = state.level < 3 ? 1 : Math.random() < .55 ? 2 : 3;
    const req = {};
    for (let i = 0; i < itemCount; i++) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      const high = ['bread','feed','eggs','milk','jam'].includes(id) ? 2 : (state.level >= 4 ? 5 : 3);
      req[id] = (req[id] || 0) + 1 + Math.floor(Math.random() * high);
    }
    let value = Object.entries(req).reduce((sum, [id, q]) => sum + (ITEM[id].value || 5) * q, 0);
    return {
      id: 'o_' + Math.random().toString(36).slice(2),
      customer: names[Math.floor(Math.random() * names.length)],
      items: req,
      coins: Math.round(value * (1.7 + Math.random() * .65)) + state.level * 8,
      xp: Math.round(value * .65) + state.level * 5,
      mood: ['pilot', 'love', 'shock'][Math.floor(Math.random() * 3)],
    };
  }

  function makeTrain() {
    const pool = availableItemsForOrders().filter(id => id !== 'jam' || state.level >= 5);
    const crates = [];
    for (let i = 0; i < 3; i++) {
      const id = pool[(i + Math.floor(Math.random() * pool.length)) % pool.length];
      const qty = ['bread','feed','eggs','milk','jam'].includes(id) ? 1 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 4);
      crates.push({ id, qty, filled: false });
    }
    return { id: 't_' + Math.random().toString(36).slice(2), crates, coins: 260 + state.level * 50, xp: 95 + state.level * 24, gems: 2, delivered: false };
  }

  function orderReady(order) {
    return Object.entries(order.items).every(([id, qty]) => inv(id) >= qty);
  }

  function fulfillOrder(id) {
    const idx = state.orders.findIndex(o => o.id === id);
    if (idx < 0) return;
    const order = state.orders[idx];
    if (!orderReady(order)) return bad('Il manque des produits pour cette commande.');
    Object.entries(order.items).forEach(([item, qty]) => addInv(item, -qty));
    state.coins += order.coins;
    addXP(order.xp);
    state.orders.splice(idx, 1, makeOrder());
    stat('orders_done');
    line(QUOTES.order, 'pilot');
    haptic('success');
    floating.push({ text: `+${order.coins} 🪙 +${order.xp} XP`, x: canvas.width/2, y: 160, t: now() });
    renderOrders();
    updateUI();
    saveState(true);
  }

  function fillCrate(index) {
    if (!state.train || !state.train.crates[index]) return;
    const crate = state.train.crates[index];
    if (crate.filled) return;
    if (inv(crate.id) < crate.qty) return bad('Le train attend encore des marchandises.');
    addInv(crate.id, -crate.qty);
    crate.filled = true;
    if (state.train.crates.every(c => c.filled)) {
      state.coins += state.train.coins;
      state.gems += state.train.gems;
      addXP(state.train.xp);
      toast(`FrancExpress livré · +${state.train.coins} 🪙 +${state.train.gems} 💎`, 'success');
      state.train = makeTrain();
    }
    renderOrders(); updateUI(); saveState(true);
  }

  function canUseCrop(id) {
    const crop = ITEM[id];
    if (!crop || !crop.grow) return false;
    return state.level >= crop.level;
  }

  function plant(tile, cropId) {
    const crop = ITEM[cropId];
    if (!tile || tile.type !== 'plot') return bad('Il faut cliquer sur un champ cultivable.');
    if (tile.crop) return inspectTile(tile);
    if (!canUseCrop(cropId)) return bad(`${crop.name} se débloque au niveau ${crop.level}.`);
    if (state.coins < crop.cost) return bad('Pas assez de pièces pour acheter les graines.');
    state.coins -= crop.cost;
    tile.crop = { id: cropId, plantedAt: now(), readyAt: now() + crop.grow };
    stat('plant_' + cropId);
    line(QUOTES.plant, 'pilot');
    haptic('light');
    updateUI(); saveState();
  }

  function harvest(tile) {
    if (!tile || tile.type !== 'plot' || !tile.crop) return false;
    if (now() < tile.crop.readyAt) {
      const crop = ITEM[tile.crop.id];
      line(`${crop.name} pas encore prêt · ${fmtTime(tile.crop.readyAt - now())}`, 'shock');
      return true;
    }
    const crop = ITEM[tile.crop.id];
    const bonus = Math.random() < .18 ? 2 : 1;
    addInv(tile.crop.id, bonus);
    addXP(crop.xp);
    stat('harvest_any');
    stat('harvest_' + tile.crop.id);
    tile.crop = null;
    floating.push({ text: `+${bonus} ${crop.icon}`, x: lastPointerX, y: lastPointerY, t: now() });
    line(QUOTES.harvest, 'love');
    haptic('success');
    updateUI(); saveState();
    return true;
  }

  let lastPointerX = 0, lastPointerY = 0;

  function build(tile) {
    if (!pendingBuild) return openBuildPanel();
    const b = BUILDING[pendingBuild];
    if (!b) return;
    if (state.level < (b.minLevel || 1)) return bad(`${b.name} se débloque au niveau ${b.minLevel}.`);
    if (!tile || tile.type !== 'grass' || tile.terrain === 'water') return bad('Choisis une case d’herbe libre.');
    if (b.unique && hasBuilding(pendingBuild)) return bad('Ce bâtiment existe déjà dans le poulailler.');
    if (!canAfford(b.cost)) return bad('Pas assez de pièces pour construire.');
    state.coins -= b.cost;
    if (pendingBuild === 'plot') {
      tile.type = 'plot'; tile.terrain = 'field'; tile.crop = null;
    } else {
      tile.type = 'building'; tile.building = pendingBuild; tile.terrain = 'grass';
      stat('build_' + pendingBuild);
    }
    addXP(Math.max(10, Math.round(b.cost / 6)));
    updatePopulation();
    pendingBuild = null;
    selectedTool = 'inspect';
    setActiveTool('inspect');
    line(QUOTES.build, 'love');
    haptic('success');
    updateUI(); saveState(true);
  }

  function inspectTile(tile) {
    if (!tile) return;
    selectedTile = tile;
    if (tile.type === 'plot') {
      if (!tile.crop) {
        line('Champ vide. Sélectionne une graine en bas puis clique ici.', 'pilot');
      } else {
        const crop = ITEM[tile.crop.id];
        if (now() >= tile.crop.readyAt) line(`${crop.icon} ${crop.name} prêt. Clique pour récolter.`, 'love');
        else line(`${crop.icon} ${crop.name} en croissance · ${fmtTime(tile.crop.readyAt - now())}`, 'pilot');
      }
    } else if (tile.type === 'building') {
      const b = BUILDING[tile.building];
      if (tile.building === 'helipad') openOrdersPanel();
      else if (RECIPES[tile.building]) openFactoryPanel(tile.building);
      else if (tile.building === 'barn') openInventoryPanel();
      else line(`${b.icon} ${b.name}. Le poulailler prend de la valeur.`, 'pilot');
    } else if (tile.terrain === 'water') {
      line('Zone d’eau. Plus tard, on pourra y ajouter pêche et port.', 'shock');
    } else {
      line('Case libre. Ouvre Bâtir pour agrandir la ferme.', 'pilot');
    }
  }

  function handleTile(tile) {
    if (!tile) return;
    if (selectedTool === 'build' || pendingBuild) return build(tile);
    if (tile.type === 'plot' && tile.crop && now() >= tile.crop.readyAt) return harvest(tile);
    if (['wheat','corn','carrot'].includes(selectedTool)) return plant(tile, selectedTool);
    if (tile.type === 'building' && RECIPES[tile.building]) return collectFromFactory(tile.building) || inspectTile(tile);
    return inspectTile(tile);
  }

  function recipeUnlocked(r) { return state.level >= (r.minLevel || 1) && hasBuilding(r.factory); }

  function hasInputs(inputs) {
    return Object.entries(inputs).every(([id, qty]) => inv(id) >= qty);
  }

  function craft(recipeId) {
    const recipe = Object.values(RECIPES).flat().find(r => r.id === recipeId);
    if (!recipe) return;
    if (!recipeUnlocked(recipe)) return bad('Recette pas encore débloquée.');
    const queue = state.factories[recipe.factory] || (state.factories[recipe.factory] = []);
    if (queue.length >= MAX_FACTORY_QUEUE) return bad('File de production pleine. Récupère les produits prêts.');
    if (!hasInputs(recipe.inputs)) return bad('Il manque des ingrédients.');
    Object.entries(recipe.inputs).forEach(([id, qty]) => addInv(id, -qty));
    queue.push({ id: recipe.id, startedAt: now(), finishAt: now() + recipe.time, xp: recipe.xp });
    line(QUOTES.craft, 'pilot');
    haptic('light');
    renderFactories(); updateUI(); saveState(true);
  }

  function collectFromFactory(factory) {
    const queue = state.factories[factory] || [];
    const ready = queue.filter(q => now() >= q.finishAt);
    if (!ready.length) return false;
    state.factories[factory] = queue.filter(q => now() < q.finishAt);
    ready.forEach(q => {
      addInv(q.id, 1);
      addXP(q.xp || ITEM[q.id]?.xp || 5);
      stat('make_' + q.id);
      floating.push({ text: `+1 ${ITEM[q.id].icon}`, x: canvas.width * .55, y: 180, t: now() });
    });
    line(`Production récupérée : ${ready.map(q => ITEM[q.id].name).join(', ')}.`, 'love');
    haptic('success'); updateUI(); saveState(true);
    return true;
  }

  function collectAllReadyFactories() {
    let did = false;
    Object.keys(state.factories).forEach(factory => { did = collectFromFactory(factory) || did; });
    if (!did) line('Rien de prêt pour le moment.', 'shock');
    renderFactories();
  }

  function bad(text) {
    line(text || QUOTES.error, 'sad');
    toast(text || QUOTES.error, 'error');
    haptic('error');
  }

  function line(text, mood = 'pilot') {
    const img = $('francisMood');
    const map = {
      pilot: 'francis_pilot.png', love: 'francis_love.png', shock: 'francis_shock.png', sad: 'francis_sad.png'
    };
    img.src = 'assets/characters/' + (map[mood] || map.pilot);
    $('francisLine').textContent = text;
  }

  function toast(text, type = '') {
    const t = $('toast');
    t.textContent = text;
    t.className = 'show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 2400);
  }

  function updateQuest() {
    const q = QUESTS[state.questIndex];
    if (!q) {
      $('questText').textContent = 'Tous les objectifs actuels sont terminés. Continue à agrandir Francis Farm.';
      $('claimQuest').disabled = true;
      return;
    }
    const done = Math.min(q.need, state.stats[q.stat] || 0);
    $('questText').textContent = `${q.text} ${done}/${q.need}`;
    $('claimQuest').disabled = done < q.need;
  }

  function claimQuest() {
    const q = QUESTS[state.questIndex];
    if (!q || (state.stats[q.stat] || 0) < q.need) return;
    reward(q.reward, 'Objectif réussi');
    state.questIndex += 1;
    line('Objectif validé. Le coq avance.', 'love');
    updateQuest(); updateUI(); saveState(true);
  }

  function dailyGift() {
    const d = new Date().toISOString().slice(0,10);
    if (state.gifts.last === d) return;
    state.gifts.last = d;
    state.coins += 80;
    state.gems += 1;
    toast('Cadeau du jour · +80 🪙 +1 💎', 'success');
    line('Cadeau quotidien récupéré. Gratuité totale, mais Francis reste généreux.', 'love');
  }

  function updateUI() {
    updatePopulation();
    $('coins').textContent = Math.floor(state.coins);
    $('gems').textContent = Math.floor(state.gems);
    $('level').textContent = state.level;
    $('pop').textContent = state.population;
    $('dayLabel').textContent = `Jour ${Math.max(1, Math.floor((now() - state.startedAt) / 86400000) + 1)} · ${state.orders.length} commandes · ${availableItemsForOrders().length} produits`;
    $('xpFill').style.width = clamp((state.xp / xpNeed()) * 100, 0, 100) + '%';
    updateQuest();
    document.querySelectorAll('.tool[data-tool]').forEach(btn => {
      const tool = btn.dataset.tool;
      btn.classList.toggle('active', selectedTool === tool);
      if (ITEM[tool] && ITEM[tool].grow) {
        btn.disabled = state.level < ITEM[tool].level;
        btn.title = state.level < ITEM[tool].level ? `Débloqué niveau ${ITEM[tool].level}` : `${ITEM[tool].name} · ${ITEM[tool].cost} pièces`;
      }
    });
  }

  function openPanel(title, bodyHTML) {
    $('panelTitle').textContent = title;
    $('panelBody').innerHTML = bodyHTML;
    $('modalBackdrop').classList.remove('hidden');
    const dlg = $('panel');
    if (!dlg.open) dlg.show();
  }

  function closePanel() {
    $('modalBackdrop').classList.add('hidden');
    const dlg = $('panel');
    if (dlg.open) dlg.close();
  }

  function itemsHTML(items) {
    return Object.entries(items).map(([id, qty]) => `<span class="pill ${inv(id) >= qty ? 'ready' : 'danger'}">${ITEM[id]?.icon || '📦'} ${qty} ${ITEM[id]?.name || id} <small>(${inv(id)})</small></span>`).join('');
  }

  function openOrdersPanel() {
    renderOrders(true);
  }

  function renderOrders(open = false) {
    const orderCards = state.orders.map(o => {
      const ok = orderReady(o);
      return `<div class="card order ${ok ? 'done' : ''}">
        <h3>🚁 ${o.customer}</h3>
        <div class="mini">${itemsHTML(o.items)}</div>
        <p><b>Récompense :</b> ${o.coins} 🪙 · ${o.xp} XP</p>
        <button data-fulfill="${o.id}" ${ok ? '' : 'disabled'}>${ok ? 'Livrer maintenant' : 'Produits manquants'}</button>
      </div>`;
    }).join('');
    const train = state.level >= 3 ? `<div class="section">FrancExpress</div>${trainHTML()}` : `<div class="card"><h3>🚂 FrancExpress</h3><p>Débloqué au niveau 3. Gros bonus pour les grosses livraisons.</p></div>`;
    const html = `<p>Remplis les commandes comme dans un farm-builder : les cultures partent au héliport, les produits de factory partent au train.</p><div class="grid">${orderCards}</div>${train}`;
    if (open) openPanel('Commandes du poulailler', html);
    else if ($('panel').open && $('panelTitle').textContent.includes('Commandes')) $('panelBody').innerHTML = html;
  }

  function trainHTML() {
    if (!state.train) return '';
    const crates = state.train.crates.map((c, i) => `<div class="card ${c.filled ? 'done' : ''}">
      <h3>${c.filled ? '✅' : '📦'} Caisse ${i + 1}</h3>
      <div class="mini"><span class="pill ${inv(c.id) >= c.qty || c.filled ? 'ready' : 'danger'}">${ITEM[c.id].icon} ${c.qty} ${ITEM[c.id].name} <small>(${inv(c.id)})</small></span></div>
      <button data-crate="${i}" ${c.filled || inv(c.id) < c.qty ? 'disabled' : ''}>Remplir la caisse</button>
    </div>`).join('');
    return `<p>Bonus complet : ${state.train.coins} 🪙 · ${state.train.xp} XP · ${state.train.gems} 💎</p><div class="grid">${crates}</div>`;
  }

  function openFactoryPanel(focus) {
    renderFactories(true, focus);
  }

  function renderFactories(open = false, focus = '') {
    const sections = Object.entries(RECIPES).map(([factory, recipes]) => {
      const b = BUILDING[factory];
      const built = hasBuilding(factory);
      const queue = state.factories[factory] || [];
      const queueHTML = queue.length ? queue.map(q => `<span class="pill ${now() >= q.finishAt ? 'ready' : 'warn'}">${ITEM[q.id].icon} ${ITEM[q.id].name} · ${now() >= q.finishAt ? 'Prêt' : fmtTime(q.finishAt - now())}</span>`).join('') : '<span class="pill">File vide</span>';
      const cards = recipes.map(r => {
        const unlocked = recipeUnlocked(r);
        const ok = unlocked && hasInputs(r.inputs) && queue.length < MAX_FACTORY_QUEUE;
        return `<div class="card">
          <h3>${ITEM[r.id].icon} ${r.name}</h3>
          <div class="mini">${itemsHTML(r.inputs)}</div>
          <p>Temps : ${fmtTime(r.time)} · XP : ${r.xp}</p>
          <button data-craft="${r.id}" ${ok ? '' : 'disabled'}>${unlocked ? 'Produire' : `Débloqué niv. ${r.minLevel || 1}`}</button>
        </div>`;
      }).join('');
      return `<div class="section">${b.icon} ${b.name} ${built ? '' : '— à construire'}</div><div class="mini">${queueHTML}</div><div class="grid">${cards}</div>`;
    }).join('');
    const html = `<p>Transforme tes récoltes en produits plus chers. Les files continuent même si Telegram est fermé.</p><button id="collectReady">Récupérer tout ce qui est prêt</button>${sections}`;
    if (open) openPanel('Usines et productions', html);
    else if ($('panel').open && $('panelTitle').textContent.includes('Usines')) $('panelBody').innerHTML = html;
    setTimeout(() => { const btn = $('collectReady'); if (btn) btn.onclick = collectAllReadyFactories; }, 0);
  }

  function openInventoryPanel() {
    const goods = Object.keys(ITEM).filter(id => !ITEM[id].grow || ['wheat','corn','carrot'].includes(id));
    const cards = goods.map(id => `<div class="card"><h3>${ITEM[id].icon} ${ITEM[id].name}</h3><p>Stock : <b>${inv(id)}</b></p><p>Valeur : ${ITEM[id].value || 0} 🪙</p></div>`).join('');
    const html = `<p>Ta grange contient tous les produits gagnés en jouant. Aucun paiement réel.</p><div class="grid">${cards}</div><div class="section">Gestion</div><button id="dailyGift">Cadeau du jour gratuit</button><button id="resetGame" style="margin-top:8px;background:linear-gradient(180deg,#ff8395,#c71d3a)">Réinitialiser la ferme</button>`;
    openPanel('Grange et stock', html);
    setTimeout(() => {
      const d = $('dailyGift'); if (d) d.onclick = () => { dailyGift(); openInventoryPanel(); updateUI(); saveState(true); };
      const r = $('resetGame'); if (r) r.onclick = () => { if (confirm('Réinitialiser Francis Farm ?')) { closePanel(); resetGame(); } };
    }, 0);
  }

  function openBuildPanel() {
    const order = ['plot','house','feedMill','chickenCoop','dairy','shop','fountain'];
    const cards = order.map(id => {
      const b = BUILDING[id];
      const uniqueUsed = b.unique && hasBuilding(id);
      const locked = state.level < (b.minLevel || 1);
      const poor = state.coins < b.cost;
      const disabled = uniqueUsed || locked || poor;
      const why = uniqueUsed ? 'Déjà construit' : locked ? `Niveau ${b.minLevel}` : poor ? 'Pièces manquantes' : 'Placer';
      return `<div class="card">
        <h3>${b.icon} ${b.name}</h3>
        <p>Coût : ${b.cost} 🪙 ${b.pop ? `· Population +${b.pop} 🐔` : ''}</p>
        <p>${id === 'plot' ? 'Ajoute une case de culture.' : b.deco ? 'Décoration de prestige pour la ville.' : 'Développe la ville et le gameplay.'}</p>
        <button data-build="${id}" ${disabled ? 'disabled' : ''}>${why}</button>
      </div>`;
    }).join('');
    openPanel('Construire Francis Farm', `<p>Choisis un bâtiment, puis clique une case libre sur la carte.</p><div class="grid">${cards}</div>`);
  }

  function chooseBuild(id) {
    pendingBuild = id;
    selectedTool = 'build';
    setActiveTool('build');
    const b = BUILDING[id];
    closePanel();
    line(`${b.icon} ${b.name} sélectionné. Clique une case libre pour le placer.`, 'pilot');
    updateUI();
  }

  function setActiveTool(tool) {
    selectedTool = tool;
    if (tool !== 'build') pendingBuild = null;
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tool[data-tool="${tool}"]`);
    if (btn) btn.classList.add('active');
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function origin() {
    return {
      x: window.innerWidth / 2 + camera.x,
      y: (window.innerWidth < 760 ? 300 : 205) + camera.y
    };
  }

  function isoToScreen(x, y) {
    const o = origin();
    return { x: o.x + (x - y) * TILE_W / 2, y: o.y + (x + y) * TILE_H / 2 };
  }

  function screenToTile(px, py) {
    const o = origin();
    const dx = (px - o.x) / (TILE_W / 2);
    const dy = (py - o.y) / (TILE_H / 2);
    const x = Math.floor((dy + dx) / 2 + .5);
    const y = Math.floor((dy - dx) / 2 + .5);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    // Diamond precision check: test nearest tile corners.
    return getTile(x, y);
  }

  function drawDiamond(x, y, w, h, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y); ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  function drawBackground() {
    const w = window.innerWidth, h = window.innerHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b223a'); g.addColorStop(.45, '#1f5b72'); g.addColorStop(1, '#183a2a');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    // Sun and clouds
    ctx.save();
    ctx.globalAlpha = .75;
    const sun = ctx.createRadialGradient(w*.8, h*.18, 0, w*.8, h*.18, 160);
    sun.addColorStop(0, '#ffe49b'); sun.addColorStop(.35, '#ffbd55'); sun.addColorStop(1, 'rgba(255,189,85,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(w*.8, h*.18, 160, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = .35;
    for (let i=0;i<6;i++) drawCloud(80+i*270, 130+Math.sin(now()/3000+i)*12, 1+(i%3)*.2);
    ctx.restore();
    // Hills
    ctx.fillStyle = '#3b8b5a'; hill(0,h*.54,w,h*.22);
    ctx.fillStyle = '#2f744c'; hill(-100,h*.63,w+160,h*.18);
    ctx.fillStyle = '#245b3d'; hill(0,h*.72,w,h*.22);
  }

  function drawCloud(x,y,s=1){
    ctx.beginPath();
    ctx.arc(x,y,26*s,0,Math.PI*2); ctx.arc(x+28*s,y-10*s,34*s,0,Math.PI*2); ctx.arc(x+64*s,y,24*s,0,Math.PI*2); ctx.rect(x-4*s,y,80*s,24*s);
    ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fill();
  }
  function hill(x,y,w,h){
    ctx.beginPath(); ctx.moveTo(x,y+h);
    for(let i=0;i<=w;i+=60){ ctx.quadraticCurveTo(x+i+30,y-Math.sin(i*.02)*h*.4,x+i+60,y+h*.3); }
    ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
  }

  function drawTile(t) {
    const p = isoToScreen(t.x, t.y);
    let fill = '#5faf55';
    if (t.terrain === 'field') fill = '#8b6235';
    if (t.terrain === 'path') fill = '#c79b65';
    if (t.terrain === 'flower') fill = '#65b75a';
    if (t.terrain === 'water') fill = '#337ba8';
    drawDiamond(p.x, p.y, TILE_W, TILE_H, fill, 'rgba(255,255,255,.16)');
    if (t.terrain === 'path') {
      drawDiamond(p.x, p.y, TILE_W*.55, TILE_H*.44, '#d9b47b', 'rgba(90,60,30,.2)');
    }
    if (t.terrain === 'flower') {
      ctx.font = '16px system-ui'; ctx.fillText('🌼', p.x-8, p.y+4);
    }
    if (t.terrain === 'water') {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, TILE_W*.25, TILE_H*.11, 0, 0, Math.PI*2); ctx.stroke();
    }
    if (t.type === 'plot') drawPlot(t, p);
    if (t.type === 'building') drawBuilding(t, p);
    if (selectedTile === t || (pendingBuild && t.type === 'grass' && t.terrain !== 'water')) {
      ctx.save(); ctx.globalAlpha = selectedTile === t ? .95 : .38;
      drawDiamond(p.x, p.y, TILE_W+4, TILE_H+3, 'rgba(255,209,102,.18)', '#ffd166');
      ctx.restore();
    }
  }

  function drawPlot(t, p) {
    drawDiamond(p.x, p.y, TILE_W*.78, TILE_H*.72, '#7a4b25', '#4d2e16');
    ctx.save(); ctx.strokeStyle = 'rgba(255,215,137,.35)'; ctx.lineWidth = 2;
    for (let i=-2;i<=2;i++) {
      ctx.beginPath(); ctx.moveTo(p.x - 30 + i*13, p.y - 6); ctx.lineTo(p.x - 6 + i*13, p.y + 12); ctx.stroke();
    }
    ctx.restore();
    if (!t.crop) return;
    const crop = ITEM[t.crop.id];
    const progress = clamp((now() - t.crop.plantedAt) / (t.crop.readyAt - t.crop.plantedAt), 0, 1);
    const count = progress < .35 ? 2 : progress < .75 ? 4 : 6;
    for (let i=0;i<count;i++) {
      const ox = [-20,-8,7,20,-2,14][i] || 0;
      const oy = [-3,4,-6,5,10,-12][i] || 0;
      drawCrop(crop, p.x + ox, p.y + oy, progress);
    }
    if (progress >= 1) drawBadge(p.x, p.y - 42, '✓', '#52e07d');
    else drawTimer(p.x, p.y - 38, fmtTime(t.crop.readyAt - now()));
  }

  function drawCrop(crop, x, y, progress) {
    const h = 10 + progress * 24;
    ctx.strokeStyle = progress > .5 ? '#6adb67' : '#8dda69';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x,y+6); ctx.lineTo(x, y+6-h); ctx.stroke();
    ctx.fillStyle = crop.color;
    ctx.beginPath(); ctx.ellipse(x-4, y+2-h*.55, 5, 9, -.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+5, y-h*.45, 5, 9, .7, 0, Math.PI*2); ctx.fill();
    if (progress > .82) { ctx.font = '18px system-ui'; ctx.fillText(crop.icon, x-9, y-h-2); }
  }

  function drawBuilding(t, p) {
    const b = BUILDING[t.building] || BUILDING.house;
    if (t.building === 'fountain') return drawFountain(p);
    if (t.building === 'helipad') return drawHelipad(p);
    if (t.building === 'townhall') return drawTownhall(p);
    const w = TILE_W * .72, d = TILE_H * .62, h = t.building === 'house' ? 42 : 54;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y+15, w*.62, d*.6, 0, 0, Math.PI*2); ctx.fill();
    // base
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.moveTo(p.x - w/2, p.y); ctx.lineTo(p.x, p.y + d/2); ctx.lineTo(p.x + w/2, p.y); ctx.lineTo(p.x + w/2, p.y - h); ctx.lineTo(p.x, p.y - h + d/2); ctx.lineTo(p.x - w/2, p.y - h); ctx.closePath(); ctx.fill();
    // front shade
    ctx.fillStyle = shade(b.color, -.16);
    ctx.beginPath(); ctx.moveTo(p.x, p.y + d/2); ctx.lineTo(p.x + w/2, p.y); ctx.lineTo(p.x + w/2, p.y - h); ctx.lineTo(p.x, p.y - h + d/2); ctx.closePath(); ctx.fill();
    // roof
    ctx.fillStyle = b.roof || '#9b3a31';
    ctx.beginPath(); ctx.moveTo(p.x - w*.58, p.y - h + 4); ctx.lineTo(p.x, p.y - h - 28); ctx.lineTo(p.x + w*.58, p.y - h + 4); ctx.lineTo(p.x, p.y - h + d*.56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.stroke();
    ctx.font = '23px system-ui'; ctx.textAlign = 'center'; ctx.fillText(b.icon, p.x, p.y - h + 2);
    // production badge
    const queue = state.factories[t.building];
    if (queue && queue.length) {
      const ready = queue.some(q => now() >= q.finishAt);
      drawBadge(p.x + 35, p.y - h - 25, ready ? '✓' : queue.length, ready ? '#52e07d' : '#ffd166');
    }
  }

  function drawTownhall(p) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y+18, 62, 26, 0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e9c778'; ctx.fillRect(p.x-45, p.y-68, 90, 70);
    ctx.fillStyle = '#2e62c8'; ctx.beginPath(); ctx.moveTo(p.x-58,p.y-68);ctx.lineTo(p.x,p.y-112);ctx.lineTo(p.x+58,p.y-68);ctx.closePath();ctx.fill();
    ctx.fillStyle = '#fff5c4'; for(let i=-1;i<=1;i++) ctx.fillRect(p.x+i*27-6,p.y-50,12,38);
    ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillText('🐓',p.x,p.y-72);
  }

  function drawHelipad(p) {
    drawDiamond(p.x, p.y, TILE_W*.95, TILE_H*.82, '#697d8a', '#cfe1ee');
    ctx.strokeStyle='#f1f7ff';ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p.x-2,p.y-16);ctx.lineTo(p.x-2,p.y+16);ctx.moveTo(p.x-16,p.y);ctx.lineTo(p.x+16,p.y);ctx.stroke();
    ctx.font='24px system-ui';ctx.fillText('🚁',p.x+24,p.y-18);
  }

  function drawFountain(p) {
    drawDiamond(p.x, p.y, TILE_W*.72, TILE_H*.58, '#79b5da', '#d7f4ff');
    ctx.fillStyle='#e6f7ff';ctx.beginPath();ctx.ellipse(p.x,p.y-10,23,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#58b7ff';ctx.beginPath();ctx.ellipse(p.x,p.y-10,15,6,0,0,Math.PI*2);ctx.fill();
    ctx.font='18px system-ui';ctx.fillText('1F',p.x,p.y-24);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1),16);
    let r=(n>>16)+Math.round(255*amt), g=((n>>8)&255)+Math.round(255*amt), b=(n&255)+Math.round(255*amt);
    return `rgb(${clamp(r,0,255)},${clamp(g,0,255)},${clamp(b,0,255)})`;
  }

  function drawBadge(x, y, text, color) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x,y,17,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#092014'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,x,y+1);
    ctx.restore();
  }

  function drawTimer(x,y,text) {
    ctx.save(); ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const w = ctx.measureText(text).width + 14;
    roundRect(x-w/2,y-12,w,24,11); ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.fillText(text,x,y);
    ctx.restore();
  }

  function drawFloating() {
    const t = now();
    floating = floating.filter(f => t - f.t < 1200);
    floating.forEach(f => {
      const p = (t - f.t) / 1200;
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.font='bold 21px system-ui'; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=4;
      ctx.strokeText(f.text, f.x, f.y - p*60); ctx.fillText(f.text, f.x, f.y - p*60); ctx.restore();
    });
  }

  function drawRoosterOnMap() {
    const img = images.pilot;
    if (!img || !img.complete) return;
    const p = isoToScreen(5, 1);
    const bob = Math.sin(now()/450)*3;
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=16; ctx.drawImage(img, p.x-82, p.y-178+bob, 148, 148); ctx.restore();
  }

  function draw() {
    drawBackground();
    ctx.save();
    // platform shadow under entire board
    const center = isoToScreen((W-1)/2,(H-1)/2);
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(center.x, center.y + 170, 520, 210, 0, 0, Math.PI*2); ctx.fill();
    const sorted = [...state.tiles].sort((a,b) => (a.x+a.y) - (b.x+b.y) || a.x-b.x);
    sorted.forEach(drawTile);
    drawRoosterOnMap();
    ctx.restore();
    drawFloating();
  }

  function tick() {
    ensureOrders();
    if ($('panel').open) {
      const title = $('panelTitle').textContent;
      if (title.includes('Usines')) renderFactories(false);
      if (title.includes('Commandes')) renderOrders(false);
    }
    draw(); updateUI(); saveState(false);
    requestAnimationFrame(tick);
  }

  function loadImages() {
    images.pilot = new Image(); images.pilot.src = 'assets/characters/francis_pilot.png';
  }

  function onPointerDown(e) {
    const p = point(e); pointer = { down:true, x:p.x, y:p.y, sx:p.x, sy:p.y, moved:false };
  }
  function onPointerMove(e) {
    if (!pointer.down) return;
    const p = point(e);
    const dx = p.x - pointer.x, dy = p.y - pointer.y;
    if (Math.hypot(p.x - pointer.sx, p.y - pointer.sy) > 8) pointer.moved = true;
    if (pointer.moved) { camera.x += dx; camera.y += dy; camera.x = clamp(camera.x, -420, 420); camera.y = clamp(camera.y, -260, 260); }
    pointer.x = p.x; pointer.y = p.y;
  }
  function onPointerUp(e) {
    const p = point(e); lastPointerX = p.x; lastPointerY = p.y;
    if (!pointer.moved) {
      const tile = screenToTile(p.x, p.y);
      handleTile(tile);
    }
    pointer.down = false;
  }
  function point(e) {
    if (e.touches && e.touches[0]) return { x:e.touches[0].clientX, y:e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY };
    return { x:e.clientX, y:e.clientY };
  }

  function wireUI() {
    $('startGame').onclick = () => { $('boot').classList.add('hidden'); dailyGift(); updateUI(); };
    $('claimQuest').onclick = claimQuest;
    $('ordersBtn').onclick = openOrdersPanel;
    $('factoryBtn').onclick = () => openFactoryPanel();
    $('inventoryBtn').onclick = openInventoryPanel;
    $('closePanel').onclick = closePanel;
    $('modalBackdrop').onclick = closePanel;
    document.querySelectorAll('.tool[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (ITEM[tool] && ITEM[tool].grow && !canUseCrop(tool)) return bad(`${ITEM[tool].name} se débloque niveau ${ITEM[tool].level}.`);
        if (tool === 'build') { setActiveTool('build'); openBuildPanel(); }
        else { setActiveTool(tool); line(tool === 'inspect' ? 'Clique une case pour agir. Les champs mûrs se récoltent automatiquement.' : `${ITEM[tool].icon} ${ITEM[tool].name} sélectionné. Clique un champ vide.`, 'pilot'); }
        updateUI();
      });
    });
    $('panelBody').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fulfill) fulfillOrder(b.dataset.fulfill);
      if (b.dataset.craft) craft(b.dataset.craft);
      if (b.dataset.build) chooseBuild(b.dataset.build);
      if (b.dataset.crate) fillCrate(Number(b.dataset.crate));
    });
    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive:false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e); }, { passive:false });
    canvas.addEventListener('touchend', onPointerUp, { passive:false });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(true); });
  }

  function boot() {
    resize();
    state = loadState();
    selectedTool = state.selected || 'inspect';
    pendingBuild = state.pendingBuild || null;
    ensureOrders(); updatePopulation(); loadImages(); wireUI(); updateUI();
    setInterval(() => line(QUOTES.idle[Math.floor(Math.random()*QUOTES.idle.length)], ['pilot','love','shock'][Math.floor(Math.random()*3)]), 22000);
    requestAnimationFrame(tick);
  }

  boot();
})();
