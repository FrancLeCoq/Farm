window.FRANC_CONFIG = {
  version: '1.0.0-deluxe',
  saveKey: 'francfarm_deluxe_v1',
  gridSize: 10,
  startCoins: 320,
  tile: { w: 78, h: 42 },
  crops: {
    wheat:  { name: 'Blé du Coq', emoji: '🌾', seed: 12, sell: 28, xp: 4, grow: 18, color: '#d6b14c', desc: 'Rapide. Base pour nourrir les bêtes.' },
    corn:   { name: 'Maïs solaire', emoji: '🌽', seed: 24, sell: 62, xp: 7, grow: 42, color: '#facc15', desc: 'Bon rendement, parfait pour les commandes.' },
    berry:  { name: 'Baies rouges', emoji: '🍓', seed: 46, sell: 128, xp: 13, grow: 90, color: '#fb7185', desc: 'Culture premium de milieu de partie.' },
    grape:  { name: 'Raisin du poulailler', emoji: '🍇', seed: 92, sell: 280, xp: 28, grow: 180, color: '#a78bfa', desc: 'Gros gain, croissance lente.' },
    golden: { name: 'Graine dorée $FRANC', emoji: '✨', seed: 180, sell: 590, xp: 52, grow: 360, color: '#ffd15c', desc: 'Réservée aux holders. Très rentable.', holder: true }
  },
  buildings: {
    coop: { name: 'Poulailler Alpha', emoji: '🐔', cost: 180, xp: 20, color: '#f97316', prod: { item: 'eggs', name: 'Œufs', emoji: '🥚', every: 38, qty: 1, sell: 42 }, desc: 'Produit des œufs automatiquement.' },
    mill: { name: 'Moulin $FRANC', emoji: '⚙️', cost: 420, xp: 45, color: '#94a3b8', input: { wheat: 2 }, prod: { item: 'flour', name: 'Farine', emoji: '🍚', every: 60, qty: 1, sell: 96 }, desc: 'Transforme 2 blés en farine.' },
    bakery: { name: 'Boulangerie du Coq', emoji: '🥖', cost: 760, xp: 80, color: '#f59e0b', input: { wheat: 2, eggs: 1 }, prod: { item: 'baguette', name: 'Baguette', emoji: '🥖', every: 86, qty: 1, sell: 180 }, desc: 'Produit des baguettes avec blé + œufs.' },
    tower: { name: 'Tour Telegram', emoji: '📡', cost: 1350, xp: 130, color: '#38bdf8', prod: { item: 'stars', name: 'Stars', emoji: '⭐', every: 140, qty: 1, sell: 320 }, desc: 'Crée des Stars pour symboliser l’univers Telegram.' },
    rocket: { name: 'Rocket Coop', emoji: '🚀', cost: 2800, xp: 260, color: '#c084fc', prod: { item: 'moonEgg', name: 'Moon Egg', emoji: '🌕', every: 240, qty: 1, sell: 780 }, desc: 'Bâtiment endgame réservé aux holders.', holder: true }
  },
  decorations: {
    road: { name: 'Route pavée', emoji: '🧱', cost: 8, xp: 1 },
    fence: { name: 'Clôture dorée', emoji: '🚧', cost: 14, xp: 1 }
  },
  orders: [
    { name: 'Panier du marché', need: { wheat: 4, corn: 2 }, reward: 210, xp: 32 },
    { name: 'Petit-déj du holder', need: { eggs: 3, wheat: 3 }, reward: 290, xp: 42 },
    { name: 'Baguettes pour le groupe', need: { baguette: 2, berry: 2 }, reward: 760, xp: 96 },
    { name: 'Raid Telegram', need: { stars: 1, corn: 4 }, reward: 1080, xp: 130 },
    { name: 'Mission Moon Coop', need: { moonEgg: 1, golden: 2 }, reward: 2400, xp: 320, holder: true }
  ],
  quests: [
    { id: 'plow3', icon: '🚜', title: 'Préparer le terrain', text: 'Laboure 3 parcelles pour lancer la première vraie production.', target: 3, metric: 'plowed', reward: 70 },
    { id: 'harvest5', icon: '🌾', title: 'Première récolte', text: 'Récolte 5 cultures. Francis veut remplir le grenier.', target: 5, metric: 'harvested', reward: 120 },
    { id: 'coop1', icon: '🐔', title: 'Le poulailler prend vie', text: 'Construis un Poulailler Alpha pour produire des œufs.', target: 1, metric: 'coopBuilt', reward: 180 },
    { id: 'order2', icon: '📦', title: 'Commerce local', text: 'Livre 2 commandes pour prouver que la ferme tourne.', target: 2, metric: 'ordersDone', reward: 350 },
    { id: 'level5', icon: '👑', title: 'Francis devient maire', text: 'Atteins le niveau 5 et débloque le vrai empire du poulailler.', target: 5, metric: 'level', reward: 600 }
  ],
  tips: [
    'Astuce : le blé pousse vite et alimente les chaînes de production.',
    'Passe en ?holder=1 dans l’URL pour tester les bonus holder localement.',
    'Les bâtiments continuent leur cycle quand tu reviens sur la page.',
    'Les commandes sont le meilleur moyen de gagner beaucoup d’XP.'
  ]
};
