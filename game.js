(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const live = document.getElementById('live');
  const TAU = Math.PI * 2;
  const DPR_MAX = 2;

  const assetSources = {
    cool: 'assets/francis/cool.webp',
    stunned: 'assets/francis/stunned.webp',
    love: 'assets/francis/love.webp',
    sad: 'assets/francis/sad.webp',
    pilot: 'assets/francis/pilot.webp'
  };

  const SHAPES = [
    { id: 'egg', name: 'Œuf', colors: ['#fff7d6', '#ffd66e'], accent: '#d98915' },
    { id: 'coin', name: 'Franc', colors: ['#fff0a8', '#f3ad22'], accent: '#9c6100' },
    { id: 'feather', name: 'Plume', colors: ['#4ed2df', '#087a91'], accent: '#003b49' },
    { id: 'rocket', name: 'Fusée', colors: ['#f9f9ff', '#d82c3a'], accent: '#275dff' },
    { id: 'star', name: 'Étoile', colors: ['#ffe26d', '#ff8c24'], accent: '#9a4a00' },
    { id: 'heart', name: 'Cœur', colors: ['#ff5a7a', '#ce0f38'], accent: '#7c061e' },
    { id: 'bolt', name: 'Éclair', colors: ['#fff06a', '#ffb300'], accent: '#966000' },
    { id: 'clover', name: 'Trèfle', colors: ['#55e58e', '#079e55'], accent: '#02582e' },
    { id: 'bell', name: 'Cloche', colors: ['#ffe070', '#e78d22'], accent: '#8e4c05' },
    { id: 'crown', name: 'Couronne', colors: ['#ffe991', '#d39a11'], accent: '#8a5600' },
    { id: 'shield', name: 'Blason', colors: ['#89b6ff', '#1d58d9'], accent: '#072c88' },
    { id: 'wrench', name: 'Clé', colors: ['#d9e3ee', '#77889c'], accent: '#303b47' }
  ];
  const shapeMap = Object.fromEntries(SHAPES.map(s => [s.id, s]));

  const state = {
    w: 1,
    h: 1,
    dpr: 1,
    screen: 'loading',
    mode: 'campaign',
    level: 1,
    score: 0,
    highScore: Number(localStorage.getItem('francis_perfection_high') || 0),
    totalPerfect: Number(localStorage.getItem('francis_perfection_perfect') || 0),
    duration: 60,
    timeLeft: 60,
    slots: [],
    pieces: [],
    particles: [],
    floaters: [],
    buttons: [],
    pointer: { x: 0, y: 0, down: false, id: null },
    dragging: null,
    selected: null,
    hoverSlot: null,
    combo: 0,
    comboTimer: 0,
    shake: 0,
    boardPulse: 0,
    levelStartAt: 0,
    message: 'Francis attend ton signal.',
    mood: 'pilot',
    muted: localStorage.getItem('francis_perfection_muted') === '1',
    lastTs: 0,
    reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    images: {},
    audio: null,
    layout: {}
  };

  const telegram = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (telegram) {
    try {
      telegram.ready();
      telegram.expand();
      telegram.setHeaderColor('#07101f');
      telegram.setBackgroundColor('#07101f');
    } catch (_) {}
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randRange(rng, min, max) { return min + (max - min) * rng(); }
  function dist(a, b, c, d) { const x = a - c; const y = b - d; return Math.hypot(x, y); }
  function modAngle(a) { return ((a % TAU) + TAU) % TAU; }
  function angleDiff(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
  function easeOutBack(t) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function formatTime(t) { return String(Math.ceil(Math.max(0, t))).padStart(2, '0'); }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function announce(text) {
    live.textContent = text;
  }

  function haptic(type = 'light') {
    try {
      if (telegram && telegram.HapticFeedback) {
        telegram.HapticFeedback.impactOccurred(type);
      }
    } catch (_) {}
  }

  function setupAudio() {
    if (state.audio) return state.audio;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    state.audio = new AudioCtx();
    return state.audio;
  }

  function tone(kind) {
    if (state.muted) return;
    const ac = setupAudio();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = kind === 'bad' ? 'sawtooth' : 'triangle';
    const table = {
      good: [528, 660, 792],
      bad: [196, 145],
      win: [523, 659, 784, 1046],
      click: [420],
      rotate: [330, 495],
      start: [392, 523, 784]
    };
    const notes = table[kind] || table.click;
    osc.frequency.setValueAtTime(notes[0], now);
    notes.forEach((n, i) => osc.frequency.linearRampToValueAtTime(n, now + i * 0.06));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.08 : 0.045, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + notes.length * 0.025);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  async function loadAssets() {
    const entries = Object.entries(assetSources);
    await Promise.all(entries.map(([key, src]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { state.images[key] = img; resolve(); };
      img.onerror = reject;
      img.src = src;
    })));
  }

  function resize() {
    const w = Math.max(320, Math.floor(canvas.clientWidth || window.innerWidth));
    const h = Math.max(520, Math.floor(canvas.clientHeight || window.innerHeight));
    const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    state.w = w;
    state.h = h;
    state.dpr = dpr;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeLayout();
    arrangeTray();
  }

  function computeLayout() {
    const w = state.w;
    const h = state.h;
    const safeTop = Math.max(10, Number(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)').replace('px','')) || 0);
    const headerH = clamp(h * 0.13, 86, 118);
    const trayH = clamp(h * 0.23, 162, 210);
    const boardR = clamp(Math.min(w * 0.43, (h - headerH - trayH) * 0.34), 112, 224);
    const boardY = headerH + boardR + clamp(h * 0.02, 8, 18);
    state.layout = {
      safeTop,
      headerH,
      trayH,
      boardX: w * 0.5,
      boardY,
      boardR,
      trayTop: h - trayH,
      bottom: h,
      hudY: safeTop + 8,
      buttonH: clamp(h * 0.055, 42, 54),
      radius: clamp(w * 0.055, 18, 28)
    };
  }

  function slotPositions(count, rng) {
    const list = [{ x: 0, y: 0 }];
    const rings = [
      { n: 6, r: 0.42, off: -Math.PI / 2 },
      { n: 10, r: 0.72, off: -Math.PI / 2 + 0.15 },
      { n: 14, r: 0.92, off: -Math.PI / 2 + 0.08 }
    ];
    rings.forEach(ring => {
      for (let i = 0; i < ring.n; i++) {
        const a = ring.off + TAU * i / ring.n;
        list.push({ x: Math.cos(a) * ring.r, y: Math.sin(a) * ring.r * 0.82 });
      }
    });
    return shuffle(list, rng).slice(0, count).sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function arrangeTray() {
    if (!state.pieces.length) return;
    const { trayTop, trayH } = state.layout;
    const w = state.w;
    const count = state.pieces.length;
    const columns = count <= 5 ? count : Math.ceil(count / 2);
    const rows = Math.ceil(count / columns);
    const gap = clamp(w * 0.025, 8, 14);
    const cellW = (w - gap * 2) / columns;
    const cellH = (trayH - 42) / rows;
    const size = clamp(Math.min(cellW, cellH) * 0.62, 42, 72);
    state.pieces.forEach((p, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const homeX = gap + cellW * (col + 0.5);
      const homeY = trayTop + 42 + cellH * (row + 0.5);
      p.size = size;
      p.homeX = homeX;
      p.homeY = homeY;
      if (!p.placed && p !== state.dragging) {
        p.x = p.x || homeX;
        p.y = p.y || homeY;
        p.targetX = homeX;
        p.targetY = homeY;
      }
    });
  }

  function startGame(mode = 'campaign') {
    tone('start');
    haptic('medium');
    state.mode = mode;
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.particles = [];
    state.floaters = [];
    startLevel(1);
  }

  function startLevel(level) {
    state.level = level;
    state.screen = 'playing';
    state.mood = level < 3 ? 'cool' : 'pilot';
    state.message = level === 1 ? 'Glisse chaque pièce dans son empreinte.' : 'Plus vite, le poulailler accélère !';
    const dateSeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    const rng = mulberry32(0xF00D + level * 997 + (state.mode === 'daily' ? dateSeed : 0));
    const slotCount = clamp(3 + Math.floor(level * 0.8), 3, 12);
    const decoyCount = level < 4 ? 0 : clamp(Math.floor(level / 4), 1, 3);
    const duration = clamp(62 - level * 2.15 + slotCount * 1.1, 26, 72);
    state.duration = duration;
    state.timeLeft = duration;
    state.levelStartAt = performance.now();
    state.slots = [];
    state.pieces = [];
    const shapePool = shuffle([...SHAPES], rng);
    const chosen = [];
    for (let i = 0; i < slotCount; i++) chosen.push(shapePool[i % shapePool.length].id);
    shuffle(chosen, rng);
    const positions = slotPositions(slotCount, rng);
    const { boardX, boardY, boardR } = state.layout;
    const baseSize = clamp(boardR * (slotCount > 8 ? 0.21 : 0.24), 42, 72);
    chosen.forEach((type, i) => {
      const pos = positions[i];
      const rot = level < 3 ? 0 : Math.floor(rng() * 8) * Math.PI / 4;
      state.slots.push({
        id: `slot-${i}`,
        type,
        x: boardX + pos.x * boardR,
        y: boardY + pos.y * boardR,
        nx: pos.x,
        ny: pos.y,
        size: baseSize,
        rot,
        filled: false,
        pulse: rng() * TAU
      });
      state.pieces.push({
        id: `piece-${i}`,
        type,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        homeX: 0,
        homeY: 0,
        size: baseSize,
        rot: level < 3 ? rot : Math.floor(rng() * 8) * Math.PI / 4,
        placed: false,
        slotId: null,
        scale: 1,
        pop: rng()
      });
    });
    for (let i = 0; i < decoyCount; i++) {
      const available = SHAPES.filter(s => !chosen.includes(s.id));
      const type = (available.length ? available[Math.floor(rng() * available.length)] : SHAPES[Math.floor(rng() * SHAPES.length)]).id;
      state.pieces.push({
        id: `decoy-${i}`,
        type,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        homeX: 0,
        homeY: 0,
        size: baseSize,
        rot: Math.floor(rng() * 8) * Math.PI / 4,
        placed: false,
        slotId: null,
        decoy: true,
        scale: 1,
        pop: rng()
      });
    }
    shuffle(state.pieces, rng);
    arrangeTray();
    state.pieces.forEach((p, i) => {
      p.x = p.homeX + randRange(rng, -10, 10);
      p.y = p.homeY + randRange(rng, -6, 6);
      p.targetX = p.homeX;
      p.targetY = p.homeY;
    });
    announce(`Niveau ${level}. ${slotCount} pièces à placer.`);
  }

  function rebuildSlotPixels() {
    const { boardX, boardY, boardR } = state.layout;
    state.slots.forEach(s => {
      s.x = boardX + s.nx * boardR;
      s.y = boardY + s.ny * boardR;
      s.size = clamp(boardR * (state.slots.length > 8 ? 0.21 : 0.24), 42, 72);
    });
    state.pieces.forEach(p => {
      if (p.placed && p.slotId) {
        const slot = state.slots.find(s => s.id === p.slotId);
        if (slot) {
          p.x = slot.x;
          p.y = slot.y;
          p.size = slot.size;
          p.targetX = slot.x;
          p.targetY = slot.y;
        }
      }
    });
  }

  function pauseToggle() {
    if (state.screen === 'playing') {
      state.screen = 'paused';
      state.message = 'Pause. Francis garde le poulailler.';
    } else if (state.screen === 'paused') {
      state.screen = 'playing';
      state.message = 'Reprise. On aligne tout !';
    }
    tone('click');
  }

  function toggleMute() {
    state.muted = !state.muted;
    localStorage.setItem('francis_perfection_muted', state.muted ? '1' : '0');
    if (!state.muted) tone('click');
  }

  function rotateSelected() {
    const p = state.selected || state.dragging;
    if (!p || p.placed) return;
    p.rot = modAngle(p.rot + Math.PI / 4);
    p.scale = 1.12;
    state.message = 'Rotation ! Vise l’empreinte parfaite.';
    tone('rotate');
    haptic('light');
  }

  function findPieceAt(x, y) {
    const pieces = [...state.pieces].reverse();
    return pieces.find(p => !p.placed && dist(x, y, p.x, p.y) <= p.size * 0.72);
  }

  function nearestSlot(piece) {
    let best = null;
    let bestD = Infinity;
    for (const s of state.slots) {
      if (s.filled) continue;
      const d = dist(piece.x, piece.y, s.x, s.y);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best && bestD < best.size * 0.82 ? best : null;
  }

  function releasePiece(piece) {
    const slot = nearestSlot(piece);
    if (!slot) {
      piece.targetX = piece.homeX;
      piece.targetY = piece.homeY;
      state.message = 'Pas assez précis. Ramène la pièce au bon endroit.';
      return;
    }
    const typeOk = slot.type === piece.type;
    const rotationOk = state.level < 3 || angleDiff(piece.rot, slot.rot) < 0.48;
    if (typeOk && rotationOk) {
      piece.placed = true;
      piece.slotId = slot.id;
      piece.x = slot.x;
      piece.y = slot.y;
      piece.targetX = slot.x;
      piece.targetY = slot.y;
      piece.rot = slot.rot;
      piece.scale = 1;
      slot.filled = true;
      state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
      state.comboTimer = 2.65;
      const timeFactor = Math.max(1, Math.ceil(state.timeLeft));
      const pts = 80 + state.combo * 25 + Math.floor(timeFactor / 2);
      state.score += pts;
      state.mood = state.combo >= 4 ? 'love' : 'cool';
      state.message = state.combo >= 4 ? 'Combo de coq ! Continue !' : `${shapeMap[piece.type].name} verrouillé.`;
      addFloater(`+${pts}`, slot.x, slot.y - slot.size * 0.7, '#fff2a6');
      burst(slot.x, slot.y, slot.size, shapeMap[piece.type].colors[1]);
      tone('good');
      haptic('light');
      if (state.slots.every(s => s.filled)) completeLevel();
    } else {
      piece.targetX = piece.homeX;
      piece.targetY = piece.homeY;
      state.combo = 0;
      state.comboTimer = 0;
      state.shake = 0.42;
      state.mood = typeOk ? 'stunned' : 'sad';
      if (typeOk) {
        state.message = 'Bonne pièce, mauvaise rotation. Tourne-la !';
        addFloater('ROTATION', slot.x, slot.y, '#7fe7ff');
      } else {
        state.timeLeft = Math.max(0, state.timeLeft - 2.2);
        state.message = 'Aïe ! Mauvaise empreinte. -2s';
        addFloater('-2s', slot.x, slot.y, '#ff8a8a');
      }
      tone('bad');
      haptic('heavy');
    }
  }

  function completeLevel() {
    const bonus = Math.ceil(state.timeLeft * 15) + state.combo * 50;
    state.score += bonus;
    state.totalPerfect += 1;
    localStorage.setItem('francis_perfection_perfect', String(state.totalPerfect));
    state.screen = 'levelComplete';
    state.mood = 'love';
    state.message = `Parfait ! Bonus temps +${bonus}.`;
    state.boardPulse = 1.2;
    burst(state.layout.boardX, state.layout.boardY, state.layout.boardR * 0.85, '#ffd166', 80);
    tone('win');
    haptic('medium');
    saveHighScore();
    announce(`Niveau ${state.level} terminé. Score ${state.score}.`);
  }

  function gameOver() {
    state.screen = 'gameOver';
    state.mood = 'sad';
    state.message = 'Le poulailler a explosé. Francis veut sa revanche.';
    state.shake = 1.2;
    state.pieces.forEach((p, i) => {
      if (p.placed) {
        p.placed = false;
        p.slotId = null;
        p.targetX = p.homeX + Math.sin(i) * 26;
        p.targetY = p.homeY - 30 - (i % 3) * 20;
      }
    });
    tone('bad');
    haptic('heavy');
    saveHighScore();
    announce(`Partie terminée. Score ${state.score}.`);
  }

  function saveHighScore() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('francis_perfection_high', String(state.highScore));
    }
  }

  function addFloater(text, x, y, color = '#fff') {
    state.floaters.push({ text, x, y, color, life: 1, vy: -42, size: 20 });
  }

  function burst(x, y, radius, color, amount = 28) {
    if (state.reducedMotion) return;
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * TAU;
      const speed = randRange(Math.random, 45, 210);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: randRange(Math.random, 2, 5),
        life: randRange(Math.random, 0.35, 0.9),
        maxLife: 0.9,
        color
      });
    }
  }

  function update(dt) {
    rebuildSlotPixels();
    state.buttons = [];
    if (state.screen === 'playing') {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        gameOver();
      }
      if (state.timeLeft < 9 && Math.floor(state.timeLeft * 4) % 2 === 0) {
        state.mood = 'stunned';
      }
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) state.combo = 0;
    }
    state.shake = Math.max(0, state.shake - dt * 2.1);
    state.boardPulse = Math.max(0, state.boardPulse - dt);
    state.pieces.forEach(p => {
      if (p !== state.dragging && !p.placed) {
        p.x = lerp(p.x, p.targetX, clamp(dt * 10, 0, 1));
        p.y = lerp(p.y, p.targetY, clamp(dt * 10, 0, 1));
      }
      p.scale = lerp(p.scale || 1, 1, clamp(dt * 8, 0, 1));
    });
    state.particles = state.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      return p.life > 0;
    });
    state.floaters = state.floaters.filter(f => {
      f.life -= dt * 0.9;
      f.y += f.vy * dt;
      return f.life > 0;
    });
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, state.w, state.h);
    drawBackground();
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake * 12 : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake * 10 : 0;
    ctx.translate(shakeX, shakeY);
    drawHud();
    drawBoard();
    drawTray();
    drawPieces();
    drawParticles();
    ctx.translate(-shakeX, -shakeY);
    drawFrancis();
    drawOverlay();
    ctx.restore();
  }

  function drawBackground() {
    const { w, h } = state;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0c2d62');
    g.addColorStop(0.45, '#071322');
    g.addColorStop(1, '#02050c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 34; i++) {
      const x = (i * 73 + 39) % w;
      const y = (i * 47 + 11) % (h * 0.55);
      ctx.fillStyle = i % 3 === 0 ? '#ffd166' : '#8ecaff';
      ctx.beginPath();
      ctx.arc(x, y, (i % 4) + 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const hill = ctx.createLinearGradient(0, h * 0.56, 0, h);
    hill.addColorStop(0, '#133016');
    hill.addColorStop(1, '#061108');
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.bezierCurveTo(w * 0.22, h * 0.63, w * 0.38, h * 0.78, w * 0.58, h * 0.68);
    ctx.bezierCurveTo(w * 0.78, h * 0.58, w * 0.93, h * 0.73, w, h * 0.66);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#7fe79b';
    ctx.lineWidth = 1;
    for (let x = -20; x < w + 20; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + 8, h * 0.86, x + 32, h * 0.73);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawHud() {
    const { w } = state;
    const { hudY } = state.layout;
    const margin = 14;
    const pillH = 34;
    drawGlassPill(margin, hudY, w - margin * 2, pillH, 18);
    ctx.fillStyle = '#fff7dd';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`Niv. ${state.level}`, margin + 14, hudY + pillH / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`${formatTime(state.timeLeft)}s`, w / 2, hudY + pillH / 2);
    ctx.textAlign = 'right';
    ctx.fillText(`${state.score}`, w - margin - 14, hudY + pillH / 2);

    const barX = margin + 90;
    const barW = Math.max(70, w - margin * 2 - 180);
    const barY = hudY + pillH + 8;
    const pct = clamp(state.timeLeft / state.duration, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.75;
    roundedRect(barX, barY, barW, 8, 5);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fill();
    roundedRect(barX, barY, barW * pct, 8, 5);
    const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    g.addColorStop(0, pct < 0.25 ? '#ff4d4d' : '#32e6a1');
    g.addColorStop(1, '#ffd166');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    if (state.combo > 1 && state.screen === 'playing') {
      ctx.save();
      ctx.globalAlpha = clamp(state.comboTimer / 2.65, 0, 1);
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${state.combo}`, w / 2, barY + 28);
      ctx.restore();
    }
  }

  function drawGlassPill(x, y, w, h, r) {
    ctx.save();
    roundedRect(x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,.06)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawBoard() {
    const { boardX, boardY, boardR } = state.layout;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 18;
    ctx.beginPath();
    ctx.ellipse(boardX, boardY, boardR * 1.04, boardR * 0.9, 0, 0, TAU);
    const g = ctx.createRadialGradient(boardX - boardR * .28, boardY - boardR * .34, boardR * .1, boardX, boardY, boardR * 1.1);
    g.addColorStop(0, '#ffe299');
    g.addColorStop(0.42, '#c77823');
    g.addColorStop(1, '#6a3316');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffcc65';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#fff6be';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(boardX, boardY, boardR * (0.22 + i * 0.09), boardR * (0.17 + i * 0.075), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    if (state.boardPulse > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(state.boardPulse, 0, 1) * .55;
      ctx.lineWidth = 8 * state.boardPulse;
      ctx.strokeStyle = '#fff1a4';
      ctx.beginPath();
      ctx.ellipse(boardX, boardY, boardR * (1.08 + (1.2 - state.boardPulse) * .16), boardR * (0.94 + (1.2 - state.boardPulse) * .12), 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    state.slots.forEach(s => drawSlot(s));
    ctx.restore();
  }

  function drawSlot(slot) {
    ctx.save();
    const pulse = 0.5 + Math.sin(performance.now() * 0.004 + slot.pulse) * 0.5;
    ctx.globalAlpha = slot.filled ? 0.35 : 1;
    ctx.shadowColor = slot.filled ? 'rgba(255,209,102,.15)' : `rgba(255,209,102,${0.2 + pulse * 0.18})`;
    ctx.shadowBlur = slot.filled ? 0 : 16;
    drawShape(slot.type, slot.x, slot.y, slot.size, slot.rot, { hole: true, filled: slot.filled });
    ctx.restore();
  }

  function drawTray() {
    const { w, h } = state;
    const { trayTop, trayH } = state.layout;
    ctx.save();
    const g = ctx.createLinearGradient(0, trayTop, 0, h);
    g.addColorStop(0, 'rgba(10, 23, 39, .18)');
    g.addColorStop(.18, 'rgba(5, 14, 28, .88)');
    g.addColorStop(1, 'rgba(2, 5, 12, .98)');
    ctx.fillStyle = g;
    ctx.fillRect(0, trayTop - 22, w, trayH + 22);
    ctx.strokeStyle = 'rgba(255,209,102,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, trayTop + 6);
    ctx.lineTo(w - 18, trayTop + 6);
    ctx.stroke();
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,247,221,.78)';
    ctx.fillText('PIÈCES DU POULAILLER', 18, trayTop + 27);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(127,231,255,.72)';
    ctx.fillText(state.level >= 3 ? 'Tap ROTATE / touche R' : 'Drag & drop', w - 18, trayTop + 27);
    ctx.restore();
  }

  function drawPieces() {
    const placed = state.pieces.filter(p => p.placed);
    const loose = state.pieces.filter(p => !p.placed && p !== state.dragging);
    [...placed, ...loose].forEach(p => drawPiece(p));
    if (state.dragging) drawPiece(state.dragging, true);
  }

  function drawPiece(piece, dragging = false) {
    ctx.save();
    const bob = piece.placed ? 0 : Math.sin(performance.now() * 0.003 + piece.pop * 8) * 1.8;
    ctx.translate(piece.x, piece.y + bob);
    ctx.scale(piece.scale || 1, piece.scale || 1);
    if (state.selected === piece && !piece.placed) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#7fe7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, piece.size * 0.76, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.translate(-piece.x, -piece.y - bob);
    ctx.globalAlpha = piece.decoy && state.screen === 'playing' ? 0.92 : 1;
    ctx.shadowColor = dragging ? 'rgba(255,209,102,.6)' : 'rgba(0,0,0,.5)';
    ctx.shadowBlur = dragging ? 24 : 14;
    ctx.shadowOffsetY = dragging ? 14 : 8;
    drawShape(piece.type, piece.x, piece.y + bob, piece.size, piece.rot, { piece: true, decoy: piece.decoy });
    ctx.restore();
  }

  function drawShape(type, x, y, size, rot, opts = {}) {
    const def = shapeMap[type] || SHAPES[0];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const s = size / 64;
    ctx.scale(s, s);

    if (opts.hole) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = opts.filled ? 'rgba(20,12,6,.42)' : 'rgba(12,7,5,.76)';
      ctx.strokeStyle = opts.filled ? 'rgba(255,232,174,.28)' : 'rgba(255,232,174,.72)';
      ctx.lineWidth = opts.filled ? 1.4 / s : 2.6 / s;
      shapePath(type);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }

    const grad = ctx.createLinearGradient(-24, -32, 28, 34);
    grad.addColorStop(0, def.colors[0]);
    grad.addColorStop(0.55, def.colors[1]);
    grad.addColorStop(1, def.accent);
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(30,18,8,.42)';
    ctx.lineWidth = 2.5;
    shapePath(type);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = '#ffffff';
    ctx.translate(-11, -16);
    ctx.rotate(-0.25);
    ctx.scale(1, 0.45);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (type === 'coin') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(80,45,0,.82)';
      ctx.font = '900 21px Georgia, serif';
      ctx.fillText('1F', 0, 2);
      ctx.restore();
    }
    if (type === 'rocket') {
      ctx.save();
      ctx.fillStyle = '#275dff';
      ctx.beginPath();
      ctx.arc(0, -5, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffb000';
      ctx.beginPath();
      ctx.moveTo(-9, 28); ctx.lineTo(0, 45); ctx.lineTo(9, 28); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (opts.decoy) {
      ctx.save();
      ctx.globalAlpha = .42;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 32, -0.8, 0.2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function shapePath(type) {
    ctx.beginPath();
    switch (type) {
      case 'egg':
        ctx.moveTo(0, -32);
        ctx.bezierCurveTo(24, -29, 31, -3, 26, 15);
        ctx.bezierCurveTo(20, 39, -20, 39, -26, 15);
        ctx.bezierCurveTo(-31, -4, -22, -29, 0, -32);
        break;
      case 'coin':
        ctx.arc(0, 0, 31, 0, TAU);
        break;
      case 'feather':
        ctx.moveTo(-27, 24);
        ctx.bezierCurveTo(-13, -19, 11, -35, 30, -26);
        ctx.bezierCurveTo(19, -3, 5, 19, -27, 24);
        ctx.moveTo(-22, 20);
        ctx.bezierCurveTo(-2, 8, 12, -5, 27, -24);
        break;
      case 'rocket':
        ctx.moveTo(0, -38);
        ctx.bezierCurveTo(24, -18, 20, 15, 10, 30);
        ctx.lineTo(-10, 30);
        ctx.bezierCurveTo(-20, 15, -24, -18, 0, -38);
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5;
          const r = i % 2 ? 13 : 33;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'heart':
        ctx.moveTo(0, 28);
        ctx.bezierCurveTo(-32, 5, -35, -18, -18, -25);
        ctx.bezierCurveTo(-8, -30, -1, -22, 0, -14);
        ctx.bezierCurveTo(1, -22, 8, -30, 18, -25);
        ctx.bezierCurveTo(35, -18, 32, 5, 0, 28);
        break;
      case 'bolt':
        ctx.moveTo(8, -36);
        ctx.lineTo(-18, 2);
        ctx.lineTo(1, 2);
        ctx.lineTo(-9, 36);
        ctx.lineTo(22, -8);
        ctx.lineTo(3, -8);
        ctx.closePath();
        break;
      case 'clover':
        ctx.arc(-13, -8, 16, 0, TAU);
        ctx.moveTo(29, -8); ctx.arc(13, -8, 16, 0, TAU);
        ctx.moveTo(16, 12); ctx.arc(0, 12, 16, 0, TAU);
        ctx.rect(-4, 14, 8, 22);
        break;
      case 'bell':
        ctx.moveTo(-25, 22);
        ctx.quadraticCurveTo(-18, 13, -18, -9);
        ctx.bezierCurveTo(-18, -31, 18, -31, 18, -9);
        ctx.quadraticCurveTo(18, 13, 25, 22);
        ctx.closePath();
        ctx.moveTo(-9, 25);
        ctx.quadraticCurveTo(0, 37, 9, 25);
        break;
      case 'crown':
        ctx.moveTo(-32, 24);
        ctx.lineTo(-27, -16);
        ctx.lineTo(-9, 5);
        ctx.lineTo(0, -27);
        ctx.lineTo(9, 5);
        ctx.lineTo(27, -16);
        ctx.lineTo(32, 24);
        ctx.closePath();
        break;
      case 'shield':
        ctx.moveTo(0, -34);
        ctx.lineTo(27, -22);
        ctx.lineTo(22, 13);
        ctx.quadraticCurveTo(12, 29, 0, 37);
        ctx.quadraticCurveTo(-12, 29, -22, 13);
        ctx.lineTo(-27, -22);
        ctx.closePath();
        break;
      case 'wrench':
        ctx.moveTo(-28, 20);
        ctx.lineTo(5, -13);
        ctx.bezierCurveTo(0, -28, 17, -42, 31, -31);
        ctx.lineTo(18, -25);
        ctx.lineTo(25, -16);
        ctx.lineTo(38, -22);
        ctx.bezierCurveTo(40, -5, 24, 7, 10, 1);
        ctx.lineTo(-21, 32);
        ctx.quadraticCurveTo(-32, 35, -35, 25);
        ctx.quadraticCurveTo(-34, 18, -28, 20);
        break;
      default:
        ctx.arc(0, 0, 30, 0, TAU);
    }
  }

  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    for (const f of state.floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.font = `900 ${f.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.fillStyle = f.color;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawFrancis() {
    const img = state.images[state.mood] || state.images.pilot;
    if (!img) return;
    const { w, h } = state;
    const top = state.layout.hudY + 48;
    const isMenu = state.screen === 'menu' || state.screen === 'loading';
    const maxW = isMenu ? Math.min(w * 0.78, 310) : Math.min(w * 0.33, 150);
    const maxH = isMenu ? Math.min(h * 0.42, 360) : Math.min(h * 0.22, 172);
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const x = isMenu ? w * 0.5 - iw / 2 : w - iw + 16;
    const y = isMenu ? h * 0.17 : top;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();

    if (!isMenu && state.screen !== 'paused') {
      const bubbleW = Math.min(w * 0.62, 290);
      const bubbleH = 54;
      const bx = 12;
      const by = state.layout.hudY + 52;
      drawSpeech(bx, by, bubbleW, bubbleH, state.message);
    }
  }

  function drawSpeech(x, y, w, h, text) {
    ctx.save();
    roundedRect(x, y, w, h, 18);
    ctx.fillStyle = 'rgba(255,247,221,.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1a1b22';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    wrapText(text, x + 14, y + h / 2 - 7, w - 28, 16, 2, 'left');
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight, maxLines = 3, align = 'left') {
    const oldAlign = ctx.textAlign;
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let lines = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line); line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines = lines.slice(0, maxLines);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
    ctx.textAlign = oldAlign;
  }

  function button(x, y, w, h, label, action, options = {}) {
    state.buttons.push({ x, y, w, h, label, action, disabled: options.disabled });
    ctx.save();
    const pressed = false;
    const alpha = options.disabled ? 0.42 : 1;
    ctx.globalAlpha = alpha;
    roundedRect(x, y, w, h, h / 2);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (options.variant === 'ghost') {
      g.addColorStop(0, 'rgba(255,255,255,.14)');
      g.addColorStop(1, 'rgba(255,255,255,.06)');
    } else if (options.variant === 'red') {
      g.addColorStop(0, '#ff6b6b');
      g.addColorStop(1, '#be123c');
    } else {
      g.addColorStop(0, '#fff1a6');
      g.addColorStop(.45, '#ffd166');
      g.addColorStop(1, '#d8831f');
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = options.variant === 'ghost' ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = options.variant === 'ghost' ? '#fff7dd' : '#1b1307';
    ctx.font = `900 ${options.small ? 13 : 15}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + (pressed ? 1 : 0));
    ctx.restore();
  }

  function drawOverlay() {
    const { w, h } = state;
    const { buttonH } = state.layout;
    if (state.screen === 'menu') {
      ctx.save();
      const titleY = h * 0.08;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff7dd';
      ctx.font = `1000 ${clamp(w * 0.085, 31, 46)}px system-ui, sans-serif`;
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText('FRANCIS', w / 2, titleY);
      ctx.fillText('FRANCIS', w / 2, titleY);
      ctx.fillStyle = '#ffd166';
      ctx.font = `1000 ${clamp(w * 0.075, 27, 40)}px system-ui, sans-serif`;
      ctx.strokeText('PERFECTION', w / 2, titleY + 42);
      ctx.fillText('PERFECTION', w / 2, titleY + 42);
      const panelY = h * 0.58;
      drawPanel(w * 0.08, panelY, w * 0.84, h * 0.25);
      ctx.fillStyle = '#fff7dd';
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      wrapText('Place les pièces dans les empreintes avant que le poulailler ne saute. 100% gratuit, sans wallet, sans pub.', w / 2, panelY + 22, w * 0.72, 22, 4, 'center');
      const y = h - buttonH * 2.45;
      button(w * 0.09, y, w * 0.82, buttonH, 'JOUER GRATUITEMENT', 'start');
      button(w * 0.09, y + buttonH + 10, w * 0.39, buttonH, state.muted ? 'SON OFF' : 'SON ON', 'mute', { variant: 'ghost', small: true });
      button(w * 0.52, y + buttonH + 10, w * 0.39, buttonH, 'DÉFI DU JOUR', 'daily', { variant: 'ghost', small: true });
      drawFooter();
      ctx.restore();
      return;
    }

    if (state.screen === 'paused') {
      dim();
      drawCenteredCard('PAUSE', 'Francis garde la basse-cour. Reprends quand tu veux.', [
        ['REPRENDRE', 'pause'],
        ['RECOMMENCER', 'start']
      ]);
    }

    if (state.screen === 'levelComplete') {
      dim();
      drawCenteredCard('PARFAIT 🐓', `Niveau ${state.level} terminé. Score ${state.score}.`, [
        ['NIVEAU SUIVANT', 'next'],
        ['MENU', 'menu']
      ]);
    }

    if (state.screen === 'gameOver') {
      dim();
      drawCenteredCard('COOP BLAST', `Score ${state.score}. Record ${state.highScore}. Francis réclame sa revanche.`, [
        ['REJOUER', 'start'],
        ['MENU', 'menu']
      ], true);
    }

    if (state.screen === 'playing') {
      const y = state.layout.trayTop - buttonH - 8;
      const pad = 12;
      button(pad, y, state.w * 0.28, buttonH, 'PAUSE', 'pause', { variant: 'ghost', small: true });
      button(state.w * 0.36, y, state.w * 0.28, buttonH, 'ROTATE', 'rotate', { small: true, disabled: !state.selected && !state.dragging });
      button(state.w - pad - state.w * 0.28, y, state.w * 0.28, buttonH, state.muted ? 'MUTE' : 'SON', 'mute', { variant: 'ghost', small: true });
    }
  }

  function drawPanel(x, y, w, h) {
    ctx.save();
    roundedRect(x, y, w, h, 28);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.15)');
    g.addColorStop(1, 'rgba(255,255,255,.06)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.stroke();
    ctx.restore();
  }

  function dim() {
    ctx.save();
    ctx.fillStyle = 'rgba(2,5,12,.66)';
    ctx.fillRect(0, 0, state.w, state.h);
    ctx.restore();
  }

  function drawCenteredCard(title, body, actions, danger = false) {
    const { w, h } = state;
    const cardW = Math.min(w * 0.86, 420);
    const cardH = Math.min(h * 0.44, 340);
    const x = (w - cardW) / 2;
    const y = (h - cardH) / 2;
    drawPanel(x, y, cardW, cardH);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = danger ? '#ff8a8a' : '#ffd166';
    ctx.font = `1000 ${clamp(w * 0.075, 28, 40)}px system-ui, sans-serif`;
    ctx.fillText(title, w / 2, y + 62);
    ctx.fillStyle = '#fff7dd';
    ctx.font = '800 16px system-ui, sans-serif';
    wrapText(body, w / 2, y + 92, cardW - 56, 22, 4, 'center');
    ctx.restore();
    const bw = cardW - 48;
    const bh = state.layout.buttonH;
    const startY = y + cardH - actions.length * (bh + 10) - 18;
    actions.forEach((a, i) => button(x + 24, startY + i * (bh + 10), bw, bh, a[0], a[1], { variant: i === 1 ? 'ghost' : undefined }));
  }

  function drawFooter() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,247,221,.56)';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(`Record ${state.highScore} · Perfects ${state.totalPerfect}`, state.w / 2, state.h - 8);
    ctx.restore();
  }

  function performAction(action) {
    switch (action) {
      case 'start': startGame('campaign'); break;
      case 'daily': startGame('daily'); break;
      case 'next': startLevel(state.level + 1); break;
      case 'pause': pauseToggle(); break;
      case 'rotate': rotateSelected(); break;
      case 'mute': toggleMute(); break;
      case 'menu': state.screen = 'menu'; state.mood = 'pilot'; tone('click'); break;
    }
  }

  function buttonAt(x, y) {
    return [...state.buttons].reverse().find(b => !b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }

  function pointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', ev => {
    canvas.setPointerCapture(ev.pointerId);
    const p = pointerPos(ev);
    state.pointer = { x: p.x, y: p.y, down: true, id: ev.pointerId };
    const b = buttonAt(p.x, p.y);
    if (b) {
      tone('click');
      performAction(b.action);
      ev.preventDefault();
      return;
    }
    if (state.screen !== 'playing') return;
    const piece = findPieceAt(p.x, p.y);
    if (piece) {
      state.dragging = piece;
      state.selected = piece;
      piece.offsetX = piece.x - p.x;
      piece.offsetY = piece.y - p.y;
      piece.scale = 1.12;
      state.message = `${shapeMap[piece.type].name} aux commandes.`;
      haptic('light');
    }
    ev.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointermove', ev => {
    const p = pointerPos(ev);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    if (state.dragging) {
      state.dragging.x = p.x + (state.dragging.offsetX || 0);
      state.dragging.y = p.y + (state.dragging.offsetY || 0);
      state.hoverSlot = nearestSlot(state.dragging);
    }
    ev.preventDefault();
  }, { passive: false });

  function endPointer(ev) {
    const p = pointerPos(ev);
    state.pointer = { x: p.x, y: p.y, down: false, id: null };
    if (state.dragging) {
      const piece = state.dragging;
      state.dragging = null;
      releasePiece(piece);
    }
    state.hoverSlot = null;
    ev.preventDefault();
  }
  canvas.addEventListener('pointerup', endPointer, { passive: false });
  canvas.addEventListener('pointercancel', endPointer, { passive: false });

  canvas.addEventListener('dblclick', ev => {
    const p = pointerPos(ev);
    const piece = findPieceAt(p.x, p.y);
    if (piece) {
      state.selected = piece;
      rotateSelected();
    }
  });

  window.addEventListener('keydown', ev => {
    if (ev.key === 'r' || ev.key === 'R') rotateSelected();
    if (ev.key === ' ' || ev.key === 'Escape') pauseToggle();
  });

  function loop(ts) {
    const dt = Math.min(0.033, (ts - (state.lastTs || ts)) / 1000 || 0.016);
    state.lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  async function boot() {
    resize();
    window.addEventListener('resize', resize);
    try {
      await loadAssets();
    } catch (error) {
      console.error(error);
    }
    state.screen = 'menu';
    state.mood = 'pilot';
    loader.classList.add('hidden');
    requestAnimationFrame(loop);
  }

  boot();
})();
