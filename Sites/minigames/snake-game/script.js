const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('scoreValue');
const comboValue = document.getElementById('comboValue');
const hearts = Array.from(document.querySelectorAll('#lives .heart'));
const cooldownBars = {
  blue: document.getElementById('cd-blue'),
  green: document.getElementById('cd-green'),
  red: document.getElementById('cd-red')
};
const modal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const finalTipEl = document.getElementById('finalTip');
const restartBtn = document.getElementById('restartBtn');
const shell = document.getElementById('gameShell');
const pauseBtn = document.getElementById('pauseBtn');
const levelUpModal = document.getElementById('levelUpModal');
const augmentChoices = document.getElementById('augmentChoices');
const xpBarFill = document.getElementById('xpBarFill');
const xpBarText = document.getElementById('xpBarText');
const levelValue = document.getElementById('levelValue');
const shieldsDisplay = document.getElementById('shieldsDisplay');
const shieldCount = document.getElementById('shieldCount');

const CELL_SIZE = 24;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const MOVE_INTERVAL = 120; // ms
const ABILITY_DURATION = 750; // ms
const ABILITY_COOLDOWN = 2000; // ms
const DEFAULT_COLOR = '#ffe36d';
const PROJECTILE_SPEED = 0.018; // cells/ms (faster than before)
const REFLECT_SPEED = 0.038;    // cells/ms (return is notably faster)
const TANK_FIRE_INTERVAL = 4000; // ms

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const abilityColors = {
  blue: '#40c4ff',
  green: '#32ffb3',
  red: '#ff4f6d'
};

const tips = [
  'Tente guardar o reflexo vermelho para tanques rápidos.',
  'Projéteis refletem mais rápido, use isso para limpar mais rápido.',
  'Evite ficar encurralado perto das bordas quando tanques aparecerem.',
  'Use o combo de alimentos para farmar score rapidamente.'
];

// ===== AUGMENTS SYSTEM =====
const AUGMENT_DATABASE = {
  // COMUNS (40%)
  remendoRapido: {
    id: 'remendoRapido',
    name: 'Remendo Rápido',
    desc: 'Cura +1 de vida perdida (instantâneo).',
    rarity: 'common',
    type: 'instant',
    stackable: false
  },
  escudoEnergia: {
    id: 'escudoEnergia',
    name: 'Escudo de Energia',
    desc: 'Recebe 1 carga de escudo que bloqueia o próximo dano (acumulável até 3x).',
    rarity: 'common',
    type: 'instant',
    stackable: true,
    maxStacks: 3
  },
  
  // INCOMUNS (30%)
  comboEstendido: {
    id: 'comboEstendido',
    name: 'Combo Estendido',
    desc: 'Aumenta o limite máximo do Combo em +1.',
    rarity: 'uncommon',
    type: 'passive',
    stackable: true
  },
  nutricao: {
    id: 'nutricao',
    name: 'Nutrição',
    desc: 'Coletar a orbe gera 50% mais pontos (acumulável).',
    rarity: 'uncommon',
    type: 'passive',
    stackable: true
  },
  comboSeguro: {
    id: 'comboSeguro',
    name: 'Combo Seguro',
    desc: 'Sofrer dano reduz o combo em -1 em vez de -2.',
    rarity: 'uncommon',
    type: 'passive',
    stackable: false
  },
  vacuum: {
    id: 'vacuum',
    name: 'Vacuum',
    desc: 'Orbes são sugadas automaticamente quando estão a 1 casa de distância da cabeça.',
    rarity: 'uncommon',
    type: 'passive',
    stackable: false,
    unique: true
  },
  
  // RAROS (20%)
  vingancaDoce: {
    id: 'vingancaDoce',
    name: 'Vingança Doce',
    desc: 'Ao sofrer dano, ganha 2 segundos de invulnerabilidade (ainda pode refletir projéteis).',
    rarity: 'rare',
    type: 'passive',
    stackable: false
  },
  cacadorTanques: {
    id: 'cacadorTanques',
    name: 'Caçador de Tanques',
    desc: 'Tanques destruídos dão +50% de pontuação (acumulável).',
    rarity: 'rare',
    type: 'passive',
    stackable: true
  },
  superCor: {
    id: 'superCor',
    name: 'Super Cor',
    desc: 'Aumenta o tempo base da colorificação em +0.5 seg (acumula até 2 segundos).',
    rarity: 'rare',
    type: 'passive',
    stackable: true,
    maxStacks: 4
  },
  disparoPlasma: {
    id: 'disparoPlasma',
    name: 'Disparo de Plasma',
    desc: 'A cada 10 segundos, um raio prismático destrói automaticamente um tanque na tela.',
    rarity: 'rare',
    type: 'passive',
    stackable: false
  },
  doubleDamage: {
    id: 'doubleDamage',
    name: 'Double Damage',
    desc: 'O tiro refletido causa +1 de dano.',
    rarity: 'rare',
    type: 'passive',
    stackable: true
  },
  
  // MUITO RAROS (7%)
  camaleaoAuto: {
    id: 'camaleaoAuto',
    name: 'Camaleão Automático',
    desc: 'A cada 8 segundos, a cobra fica invulnerável por 2 segundos.',
    rarity: 'epic',
    type: 'passive',
    stackable: false
  },
  superCombo: {
    id: 'superCombo',
    name: 'Super Combo',
    desc: 'Aumenta o limite de combo em +4.',
    rarity: 'epic',
    type: 'passive',
    stackable: false
  },
  midas: {
    id: 'midas',
    name: 'Midas',
    desc: 'Aperte K: todos os tiros pelos próximos 5 segundos viram orbes de ponto (20s de recarga).',
    rarity: 'epic',
    type: 'power',
    key: 'k',
    cooldown: 20000,
    stackable: false
  },
  peleCristalina: {
    id: 'peleCristalina',
    name: 'Pele Cristalina',
    desc: 'Ao refletir, a cobra fica prismática por 1s refletindo automaticamente outros projéteis.',
    rarity: 'epic',
    type: 'passive',
    stackable: false,
    unique: true
  },
  vampirismo: {
    id: 'vampirismo',
    name: 'Vampirismo',
    desc: 'Destruir um tanque restaura 1 de vida (máx 3).',
    rarity: 'epic',
    type: 'passive',
    stackable: false,
    unique: true
  },
  
  // LENDÁRIOS (3%)
  espelhoInfinito: {
    id: 'espelhoInfinito',
    name: 'Espelho Infinito',
    desc: 'Seus projéteis refletidos atravessam os tanques e buscam outro alvo automaticamente até 3x.',
    rarity: 'legendary',
    type: 'passive',
    stackable: false
  },
  anjoGuardiao: {
    id: 'anjoGuardiao',
    name: 'Anjo Guardião',
    desc: 'A cada 5 segundos, ganha 1 carga de escudo (máx 3).',
    rarity: 'legendary',
    type: 'passive',
    stackable: false,
    cooldown: 5000,
    lastActivation: 0
  },
  camaleao: {
    id: 'camaleao',
    name: 'Camaleão',
    desc: 'Tecla R (5s recarga): cobra fica arco-íris e reflete todo tipo de projétil pela duração base.',
    rarity: 'legendary',
    type: 'power',
    key: 'r',
    cooldown: 5000,
    stackable: false
  },
  superCobra: {
    id: 'superCobra',
    name: 'Super Cobra',
    desc: 'Aperte K: durante 5 segundos, uma aura gira ao redor da cobra refletindo tudo automaticamente com 200% de velocidade e dano.',
    rarity: 'legendary',
    type: 'power',
    key: 'k',
    cooldown: 15000,
    stackable: false
  },
  superArmadura: {
    id: 'superArmadura',
    name: 'Super Armadura',
    desc: 'Destruir um tanque gera 1 carga de escudo (máx 3).',
    rarity: 'legendary',
    type: 'passive',
    stackable: false,
    unique: true
  },
  wallBounce: {
    id: 'wallBounce',
    name: 'Wall Bounce',
    desc: 'Não toma dano ao colidir com a parede.',
    rarity: 'epic',
    type: 'passive',
    stackable: false,
    unique: true
  }
};

const RARITY_CHANCES = [
  { rarity: 'common', weight: 40 },
  { rarity: 'uncommon', weight: 30 },
  { rarity: 'rare', weight: 20 },
  { rarity: 'epic', weight: 7 },
  { rarity: 'legendary', weight: 3 }
];

const RARITY_NAMES = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Muito Raro',
  legendary: 'Lendário'
};

function getRandomRarity() {
  const total = RARITY_CHANCES.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * total;
  for (const rarityInfo of RARITY_CHANCES) {
    random -= rarityInfo.weight;
    if (random <= 0) return rarityInfo.rarity;
  }
  return 'common';
}

function getAugmentsByRarity(rarity) {
  return Object.values(AUGMENT_DATABASE).filter(aug => aug.rarity === rarity);
}

function generateAugmentChoice() {
  const rarity = getRandomRarity();
  const pool = getAugmentsByRarity(rarity);
  if (pool.length === 0) return generateAugmentChoice(); // fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

function hasAugment(augmentId) {
  return state.augments.some(a => a.id === augmentId);
}

function getAugmentStacks(augmentId) {
  const aug = state.augments.find(a => a.id === augmentId);
  return aug ? aug.stacks : 0;
}

function addAugment(augment) {
  const existing = state.augments.find(a => a.id === augment.id);
  if (existing && augment.stackable) {
    const maxStacks = augment.maxStacks || 999;
    if (existing.stacks < maxStacks) {
      existing.stacks++;
    }
  } else if (!existing) {
    state.augments.push({ ...augment, stacks: 1 });
  }
  applyAugmentEffect(augment);
}

function applyAugmentEffect(augment) {
  const now = performance.now();
  
  switch (augment.id) {
    case 'remendoRapido':
      if (state.lives < 3) {
        state.lives++;
        updateHearts();
        playTone(880, 0.15, 0.25, 'sine');
      }
      break;
      
    case 'escudoEnergia':
      if (state.shields < 3) {
        state.shields++;
        updateShields();
        playTone(720, 0.15, 0.25, 'triangle');
      }
      break;
      
    case 'camaleaoAuto':
      state.autoInvulnTimer = now + 8000;
      break;
      
    case 'disparoPlasma':
      state.disparoPlasmaTimer = now + 10000;
      break;
  }
  
  // Poderes: só substituir se usar a mesma tecla
  if (augment.type === 'power') {
    // Verificar se já existe um poder ativo com a mesma tecla
    const currentPowerKey = state.activePower ? AUGMENT_DATABASE[state.activePower]?.key : null;
    const newPowerKey = augment.key;
    
    // Se não há poder ou é a mesma tecla, substitui
    if (!state.activePower || currentPowerKey === newPowerKey) {
      state.activePower = augment.id;
      state.powerCooldown = 0;
    }
    // Se é tecla diferente, adiciona como poder secundário
    else {
      if (!state.secondaryPower) {
        state.secondaryPower = augment.id;
        state.secondaryPowerCooldown = 0;
      }
    }
  }
}

const state = {
  snake: [],
  renderSnake: [],
  direction: { x: 1, y: 0 },
  queuedDirection: { x: 1, y: 0 },
  food: null,
  score: 0,
  combo: 1,
  lives: 3,
  ability: {
    activeColor: null,
    expiresAt: 0,
    cooldowns: {
      blue: 0,
      green: 0,
      red: 0
    }
  },
  currentColor: DEFAULT_COLOR,
  currentColorKey: 'default',
  tanks: [],
  projectiles: [],
  explosions: [],
  nextTankAt: 0,
  isGameOver: false,
  lastUpdate: 0,
  moveAccumulator: 0,
  lastDelta: 0,
  isPaused: false,
  paused: {
    user: false,
    guide: false
  },
  pauseStartTime: 0,
  pauseTimeAccumulated: 0,
  tongue: {
    visible: false,
    nextToggle: 0,
    hideAt: 0
  },
  xp: 0,
  level: 0,
  xpRequired: 1000,
  shields: 0,
  augments: [],
  activePower: null,
  powerCooldown: 0,
  secondaryPower: null,
  secondaryPowerCooldown: 0,
  invulnerable: false,
  invulnerableUntil: 0,
  autoInvulnTimer: 0,
  midasActive: false,
  midasUntil: 0,
  superCobraActive: false,
  superCobraUntil: 0,
  camaleaoActive: false,
  camaleaoUntil: 0,
  gameStartTime: 0,
  baseTankHealth: 1,
  tankSpawnMultiplier: 1.0,
  nextBossAt: 0,
  plasmaBeam: null,
  orbs: [],
  peleCristalinaActive: false,
  peleCristalinaUntil: 0,
  disparoPlasmaTimer: 0,
  wallBounceUntil: 0,
  orbsCollected: 0
};

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const cols = Math.floor(CANVAS_WIDTH / CELL_SIZE);
const rows = Math.floor(CANVAS_HEIGHT / CELL_SIZE);
const ARENA_MARGIN_CELLS = 4;
const PLAYFIELD = {
  minX: ARENA_MARGIN_CELLS,
  minY: ARENA_MARGIN_CELLS,
  maxX: cols - ARENA_MARGIN_CELLS - 1,
  maxY: rows - ARENA_MARGIN_CELLS - 1
};

// ===== SOUND SYSTEM =====
let audioCtx;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

window.addEventListener('pointerdown', ensureAudio, { once: true });

function playTone(freq, duration = 0.15, volume = 0.2, type = 'square') {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

// ===== INPUT HANDLERS =====
const directionMap = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

const abilityKeyMap = {
  q: 'blue',
  Q: 'blue',
  e: 'green',
  E: 'green',
  ' ': 'red'
};

function handleKeydown(event) {
  if (event.repeat) {
    event.preventDefault();
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault();
    toggleUserPause();
    return;
  }
  if (state.isPaused) {
    event.preventDefault();
    return;
  }
  
  // Tecla K: ativar poder
  if (event.key === 'k' || event.key === 'K') {
    event.preventDefault();
    event.stopPropagation();
    activatePower();
    return;
  }
  
  // Tecla R: Camaleão lendário
  if ((event.key === 'r' || event.key === 'R') && hasAugment('camaleao')) {
    event.preventDefault();
    event.stopPropagation();
    activateCamaleao();
    return;
  }
  
  if (directionMap[event.key]) {
    event.preventDefault();
    event.stopPropagation();
    queueDirection(directionMap[event.key]);
    return;
  }
  if (abilityKeyMap[event.key] || abilityKeyMap[event.key.toLowerCase?.()]) {
    event.preventDefault();
    event.stopPropagation();
    triggerAbility(abilityKeyMap[event.key] || abilityKeyMap[event.key.toLowerCase()]);
  }
}

function activatePower() {
  const now = performance.now();
  
  // Tentar ativar poder primário (tecla K)
  if (state.activePower) {
    const powerDef = AUGMENT_DATABASE[state.activePower];
    if (powerDef && powerDef.key === 'k' && now >= state.powerCooldown) {
      switch (state.activePower) {
        case 'midas':
          activateMidas();
          state.powerCooldown = now + 20000;
          break;
          
        case 'superCobra':
          activateSuperCobra();
          state.powerCooldown = now + 15000;
          break;
      }
      playTone(1300, 0.2, 0.3, 'square');
      return;
    }
  }
  
  // Tentar ativar poder secundário (tecla K)
  if (state.secondaryPower) {
    const powerDef = AUGMENT_DATABASE[state.secondaryPower];
    if (powerDef && powerDef.key === 'k' && now >= state.secondaryPowerCooldown) {
      switch (state.secondaryPower) {
        case 'midas':
          activateMidas();
          state.secondaryPowerCooldown = now + 20000;
          break;
          
        case 'superCobra':
          activateSuperCobra();
          state.secondaryPowerCooldown = now + 15000;
          break;
      }
      playTone(1300, 0.2, 0.3, 'square');
    }
  }
}

function fireDisparoPlasma() {
  const head = state.snake[0];
  
  // Buscar tanque mais próximo (qualquer direção)
  let targetTank = null;
  let minDist = Infinity;
  
  state.tanks.forEach(tank => {
    if (!tank.alive) return;
    if (tank.isBoss) return; // Boss não pode ser morto instantaneamente
    
    const dx = tank.x - head.x;
    const dy = tank.y - head.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < minDist) {
      minDist = dist;
      targetTank = tank;
    }
  });
  
  if (targetTank) {
    // Criar efeito visual de raio prismático
    const headX = (head.x + 0.5) * CELL_SIZE;
    const headY = (head.y + 0.5) * CELL_SIZE;
    const targetX = (targetTank.x + 0.5) * CELL_SIZE;
    const targetY = (targetTank.y + 0.5) * CELL_SIZE;
    
    state.plasmaBeam = {
      startX: headX,
      startY: headY,
      endX: targetX,
      endY: targetY,
      startTime: performance.now(),
      duration: 300
    };
    
    destroyTank(targetTank.id, 999); // Destruição instantânea
    playTone(1600, 0.3, 0.35, 'sawtooth');
  }
}

function activateMidas() {
  const now = performance.now();
  state.midasActive = true;
  state.midasUntil = now + 5000;
}

function activateSuperCobra() {
  const now = performance.now();
  state.superCobraActive = true;
  state.superCobraUntil = now + 5000;
}

function activateCamaleao() {
  const now = performance.now();
  
  // Verificar qual slot tem o camaleão
  let cooldownRef;
  if (state.activePower === 'camaleao') {
    cooldownRef = 'powerCooldown';
  } else if (state.secondaryPower === 'camaleao') {
    cooldownRef = 'secondaryPowerCooldown';
  } else {
    return; // Não tem camaleão
  }
  
  if (now < state[cooldownRef]) return;
  
  // Calcular duração
  let duration = ABILITY_DURATION;
  const superCorStacks = getAugmentStacks('superCor');
  if (superCorStacks > 0) {
    duration += Math.min(superCorStacks * 500, 2000); // +0.5s por stack, max +2s
  }
  
  state.camaleaoActive = true;
  state.camaleaoUntil = now + duration;
  state[cooldownRef] = now + 5000;
  playTone(1500, 0.25, 0.3, 'triangle');
}

document.addEventListener('keydown', handleKeydown, true);

// ===== INITIALIZATION =====
function initSnake() {
  state.snake = [];
  const startX = Math.floor((PLAYFIELD.minX + PLAYFIELD.maxX) / 2);
  const startY = Math.floor((PLAYFIELD.minY + PLAYFIELD.maxY) / 2);
  for (let i = 0; i < 5; i++) {
    state.snake.push({ x: startX - i, y: startY });
  }
  state.direction = { x: 1, y: 0 };
  state.queuedDirection = { x: 1, y: 0 };
  state.renderSnake = state.snake.map(seg => ({ ...seg }));
}

function spawnFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * (PLAYFIELD.maxX - PLAYFIELD.minX + 1)) + PLAYFIELD.minX,
      y: Math.floor(Math.random() * (PLAYFIELD.maxY - PLAYFIELD.minY + 1)) + PLAYFIELD.minY
    };
  } while (state.snake.some(seg => seg.x === position.x && seg.y === position.y));
  state.food = position;
}

function resetGame() {
  state.score = 0;
  state.combo = 1;
  state.lives = 3;
  state.ability.activeColor = null;
  state.ability.cooldowns.blue = 0;
  state.ability.cooldowns.green = 0;
  state.ability.cooldowns.red = 0;
  state.currentColor = DEFAULT_COLOR;
  state.currentColorKey = 'default';
  state.projectiles = [];
  state.tanks = [];
  state.explosions = [];
  state.nextTankAt = performance.now() + 2500;
  state.isGameOver = false;
  state.moveAccumulator = 0;
  state.lastUpdate = null;
  state.paused.user = false;
  state.paused.guide = false;
  state.isPaused = false;
  state.pauseStartTime = 0;
  state.pauseTimeAccumulated = 0;
  state.tongue.visible = false;
  state.tongue.hideAt = 0;
  state.tongue.nextToggle = performance.now() + 800 + Math.random() * 1200;
  state.xp = 0;
  state.level = 0;
  state.xpRequired = 1000;
  state.shields = 0;
  state.augments = [];
  state.activePower = null;
  state.powerCooldown = 0;
  state.secondaryPower = null;
  state.secondaryPowerCooldown = 0;
  state.invulnerable = false;
  state.invulnerableUntil = 0;
  state.autoInvulnTimer = 0;
  state.midasActive = false;
  state.midasUntil = 0;
  state.superCobraActive = false;
  state.superCobraUntil = 0;
  state.camaleaoActive = false;
  state.camaleaoUntil = 0;
  state.gameStartTime = performance.now();
  state.baseTankHealth = 1;
  state.tankSpawnMultiplier = 1.0;
  state.nextBossAt = performance.now() + 120000; // 2 minutos
  state.plasmaBeam = null;
  state.orbsCollected = 0;
  updateScoreboard();
  updateHearts();
  updateShields();
  updateCooldowns();
  updateXPBar();
  initSnake();
  spawnFood();
  updatePauseState();
}

restartBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  resetGame();
});

// ===== GAMEPLAY =====
function queueDirection(newDir) {
  if (state.moveAccumulator === 0 && state.snake.length <= 1) {
    state.direction = newDir;
    return;
  }
  if (state.direction.x === -newDir.x && state.direction.y === -newDir.y) {
    return;
  }
  if (state.queuedDirection.x === newDir.x && state.queuedDirection.y === newDir.y) {
    return;
  }
  state.queuedDirection = newDir;
}

function triggerAbility(colorKey) {
  const now = performance.now();
  const cooldownEnds = state.ability.cooldowns[colorKey];
  if (now < cooldownEnds) return;

  // Calcular duração com augments
  let duration = ABILITY_DURATION;
  const superCorStacks = getAugmentStacks('superCor');
  if (superCorStacks > 0) {
    duration += Math.min(superCorStacks * 500, 2000); // +0.5s por stack, max +2s
  }

  state.ability.activeColor = colorKey;
  state.ability.expiresAt = now + duration;
  state.ability.cooldowns[colorKey] = now + ABILITY_COOLDOWN;
  state.currentColor = abilityColors[colorKey];
  state.currentColorKey = colorKey;
  playTone(880, 0.1, 0.2, 'triangle');
}

function updateCooldowns() {
  const now = performance.now();
  Object.entries(cooldownBars).forEach(([color, bar]) => {
    const remaining = Math.max(0, state.ability.cooldowns[color] - now);
    const ratio = 1 - remaining / ABILITY_COOLDOWN;
    const progress = Math.min(1, Math.max(0, ratio));
    bar.style.transform = `scaleX(${progress})`;
    bar.style.background = abilityColors[color];
  });
}

function updateHearts() {
  hearts.forEach((heart, index) => {
    if (index < state.lives) {
      heart.classList.add('filled');
    } else {
      heart.classList.remove('filled');
    }
  });
}

function updateScoreboard() {
  scoreValue.textContent = state.score.toString().padStart(4, '0');
  comboValue.textContent = `x${state.combo}`;
}

function updateShields() {
  if (state.shields > 0) {
    shieldsDisplay.style.visibility = 'visible';
    shieldsDisplay.style.opacity = '1';
    shieldCount.textContent = state.shields;
  } else {
    shieldsDisplay.style.visibility = 'hidden';
    shieldsDisplay.style.opacity = '0';
  }
}

function updateXPBar() {
  const percentage = Math.min(100, (state.xp / state.xpRequired) * 100);
  xpBarFill.style.width = `${percentage}%`;
  xpBarText.textContent = `${state.xp} / ${state.xpRequired}`;
  levelValue.textContent = state.level;
}

function addXP(amount) {
  state.xp += amount;
  updateXPBar();
  
  if (state.xp >= state.xpRequired) {
    levelUp();
  }
}

function levelUp() {
  state.level++;
  state.xp -= state.xpRequired;
  state.xpRequired = Math.floor(state.xpRequired * 1.5);
  updateXPBar();
  
  playTone(1200, 0.25, 0.3, 'triangle');
  showLevelUpModal();
}

function showLevelUpModal() {
  // Pausar o jogo
  state.paused.guide = true;
  updatePauseState();
  
  // Gerar 3 augments aleatórios sem repetição
  const choices = [];
  const usedIds = new Set();
  
  for (let i = 0; i < 3; i++) {
    let attempts = 0;
    let augment;
    
    do {
      augment = generateAugmentChoice();
      attempts++;
      
      // Se tentou muito, aceita qualquer um para não travar
      if (attempts > 100) break;
      
      // Checar se já foi usado nesta seleção
      const alreadyInChoices = usedIds.has(augment.id);
      
      // Checar se é único e já foi pego nesta rodada
      const isUniqueAndOwned = augment.unique && hasAugment(augment.id);
      
      // Repetir se já está nas escolhas ou se é único e já possui
      if (alreadyInChoices || isUniqueAndOwned) {
        augment = null;
      }
    } while (!augment);
    
    if (augment) {
      choices.push(augment);
      usedIds.add(augment.id);
    }
  }
  
  // Renderizar cards
  augmentChoices.innerHTML = '';
  choices.forEach((augment, index) => {
    const card = document.createElement('div');
    card.className = `augment-card ${augment.rarity}`;
    
    // Verificar se vai substituir um poder (só substitui se for mesma tecla)
    let willReplace = false;
    if (augment.type === 'power') {
      const newPowerKey = augment.key;
      const primaryPowerKey = state.activePower ? AUGMENT_DATABASE[state.activePower]?.key : null;
      const secondaryPowerKey = state.secondaryPower ? AUGMENT_DATABASE[state.secondaryPower]?.key : null;
      
      willReplace = (primaryPowerKey === newPowerKey && state.activePower !== augment.id) ||
                    (secondaryPowerKey === newPowerKey && state.secondaryPower !== augment.id);
    }
    
    card.innerHTML = `
      <div class="augment-rarity">${RARITY_NAMES[augment.rarity]}</div>
      <div class="augment-name">${augment.name}</div>
      <div class="augment-desc">${augment.desc}</div>
      ${willReplace ? `<div class="augment-replace-warning">⚠ Irá substituir poder existente</div>` : ''}
    `;
    
    card.addEventListener('click', () => {
      selectAugment(augment);
    });
    
    augmentChoices.appendChild(card);
  });
  
  levelUpModal.classList.remove('hidden');
}

function selectAugment(augment) {
  addAugment(augment);
  levelUpModal.classList.add('hidden');
  
  // Despausar
  state.paused.guide = false;
  updatePauseState();
  
  // Conceder 1.5 segundos de invulnerabilidade e 1s de wall-bounce APÓS despausar
  const now = performance.now();
  state.invulnerable = true;
  state.invulnerableUntil = now + 1500;
  state.wallBounceUntil = now + 1000;
  
  playTone(980, 0.2, 0.3, 'sine');
}

function loseLife(reason) {
  if (state.isGameOver) return;
  if (state.invulnerable) return;
  
  const now = performance.now();
  
  // Checar escudo primeiro
  if (state.shields > 0) {
    state.shields--;
    updateShields();
    playTone(520, 0.15, 0.25, 'triangle');
    shell.classList.remove('shake');
    void shell.offsetWidth;
    shell.classList.add('shake');
    return;
  }
  
  // Reduzir vida
  state.lives -= 1;
  
  // Combo: checar augment Combo Seguro
  if (hasAugment('comboSeguro')) {
    // Combo Seguro: reduz apenas 1 em vez de 2
    state.combo = Math.max(1, state.combo - 1);
  } else {
    // Sem Combo Seguro: combo reduz 2
    state.combo = Math.max(1, state.combo - 2);
  }
  
  updateHearts();
  updateScoreboard();
  shell.classList.remove('shake');
  void shell.offsetWidth;
  shell.classList.add('shake');
  playTone(120, 0.25, 0.25, 'sawtooth');
  
  // Vingança Doce: invulnerabilidade
  if (hasAugment('vingancaDoce')) {
    state.invulnerable = true;
    state.invulnerableUntil = now + 2000;
  }
  
  if (state.lives <= 0) {
    triggerGameOver(reason || 'Você ficou sem energia!');
  }
}

function triggerGameOver(reason) {
  state.isGameOver = true;
  finalScoreEl.textContent = state.score;
  finalTipEl.textContent = reason || tips[Math.floor(Math.random() * tips.length)];
  modal.classList.remove('hidden');
}

function stepSnake() {
  state.direction = state.queuedDirection;
  const head = { x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y };

  const now = performance.now();
  const hasWallBounce = hasAugment('wallBounce') || now < state.wallBounceUntil;
  
  if (head.x < PLAYFIELD.minX || head.x > PLAYFIELD.maxX || head.y < PLAYFIELD.minY || head.y > PLAYFIELD.maxY) {
    // SEMPRE muda de direção ao bater na parede
    const possibleDirections = [];
    
    // Verificar qual parede foi atingida e adicionar direções válidas
    if (head.x < PLAYFIELD.minX) {
      // Parede esquerda - pode ir para cima ou baixo
      if (state.direction.x === -1) {
        if (head.y + 1 <= PLAYFIELD.maxY) possibleDirections.push({ x: 0, y: 1 }); // baixo
        if (head.y - 1 >= PLAYFIELD.minY) possibleDirections.push({ x: 0, y: -1 }); // cima
      }
    } else if (head.x > PLAYFIELD.maxX) {
      // Parede direita - pode ir para cima ou baixo
      if (state.direction.x === 1) {
        if (head.y + 1 <= PLAYFIELD.maxY) possibleDirections.push({ x: 0, y: 1 }); // baixo
        if (head.y - 1 >= PLAYFIELD.minY) possibleDirections.push({ x: 0, y: -1 }); // cima
      }
    }
    
    if (head.y < PLAYFIELD.minY) {
      // Parede superior - pode ir para esquerda ou direita
      if (state.direction.y === -1) {
        if (head.x + 1 <= PLAYFIELD.maxX) possibleDirections.push({ x: 1, y: 0 }); // direita
        if (head.x - 1 >= PLAYFIELD.minX) possibleDirections.push({ x: -1, y: 0 }); // esquerda
      }
    } else if (head.y > PLAYFIELD.maxY) {
      // Parede inferior - pode ir para esquerda ou direita
      if (state.direction.y === 1) {
        if (head.x + 1 <= PLAYFIELD.maxX) possibleDirections.push({ x: 1, y: 0 }); // direita
        if (head.x - 1 >= PLAYFIELD.minX) possibleDirections.push({ x: -1, y: 0 }); // esquerda
      }
    }
    
    if (possibleDirections.length > 0) {
      // Escolher direção aleatória segura
      const newDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
      state.direction = newDirection;
      state.queuedDirection = newDirection;
      
      // Recalcular nova cabeça com a direção corrigida
      const newHead = { x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y };
      state.snake.unshift(newHead);
      state.snake.pop();
      
      // Tomar dano APENAS se NÃO tiver Wall Bounce
      if (!hasWallBounce) {
        loseLife('Você bateu na parede!');
        if (state.lives <= 0) {
          return triggerGameOver('Você bateu na parede demais!');
        }
      }
      
      updateScoreboard();
      playTone(1200, 0.08, 0.15, 'sine');
      return;
    }
    
    // Se não houver direção válida, game over
    return triggerGameOver('Você ficou encurralado!');
  }

  // Self-collision: chop snake at collision point instead of game over
  const collisionIndex = state.snake.findIndex(seg => seg.x === head.x && seg.y === head.y);
  if (collisionIndex !== -1) {
    // Truncate snake at collision point
    state.snake = state.snake.slice(0, collisionIndex);
    state.renderSnake = state.renderSnake.slice(0, collisionIndex);
    
    // Lose a life/shield
    loseLife('Você se picotou!');
    
    // Reduce combo (but don't reset to 0)
    state.combo = Math.max(1, Math.floor(state.combo / 2));
    
    // Continue playing if still alive
    if (state.lives <= 0) {
      return triggerGameOver('Você se picotou demais!');
    }
    
    // Add new head position for continued movement
    state.snake.unshift(head);
    updateScoreboard();
    return;
  }

  state.snake.unshift(head);

  if (state.food && head.x === state.food.x && head.y === state.food.y) {
    // Calcular pontos com augments
    let basePoints = 50 * state.combo;
    const nutricaoStacks = getAugmentStacks('nutricao');
    if (nutricaoStacks > 0) {
      basePoints *= (1 + nutricaoStacks * 0.5);
    }
    
    state.score += Math.floor(basePoints);
    
    // Calcular limite de combo com augments
    let maxCombo = 5;
    maxCombo += getAugmentStacks('comboEstendido');
    if (hasAugment('superCombo')) maxCombo += 4;
    
    state.combo = Math.min(state.combo + 1, maxCombo);
    playTone(600, 0.08, 0.2, 'square');
    
    // Adicionar XP
    addXP(Math.floor(basePoints));
    
    spawnFood();
  } else {
    state.snake.pop();
  }
  updateScoreboard();
}

function updateAbilityState(now) {
  if (state.ability.activeColor && now >= state.ability.expiresAt) {
    state.ability.activeColor = null;
    state.currentColor = DEFAULT_COLOR;
    state.currentColorKey = 'default';
  }
}

function calculateTankHealth() {
  const elapsed = (performance.now() - state.gameStartTime) / 1000; // segundos
  const healthIncreases = Math.floor(elapsed / 45); // +1 vida a cada 45s
  return state.baseTankHealth + healthIncreases;
}

function calculateSpawnRate() {
  const elapsed = (performance.now() - state.gameStartTime) / 1000; // segundos
  const speedIncreases = Math.floor(elapsed / 5); // a cada 5s
  return Math.max(0.5, 1.0 - (speedIncreases * 0.03)); // -3% cada 5s, min 50%
}

function spawnTank(isBoss = false) {
  const colors = ['blue', 'green', 'red'];
  const sides = ['top', 'bottom', 'left', 'right'];
  const colorKey = isBoss ? 'rainbow' : colors[Math.floor(Math.random() * colors.length)];
  const side = sides[Math.floor(Math.random() * sides.length)];
  let x = 0;
  let y = 0;
  const horizontalSpan = PLAYFIELD.maxX - PLAYFIELD.minX;
  const verticalSpan = PLAYFIELD.maxY - PLAYFIELD.minY;
  const marginOffset = 1.8;

  switch (side) {
    case 'top':
      x = PLAYFIELD.minX + Math.random() * horizontalSpan;
      y = PLAYFIELD.minY - marginOffset;
      break;
    case 'bottom':
      x = PLAYFIELD.minX + Math.random() * horizontalSpan;
      y = PLAYFIELD.maxY + marginOffset;
      break;
    case 'left':
      x = PLAYFIELD.minX - marginOffset;
      y = PLAYFIELD.minY + Math.random() * verticalSpan;
      break;
    case 'right':
      x = PLAYFIELD.maxX + marginOffset;
      y = PLAYFIELD.minY + Math.random() * verticalSpan;
      break;
  }

  const baseHealth = calculateTankHealth();
  const health = isBoss ? baseHealth * 3 : baseHealth;
  const maxHealth = health;

  const tank = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    x,
    y,
    color: colorKey,
    isBoss: isBoss,
    alive: true,
    health: health,
    maxHealth: maxHealth,
    destroyedAt: 0,
    nextShotAt: performance.now() + 1500 + Math.random() * 1000
  };
  state.tanks.push(tank);
  
  if (isBoss) {
    playTone(100, 0.4, 0.3, 'sawtooth');
  } else {
    playTone(180, 0.2, 0.12, 'triangle');
  }
}

function spawnProjectile(tank) {
  const head = state.snake[0];
  const origin = { x: tank.x + 0.5, y: tank.y + 0.5 };
  const target = { x: head.x + 0.5, y: head.y + 0.5 };
  const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const speed = PROJECTILE_SPEED;
  
  // Boss: cor aleatória entre verde, azul e vermelho
  let projectileColor = tank.color;
  if (tank.isBoss) {
    const colors = ['blue', 'green', 'red'];
    projectileColor = colors[Math.floor(Math.random() * colors.length)];
  }
  
  const projectile = {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
    color: projectileColor,
    returning: false,
    tankId: tank.id,
    magnitude: speed
  };
  state.projectiles.push(projectile);
  tank.projectileActive = true;
  playTone(320, 0.15, 0.18, 'square');
}

function destroyTank(tankId, damageTaken = 1) {
  const tank = state.tanks.find(t => t.id === tankId);
  if (!tank || !tank.alive) return;
  
  // Aplicar dano
  tank.health -= damageTaken;
  
  if (tank.health <= 0) {
    tank.alive = false;
    tank.destroyedAt = performance.now();
    tank.nextShotAt = Infinity;
    
    // Calcular pontos com augment Caçador de Tanques
    // Pontos base escalam com a vida do tanque e combo
    let basePoints = tank.isBoss ? 500 : 50;
    let tankPoints = basePoints * tank.maxHealth * state.combo;
    const cacadorStacks = getAugmentStacks('cacadorTanques');
    if (cacadorStacks > 0) {
      tankPoints *= (1 + cacadorStacks * 0.5);
    }
    
    state.score += Math.floor(tankPoints);
    
    // Calcular limite de combo
    let maxCombo = 5;
    maxCombo += getAugmentStacks('comboEstendido');
    if (hasAugment('superCombo')) maxCombo += 4;
    
    state.combo = Math.min(state.combo + 1, maxCombo);
    state.explosions.push({ x: tank.x + 0.5, y: tank.y + 0.5, radius: 0, alpha: 1 });
    
    // Adicionar XP
    addXP(Math.floor(tankPoints));
    
    // Vampirismo: restaurar vida ao destruir tanque
    if (hasAugment('vampirismo') && state.lives < 3) {
      state.lives++;
      updateHearts();
      playTone(880, 0.1, 0.2, 'sine');
    }
    
    // Super Armadura: ganhar escudo ao destruir tanque
    if (hasAugment('superArmadura') && state.shields < 3) {
      state.shields++;
      updateShields();
      playTone(720, 0.1, 0.2, 'triangle');
    }
    
    updateScoreboard();
    playTone(tank.isBoss ? 80 : 720, 0.2, 0.3, 'sawtooth');
  } else {
    // Som de hit se não morreu
    playTone(400, 0.08, 0.15, 'square');
  }
}

function handleProjectileCollision(projectile) {
  // Pele Cristalina: reflexão automática quando ativa
  if (state.peleCristalinaActive) {
    for (const segment of state.snake) {
      const dx = projectile.x - (segment.x + 0.5);
      const dy = projectile.y - (segment.y + 0.5);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 0.6) {
        projectile.returning = true;
        projectile.speed = REFLECT_SPEED;
        projectile.magnitude = projectile.speed;
        
        const doubleDamageStacks = getAugmentStacks('doubleDamage');
        projectile.damage = 1 + doubleDamageStacks;
        
        if (hasAugment('espelhoInfinito')) {
          projectile.bounces = projectile.bounces || 0;
          projectile.maxBounces = 3;
        }
        
        playTone(1200, 0.1, 0.2, 'sine');
        return false;
      }
    }
  }
  
  // SuperCobra: aura automática reflete tudo
  if (state.superCobraActive) {
    for (const segment of state.snake) {
      const dx = projectile.x - (segment.x + 0.5);
      const dy = projectile.y - (segment.y + 0.5);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Aura ao redor da cobra (1.5 células)
      if (distance < 1.5) {
        projectile.returning = true;
        projectile.speed = REFLECT_SPEED * 2; // 200% velocidade
        projectile.magnitude = projectile.speed;
        projectile.damage = (projectile.damage || 1) * 2; // 200% dano
        playTone(1400, 0.1, 0.3, 'sawtooth');
        return false;
      }
    }
  }
  
  for (const segment of state.snake) {
    const dx = projectile.x - (segment.x + 0.5);
    const dy = projectile.y - (segment.y + 0.5);
    if (Math.abs(dx) < 0.45 && Math.abs(dy) < 0.45) {
      // Camaleão: reflete qualquer cor
      const correctColor = state.currentColorKey === projectile.color;
      const camaleaoReflect = state.camaleaoActive;
      const canReflect = correctColor || camaleaoReflect;
      
      if (canReflect) {
        projectile.returning = true;
        projectile.speed = REFLECT_SPEED;
        projectile.magnitude = projectile.speed;
        
        // Aplicar Double Damage
        const doubleDamageStacks = getAugmentStacks('doubleDamage');
        projectile.damage = 1 + doubleDamageStacks;
        
        // Espelho Infinito: marcar bounces
        if (hasAugment('espelhoInfinito')) {
          projectile.bounces = projectile.bounces || 0;
          projectile.maxBounces = 3;
        }
        
        playTone(980, 0.15, 0.25, 'triangle');
        state.ability.activeColor = null;
        state.currentColor = DEFAULT_COLOR;
        state.currentColorKey = 'default';
        state.ability.expiresAt = 0;
        state.ability.cooldowns[projectile.color] = performance.now();
        
        // Pele Cristalina: ativar modo prismático por 1s
        if (hasAugment('peleCristalina')) {
          state.peleCristalinaActive = true;
          state.peleCristalinaUntil = performance.now() + 1000;
        }
        
        return false;
      }
      
      // Invulnerabilidade: ignora dano mas não impede a necessidade de refletir
      if (state.invulnerable) {
        return true; // Remove projétil sem causar dano
      }
      
      loseLife('Você tomou um disparo!');
      return true;
    }
  }
  return false;
}

function updateProjectiles(delta) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i];
    
    // Midas: converter projéteis não-refletidos em orbes que vão até a cobra
    if (state.midasActive && !projectile.returning && !projectile.midasConverted) {
      projectile.midasConverted = true;
      // Criar orbe na posição do projétil
      const newOrb = {
        x: projectile.x,
        y: projectile.y,
        speed: 0.035, // velocidade mais rápida
        points: 2, // dobro de pontos
        color: projectile.color, // armazenar cor do projétil original
        tankId: projectile.tankId // armazenar ID do tanque que disparou
      };
      state.orbs.push(newOrb);
      state.projectiles.splice(i, 1);
      playTone(800, 0.1, 0.2, 'sine');
      continue;
    }
    
    if (projectile.returning) {
      const tank = state.tanks.find(t => t.id === projectile.tankId);
      if (tank && tank.alive) {
        const targetX = tank.x + 0.5;
        const targetY = tank.y + 0.5;
        const angle = Math.atan2(targetY - projectile.y, targetX - projectile.x);
        projectile.vx = Math.cos(angle) * projectile.speed;
        projectile.vy = Math.sin(angle) * projectile.speed;
      } else {
        state.projectiles.splice(i, 1);
        continue;
      }
    }
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;

    if (!projectile.returning) {
      const shouldRemove = handleProjectileCollision(projectile);
      if (shouldRemove) {
        state.projectiles.splice(i, 1);
        continue;
      }
    } else {
      const tank = state.tanks.find(t => t.id === projectile.tankId);
      if (tank && tank.alive) {
        const dx = projectile.x - (tank.x + 0.5);
        const dy = projectile.y - (tank.y + 0.5);
        if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) {
          const damage = projectile.damage || 1;
          destroyTank(tank.id, damage);
          
          // Espelho Infinito: buscar próximo tanque
          if (projectile.maxBounces && projectile.bounces < projectile.maxBounces) {
            projectile.bounces++;
            const nextTank = state.tanks.find(t => t.alive && t.id !== tank.id);
            if (nextTank) {
              projectile.tankId = nextTank.id;
              continue; // Não remover, continua buscando
            }
          }
          
          state.projectiles.splice(i, 1);
          continue;
        }
      } else {
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    const outOfBounds =
      projectile.x < -3 ||
      projectile.x > cols + 3 ||
      projectile.y < -3 ||
      projectile.y > rows + 3;
    if (outOfBounds) {
      state.projectiles.splice(i, 1);
    }
  }
}

function updateOrbs(delta) {
  const hasVacuum = hasAugment('vacuum');
  
  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const orb = state.orbs[i];
    
    // Mover orbe em direção à cabeça da cobra
    if (state.snake.length > 0) {
      const head = state.snake[0];
      const targetX = head.x + 0.5;
      const targetY = head.y + 0.5;
      
      const dx = targetX - orb.x;
      const dy = targetY - orb.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Vacuum: coletar quando está a ~2 casas de distância
      const collectDistance = hasVacuum ? 2.0 : 0.5;
      
      if (distance < collectDistance) {
        // Incrementar contador de orbes
        state.orbsCollected++;
        
        // Cobra coletou a orbe - pontos base + 10 por cada orbe já coletada
        const bonusPerOrb = state.orbsCollected * 10;
        const basePoints = (50 + bonusPerOrb) * state.combo * orb.points;
        
        console.log(`💰 Orbe coletada #${state.orbsCollected}: Base=50 + Bonus=${bonusPerOrb} = ${50 + bonusPerOrb} x Combo=${state.combo} x Multiplier=${orb.points} = ${basePoints} pts`);
        
        const nutricaoStacks = getAugmentStacks('nutricao');
        let finalPoints = basePoints;
        if (nutricaoStacks > 0) {
          finalPoints *= (1 + nutricaoStacks * 0.5);
        }
        
        state.score += Math.floor(finalPoints);
        addXP(Math.floor(finalPoints));
        
        // Criar projétil refletido automaticamente de volta ao tanque
        const tank = state.tanks.find(t => t.id === orb.tankId && t.alive);
        if (tank) {
          // Calcular dano com augmentos
          const doubleDamageStacks = getAugmentStacks('doubleDamage');
          const damage = 1 + doubleDamageStacks;
          
          // Criar projétil refletido na posição da cobra
          const reflectedProjectile = {
            x: head.x + 0.5,
            y: head.y + 0.5,
            vx: 0,
            vy: 0,
            speed: REFLECT_SPEED,
            magnitude: REFLECT_SPEED,
            color: orb.color,
            returning: true,
            tankId: orb.tankId,
            damage: damage
          };
          
          // Espelho Infinito: marcar bounces se tiver o augmento
          if (hasAugment('espelhoInfinito')) {
            reflectedProjectile.bounces = 0;
            reflectedProjectile.maxBounces = 3;
          }
          
          state.projectiles.push(reflectedProjectile);
          playTone(980, 0.15, 0.25, 'triangle'); // Som de reflexão
        }
        
        playTone(900, 0.08, 0.2, 'sine'); // Tom diferente para orbes
        
        state.orbs.splice(i, 1);
        updateScoreboard();
      } else {
        // Mover orbe em direção à cobra
        const angle = Math.atan2(dy, dx);
        
        // Vacuum: aumenta velocidade drasticamente quando próximo
        let speed = orb.speed;
        if (hasVacuum && distance < 4) {
          speed *= 10; // 10x velocidade quando perto (~4 células)
        }
        
        orb.x += Math.cos(angle) * speed * delta;
        orb.y += Math.sin(angle) * speed * delta;
      }
    }
    
    // Remover orbes que saíram muito da tela
    const outOfBounds = orb.x < -5 || orb.x > cols + 5 || orb.y < -5 || orb.y > rows + 5;
    if (outOfBounds) {
      state.orbs.splice(i, 1);
    }
  }
}

function updateRenderSnake(delta) {
  const targetLength = state.snake.length;
  if (state.renderSnake.length < targetLength) {
    const sourceTail = state.renderSnake[state.renderSnake.length - 1] || state.snake[state.snake.length - 1] || { x: 0, y: 0 };
    while (state.renderSnake.length < targetLength) {
      state.renderSnake.push({ x: sourceTail.x, y: sourceTail.y });
    }
  } else if (state.renderSnake.length > targetLength) {
    state.renderSnake.length = targetLength;
  }
  if (!targetLength) return;
  const smoothing = Math.min(1, (delta / MOVE_INTERVAL) * 1.5);
  for (let i = 0; i < targetLength; i++) {
    const renderSeg = state.renderSnake[i];
    const targetSeg = state.snake[i];
    renderSeg.x += (targetSeg.x - renderSeg.x) * smoothing;
    renderSeg.y += (targetSeg.y - renderSeg.y) * smoothing;
  }
}

function updateExplosions(delta) {
  state.explosions.forEach(explosion => {
    explosion.radius += delta * 0.02;
    explosion.alpha -= delta * 0.0015;
  });
  state.explosions = state.explosions.filter(exp => exp.alpha > 0);
}

function updateTongue(now) {
  if (state.tongue.visible) {
    if (now >= state.tongue.hideAt) {
      state.tongue.visible = false;
      state.tongue.nextToggle = now + 800 + Math.random() * 2000;
    }
  } else if (now >= state.tongue.nextToggle) {
    state.tongue.visible = true;
    state.tongue.hideAt = now + 160 + Math.random() * 260;
  }
}

function toggleUserPause(forceValue) {
  if (state.isGameOver) return;
  if (typeof forceValue === 'boolean') {
    state.paused.user = forceValue;
  } else {
    state.paused.user = !state.paused.user;
  }
  updatePauseState();
}

function setGuidePause(value) {
  state.paused.guide = value;
  updatePauseState();
}

function updatePauseState() {
  const shouldPause = state.paused.user || state.paused.guide;
  const changed = shouldPause !== state.isPaused;
  const now = performance.now();
  
  if (changed && shouldPause) {
    // Pausando: salvar timestamp
    state.pauseStartTime = now;
  } else if (changed && !shouldPause) {
    // Despausando: acumular tempo pausado e ajustar timers
    if (state.pauseStartTime > 0) {
      const pauseDuration = now - state.pauseStartTime;
      state.pauseTimeAccumulated += pauseDuration;
      
      // Ajustar todos os timers afetados
      state.nextTankAt += pauseDuration;
      state.nextBossAt += pauseDuration;
      state.gameStartTime += pauseDuration;
      state.ability.expiresAt += pauseDuration;
      state.ability.cooldowns.blue += pauseDuration;
      state.ability.cooldowns.green += pauseDuration;
      state.ability.cooldowns.red += pauseDuration;
      state.powerCooldown += pauseDuration;
      state.invulnerableUntil += pauseDuration;
      state.autoInvulnTimer += pauseDuration;
      state.tongue.nextToggle += pauseDuration;
      state.tongue.hideAt += pauseDuration;
      state.midasUntil += pauseDuration;
      state.superCobraUntil += pauseDuration;
      state.camaleaoUntil += pauseDuration;
      
      // Ajustar timers dos tanques
      state.tanks.forEach(tank => {
        tank.nextShotAt += pauseDuration;
        if (tank.destroyedAt > 0) {
          tank.destroyedAt += pauseDuration;
        }
      });
      
      state.pauseStartTime = 0;
    }
    state.lastUpdate = null;
    state.moveAccumulator = 0;
    state.renderSnake = state.snake.map(seg => ({ ...seg }));
  }
  
  state.isPaused = shouldPause;
  if (pauseBtn) {
    pauseBtn.setAttribute('aria-pressed', state.paused.user ? 'true' : 'false');
    pauseBtn.textContent = shouldPause ? '▶ Retomar' : '⏸ Pausar';
  }
}

function updateTanks(now) {
  state.tanks = state.tanks.filter(tank => {
    if (tank.alive) {
      while (now >= tank.nextShotAt) {
        spawnProjectile(tank);
        tank.nextShotAt += TANK_FIRE_INTERVAL;
      }
      return true;
    }
    return false;
  });
}

function updateFoodVacuum(delta) {
  if (!state.food) return;
  if (!hasAugment('vacuum')) return;
  if (state.snake.length === 0) return;
  
  const head = state.snake[0];
  const dx = head.x - state.food.x;
  const dy = head.y - state.food.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Vacuum: mover comida quando está a menos de 3 células de distância
  if (distance < 3) {
    // Se está muito próximo, forçar coleta movendo para posição exata da cabeça
    if (distance < 1.5) {
      state.food.x = head.x;
      state.food.y = head.y;
      if (state.food.floatX !== undefined) {
        delete state.food.floatX;
        delete state.food.floatY;
      }
    } else {
      // Mover comida em direção à cobra
      const speed = 0.025 * delta; // velocidade de sucção
      const angle = Math.atan2(dy, dx);
      
      // Atualizar posição da comida (com decimais)
      if (!state.food.floatX) {
        state.food.floatX = state.food.x;
        state.food.floatY = state.food.y;
      }
      
      state.food.floatX += Math.cos(angle) * speed;
      state.food.floatY += Math.sin(angle) * speed;
      
      // Arredondar para grid
      state.food.x = Math.round(state.food.floatX);
      state.food.y = Math.round(state.food.floatY);
    }
  }
}

function update(delta) {
  if (state.isGameOver) return;
  if (state.isPaused) return;
  const now = performance.now();
  
  // Atualizar vacuum da comida
  updateFoodVacuum(delta);
  
  // Atualizar invulnerabilidade temporária
  if (state.invulnerable && now >= state.invulnerableUntil) {
    state.invulnerable = false;
  }
  
  // Camaleão Automático
  if (hasAugment('camaleaoAuto') && now >= state.autoInvulnTimer) {
    state.invulnerable = true;
    state.invulnerableUntil = now + 2000;
    state.autoInvulnTimer = now + 8000;
    playTone(1100, 0.2, 0.25, 'sine');
  }
  
  // Anjo Guardião: dar escudo a cada 5 segundos
  if (hasAugment('anjoGuardiao')) {
    const anjoAug = state.augments.find(a => a.id === 'anjoGuardiao');
    if (anjoAug) {
      const timeSinceLastActivation = now - (anjoAug.lastActivation || 0);
      if (timeSinceLastActivation >= 5000 && state.shields < 3) {
        anjoAug.lastActivation = now;
        state.shields++;
        updateShields();
        playTone(1400, 0.15, 0.25, 'triangle');
      }
    }
  }
  
  // Disparo de Plasma Automático
  if (hasAugment('disparoPlasma') && now >= state.disparoPlasmaTimer) {
    fireDisparoPlasma();
    state.disparoPlasmaTimer = now + 10000;
  }
  
  // Midas: expirar
  if (state.midasActive && now >= state.midasUntil) {
    state.midasActive = false;
  }
  
  // SuperCobra: expirar
  if (state.superCobraActive && now >= state.superCobraUntil) {
    state.superCobraActive = false;
  }
  
  // Camaleão: expirar
  if (state.camaleaoActive && now >= state.camaleaoUntil) {
    state.camaleaoActive = false;
  }
  
  // Pele Cristalina: expirar
  if (state.peleCristalinaActive && now >= state.peleCristalinaUntil) {
    state.peleCristalinaActive = false;
  }
  
  updateAbilityState(now);
  updateCooldowns();

  if (state.lives <= 0) return;

  state.moveAccumulator += delta;
  while (state.moveAccumulator >= MOVE_INTERVAL && !state.isGameOver) {
    state.moveAccumulator -= MOVE_INTERVAL;
    stepSnake();
  }

  // Boss spawn (a cada 2 minutos)
  if (now >= state.nextBossAt) {
    spawnTank(true); // spawn boss
    state.nextBossAt = now + 120000; // próximo em 2 minutos
  }

  // Spawn normal de tanques com taxa dinâmica
  if (now >= state.nextTankAt) {
    spawnTank(false);
    const spawnRate = calculateSpawnRate();
    const baseInterval = 4000 + Math.random() * 4000;
    state.nextTankAt = now + (baseInterval * spawnRate);
  }

  updateProjectiles(delta);
  updateOrbs(delta);
  updateExplosions(delta);
  updateTanks(now);
  updateRenderSnake(delta);
  updateTongue(now);
}

function drawBackground() {
  ctx.fillStyle = '#08030e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(canvas.width, y * CELL_SIZE);
    ctx.stroke();
  }

  const arenaX = PLAYFIELD.minX * CELL_SIZE;
  const arenaY = PLAYFIELD.minY * CELL_SIZE;
  const arenaWidth = (PLAYFIELD.maxX - PLAYFIELD.minX + 1) * CELL_SIZE;
  const arenaHeight = (PLAYFIELD.maxY - PLAYFIELD.minY + 1) * CELL_SIZE;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.fillRect(arenaX, arenaY, arenaWidth, arenaHeight);
  ctx.strokeStyle = 'rgba(255, 210, 77, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(arenaX - 2, arenaY - 2, arenaWidth + 4, arenaHeight + 4);
}

function drawFood() {
  if (!state.food) return;
  const pad = 4;
  const x = state.food.x * CELL_SIZE;
  const y = state.food.y * CELL_SIZE;
  const size = CELL_SIZE - pad * 2;
  const gradient = ctx.createRadialGradient(
    x + CELL_SIZE / 2,
    y + CELL_SIZE / 2,
    4,
    x + CELL_SIZE / 2,
    y + CELL_SIZE / 2,
    CELL_SIZE / 2
  );
  gradient.addColorStop(0, '#fff8e1');
  gradient.addColorStop(0.4, '#ffd24d');
  gradient.addColorStop(1, '#c77800');
  ctx.fillStyle = gradient;
  drawRoundedRect(x + pad, y + pad, size, size, 6);
  ctx.fill();
}

function drawOrbs() {
  for (const orb of state.orbs) {
    const x = orb.x * CELL_SIZE;
    const y = orb.y * CELL_SIZE;
    const radius = CELL_SIZE / 2.5;
    
    // Brilho externo pulsante
    const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7;
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, ' + (pulse * 0.6) + ')');
    glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, ' + (pulse * 0.3) + ')');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Orbe dourada
    const orbGradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    orbGradient.addColorStop(0, '#fffacd');
    orbGradient.addColorStop(0.3, '#ffd700');
    orbGradient.addColorStop(0.7, '#ffb700');
    orbGradient.addColorStop(1, '#ff8c00');
    ctx.fillStyle = orbGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Borda brilhante
    ctx.strokeStyle = '#fff9e0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawSnake() {
  const segments = state.renderSnake.length ? state.renderSnake : state.snake;
  if (!segments.length) return;

  // SuperCobra: desenhar aura
  if (state.superCobraActive) {
    drawSuperCobraAura(segments[0]);
  }

  // Pele Cristalina: efeito prismático
  if (state.peleCristalinaActive) {
    drawPeleCristalinaEffect(segments);
  }
  
  drawSnakeBody(segments);
  drawSnakeHead(segments[0], segments[1]);
  
  // Invulnerabilidade: efeito de brilho
  if (state.invulnerable) {
    drawInvulnerableEffect(segments);
  }
}

function drawSuperCobraAura(head) {
  const hx = head.x * CELL_SIZE + CELL_SIZE / 2;
  const hy = head.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = CELL_SIZE * 1.5;
  const time = performance.now() * 0.005;
  
  ctx.save();
  ctx.globalAlpha = 0.6;
  
  // Aura giratória
  for (let i = 0; i < 3; i++) {
    const angle = time + (i * Math.PI * 2 / 3);
    const x = hx + Math.cos(angle) * radius;
    const y = hy + Math.sin(angle) * radius;
    
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, 12);
    gradient.addColorStop(0, 'rgba(255, 210, 77, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 210, 77, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawInvulnerableEffect(segments) {
  const time = performance.now() * 0.01;
  const alpha = 0.3 + Math.sin(time) * 0.2;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  
  segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      const x = seg.x * CELL_SIZE + CELL_SIZE / 2;
      const y = seg.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(x, y, CELL_SIZE * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  
  ctx.restore();
}

function drawPeleCristalinaEffect(segments) {
  const time = performance.now() * 0.01;
  const colors = ['#40c4ff', '#32ffb3', '#ff4f6d']; // Azul, Verde, Vermelho
  
  ctx.save();
  
  segments.forEach((seg, i) => {
    const colorIndex = (i + Math.floor(time * 3)) % colors.length;
    const alpha = 0.4 + Math.sin(time + i * 0.5) * 0.2;
    
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colors[colorIndex];
    ctx.lineWidth = 4;
    
    const x = seg.x * CELL_SIZE + CELL_SIZE / 2;
    const y = seg.y * CELL_SIZE + CELL_SIZE / 2;
    
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  });
  
  ctx.restore();
}

function drawSnakeBody(segments) {
  const points = segments.map(seg => ({
    x: seg.x * CELL_SIZE + CELL_SIZE / 2,
    y: seg.y * CELL_SIZE + CELL_SIZE / 2
  }));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Camaleão: efeito arco-íris
  let snakeColor = state.currentColor;
  if (state.camaleaoActive) {
    const time = performance.now() * 0.003;
    const hue = (time * 60) % 360;
    snakeColor = `hsl(${hue}, 100%, 60%)`;
  }
  
  ctx.shadowBlur = 18;
  ctx.shadowColor = snakeColor;

  const thickness = CELL_SIZE - 6;
  ctx.strokeStyle = snakeColor;
  ctx.lineWidth = thickness;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = Math.max(4, thickness * 0.35);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.restore();
}

function drawSnakeHead(head, neck) {
  const hx = head.x * CELL_SIZE + CELL_SIZE / 2;
  const hy = head.y * CELL_SIZE + CELL_SIZE / 2;
  const reference = neck || { x: head.x - state.direction.x, y: head.y - state.direction.y };
  const nx = reference.x * CELL_SIZE + CELL_SIZE / 2;
  const ny = reference.y * CELL_SIZE + CELL_SIZE / 2;
  const angle = Math.atan2(ny - hy, nx - hx) + Math.PI;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);

  const headLength = CELL_SIZE * 1.1;
  const headWidth = CELL_SIZE * 0.85;

  ctx.fillStyle = state.currentColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, headLength * 0.55, headWidth * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.tongue.visible) {
    ctx.beginPath();
    ctx.moveTo(headLength * 0.45, 0);
    ctx.lineTo(headLength * 0.7, -headWidth * 0.1);
    ctx.lineTo(headLength * 0.7, headWidth * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ff5b6a';
    ctx.fill();
  }

  const eyeRadius = CELL_SIZE * 0.09;
  const eyeOffsetY = headWidth * 0.25;
  const eyeOffsetX = headLength * 0.05;
  ctx.fillStyle = '#0c0412';
  ctx.beginPath();
  ctx.arc(-eyeOffsetX, -eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTank(tank) {
  let color;
  
  // Boss: arco-íris animado
  if (tank.isBoss) {
    const time = performance.now() * 0.002;
    const hue = (time * 60) % 360;
    color = `hsl(${hue}, 80%, 60%)`;
  } else {
    color = abilityColors[tank.color];
  }
  
  const head = state.snake[0];
  const originX = (tank.x + 0.5) * CELL_SIZE;
  const originY = (tank.y + 0.5) * CELL_SIZE;
  const dx = (head.x + 0.5) - (tank.x + 0.5);
  const dy = (head.y + 0.5) - (tank.y + 0.5);
  const barrelAngle = Math.atan2(dy, dx);

  const scale = tank.isBoss ? 1.4 : 1.0; // Boss 40% maior
  const s = CELL_SIZE * scale;
  
  ctx.save();
  ctx.translate(originX, originY);
  // Corpo não rotaciona mais

  // Glow outline
  ctx.shadowBlur = tank.isBoss ? 20 : 12;
  ctx.shadowColor = color;

  // Treads (left/right) - estáticos
  ctx.fillStyle = 'rgba(15, 4, 24, 0.9)';
  drawRoundedRect(-0.7 * s, -0.38 * s, 1.4 * s, 0.24 * s, 6);
  ctx.fill();
  drawRoundedRect(-0.7 * s, 0.14 * s, 1.4 * s, 0.24 * s, 6);
  ctx.fill();

  // Hull (body) - estático
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0f0418';
  ctx.lineWidth = 3;
  drawRoundedRect(-0.6 * s, -0.35 * s, 1.2 * s, 0.7 * s, 10);
  ctx.fill();
  ctx.stroke();

  // Detail lines on treads - estáticos
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  for (let i = -0.6; i <= 0.6; i += 0.24) {
    ctx.beginPath();
    ctx.moveTo(i * s, -0.26 * s);
    ctx.lineTo(i * s, -0.14 * s);
    ctx.moveTo(i * s, 0.26 * s);
    ctx.lineTo(i * s, 0.14 * s);
    ctx.stroke();
  }

  // Turret e Barrel - APENAS ESTES rotacionam
  ctx.save();
  ctx.rotate(barrelAngle);
  ctx.shadowBlur = tank.isBoss ? 20 : 12;
  ctx.shadowColor = color;
  
  // Turret
  const turretRadius = 0.28 * s;
  ctx.beginPath();
  ctx.arc(0, 0, turretRadius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#0f0418';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Barrel
  ctx.fillStyle = color;
  const barrelLength = 0.9 * s;
  const barrelWidth = 0.18 * s;
  drawRoundedRect(turretRadius * 0.2, -barrelWidth / 2, barrelLength, barrelWidth, barrelWidth / 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.restore(); // Restaurar rotação do barrel

  ctx.restore(); // Restaurar posição do tanque
  
  // Barra de vida (sempre vermelha, acima do tanque) - sempre mostrar
  if (true) {
    const barWidth = CELL_SIZE * 1.2 * scale;
    const barHeight = 6;
    const barX = originX - barWidth / 2;
    const barY = originY - CELL_SIZE * 0.7 * scale;
    
    // Fundo da barra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Vida atual
    const healthPercent = tank.health / tank.maxHealth;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Borda
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}

function drawProjectile(projectile) {
  const color = abilityColors[projectile.color];
  const px = projectile.x * CELL_SIZE;
  const py = projectile.y * CELL_SIZE;
  const size = projectile.returning ? CELL_SIZE * 0.46 : CELL_SIZE * 0.36;

  // Trail
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = color;
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(px - projectile.vx * 120, py - projectile.vy * 120, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Core
  ctx.fillStyle = color;
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(px, py, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawExplosions() {
  state.explosions.forEach(exp => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, exp.alpha);
    const radius = exp.radius * CELL_SIZE;
    ctx.beginPath();
    ctx.arc(exp.x * CELL_SIZE, exp.y * CELL_SIZE, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlasmaBeam() {
  if (!state.plasmaBeam) return;
  
  const now = performance.now();
  const elapsed = now - state.plasmaBeam.startTime;
  
  if (elapsed > state.plasmaBeam.duration) {
    state.plasmaBeam = null;
    return;
  }
  
  const progress = elapsed / state.plasmaBeam.duration;
  const alpha = 1 - progress;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  
  // Raio prismático com múltiplas cores
  const colors = ['#40c4ff', '#32ffb3', '#ff4f6d', '#ffd24d', '#a855f7'];
  
  for (let i = 0; i < 5; i++) {
    const offset = i * 3;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 6 - i;
    ctx.shadowBlur = 20;
    ctx.shadowColor = colors[i];
    
    ctx.beginPath();
    ctx.moveTo(state.plasmaBeam.startX, state.plasmaBeam.startY);
    ctx.lineTo(state.plasmaBeam.endX + Math.sin(now * 0.01 + i) * offset, 
               state.plasmaBeam.endY + Math.cos(now * 0.01 + i) * offset);
    ctx.stroke();
  }
  
  ctx.restore();
}

function render() {
  drawBackground();
  drawFood();
  drawOrbs();
  state.tanks.forEach(drawTank);
  state.projectiles.forEach(drawProjectile);
  drawSnake();
  drawExplosions();
  drawPlasmaBeam();
}

const guideToggle = document.getElementById('guideToggle');
const guidePanel = document.getElementById('guidePanel');
if (guideToggle && guidePanel) {
  guideToggle.addEventListener('click', () => {
    const isOpen = guidePanel.classList.toggle('open');
    guideToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    setGuidePause(isOpen);
  });
}

if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    toggleUserPause();
  });
}

function loop(timestamp) {
  if (!state.lastUpdate) state.lastUpdate = timestamp;
  const delta = timestamp - state.lastUpdate;
  state.lastUpdate = timestamp;
  state.lastDelta = delta;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);

// ===== FIREBASE AUTH & RANKING =====
let currentUser = null;
const authModal = document.getElementById('authModal');
const gameShell = document.getElementById('gameShell');
const rankingModal = document.getElementById('rankingModal');
const userNameMini = document.getElementById('userNameMini');

// Auth Tab Switching
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  }
  
  clearAuthError();
}

function closeAuthModal() {
  authModal.style.display = 'none';
}

function showAuthError(message) {
  const errorEl = document.getElementById('authError');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function clearAuthError() {
  const errorEl = document.getElementById('authError');
  errorEl.textContent = '';
  errorEl.style.display = 'none';
}

// Login with Email
async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showAuthError('Por favor, preencha todos os campos');
    return;
  }
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    clearAuthError();
  } catch (error) {
    console.error('Erro no login:', error);
    showAuthError(getErrorMessage(error.code));
  }
}

// Register with Email
async function registerWithEmail() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  
  if (!username || !email || !password) {
    showAuthError('Por favor, preencha todos os campos');
    return;
  }
  
  if (username.length < 3) {
    showAuthError('Nome de usuário deve ter pelo menos 3 caracteres');
    return;
  }
  
  if (password.length < 6) {
    showAuthError('Senha deve ter pelo menos 6 caracteres');
    return;
  }
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: username });
    await database.ref('users/' + userCredential.user.uid).set({
      username: username,
      email: email,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    clearAuthError();
  } catch (error) {
    console.error('Erro no registro:', error);
    showAuthError(getErrorMessage(error.code));
  }
}

// Login with Google
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    
    // Salvar dados do usuário se for novo
    const userRef = database.ref('users/' + user.uid);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      await userRef.set({
        username: user.displayName || 'Jogador',
        email: user.email,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
    }
    
    clearAuthError();
  } catch (error) {
    console.error('Erro no login com Google:', error);
    showAuthError(getErrorMessage(error.code));
  }
}

// Login as Guest
function loginAsGuest() {
  try {
    // Criar usuário convidado local (sem Firebase)
    const guestUsername = `Convidado${Math.floor(Math.random() * 9999)}`;
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    currentUser = {
      uid: guestId,
      displayName: guestUsername,
      isAnonymous: true,
      isGuest: true
    };
    
    // Mostrar game, esconder modal
    authModal.style.display = 'none';
    gameShell.style.display = 'block';
    userNameMini.textContent = guestUsername;
    
    clearAuthError();
    console.log('✅ Convidado logado localmente:', guestUsername);
  } catch (error) {
    console.error('Erro no login como convidado:', error);
    showAuthError('Erro ao entrar como convidado. Tente novamente.');
  }
}

// Logout
async function logout() {
  try {
    await auth.signOut();
    location.reload();
  } catch (error) {
    console.error('Erro ao sair:', error);
  }
}

// Get Error Message
function getErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Email já está em uso',
    'auth/weak-password': 'Senha muito fraca',
    'auth/popup-closed-by-user': 'Popup fechado pelo usuário',
    'auth/cancelled-popup-request': 'Popup cancelado'
  };
  return messages[code] || 'Erro ao autenticar. Tente novamente.';
}

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    
    let username;
    
    // Guest user handling
    if (user.isAnonymous) {
      try {
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        username = userData?.username || 'Convidado';
      } catch (error) {
        console.log('⚠️ Erro ao buscar dados do convidado, usando padrão');
        username = 'Convidado';
      }
    } else {
      try {
        // Obter username do database
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        username = userData?.username || user.displayName || 'Jogador';
      } catch (error) {
        console.log('⚠️ Erro ao buscar dados do usuário, usando displayName');
        username = user.displayName || 'Jogador';
      }
    }
    
    // Mostrar game, esconder modal
    authModal.style.display = 'none';
    gameShell.style.display = 'block';
    userNameMini.textContent = username;
    
    console.log('✅ Usuário logado:', username);
  } else {
    currentUser = null;
    // Mostrar modal de auth, esconder game
    authModal.style.display = 'flex';
    gameShell.style.display = 'none';
    console.log('❌ Usuário não logado');
  }
});

// Save Score to Ranking
async function saveScoreToRanking(score) {
  if (!currentUser) {
    console.log('⚠️ Não foi possível salvar: usuário não logado');
    return;
  }
  
  // Don't save scores for anonymous/guest users
  if (currentUser.isAnonymous || currentUser.isGuest) {
    console.log('👤 Convidados não salvam scores no ranking');
    return;
  }
  
  console.log('📊 Tentando salvar score:', score, 'para usuário:', currentUser.uid);
  
  try {
    // Buscar username do usuário
    const userRef = database.ref('users/' + currentUser.uid);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    const username = userData?.username || currentUser.displayName || 'Jogador';
    
    console.log('👤 Username encontrado:', username);
    
    // Usar chave única por usuário (igual ao typing game)
    const rankingKey = currentUser.uid + '_snake';
    const rankingRef = database.ref('rankings/' + rankingKey);
    
    // Verificar se já existe recorde
    const existingSnapshot = await rankingRef.once('value');
    const existingData = existingSnapshot.val();
    
    // Se já existe e o novo score é menor ou igual, não salva
    if (existingData && existingData.score >= score) {
      console.log('⏸️ Score inferior ou igual ao recorde atual:', existingData.score, '>= novo:', score);
      return;
    }
    
    // Salvar novo recorde (ou substituir)
    const newRecord = {
      userId: currentUser.uid,
      username: username,
      photoURL: currentUser.photoURL || null,
      score: score,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    console.log('💾 Salvando novo recorde:', newRecord);
    
    await rankingRef.set(newRecord);
    
    console.log('✅ Recorde salvo com sucesso! Score:', score);
  } catch (error) {
    console.error('❌ Erro ao salvar score:', error);
    console.error('📋 Detalhes do erro:', error.message, error.code);
  }
}

// Toggle Ranking Modal
function toggleRanking() {
  const isHidden = rankingModal.classList.contains('hidden');
  
  if (isHidden) {
    // Abrir ranking e pausar o jogo
    rankingModal.classList.remove('hidden');
    updatePauseState();
    loadRanking();
  } else {
    // Fechar ranking e despausar o jogo
    rankingModal.classList.add('hidden');
    updatePauseState();
  }
}

// Load Ranking
async function loadRanking() {
  const rankingList = document.getElementById('rankingList');
  rankingList.innerHTML = '<div class="ranking-loading">Carregando ranking...</div>';
  
  try {
    // Buscar todos os recordes
    const rankingsRef = database.ref('rankings');
    const snapshot = await rankingsRef.once('value');
    
    const rankings = [];
    snapshot.forEach(childSnapshot => {
      const data = childSnapshot.val();
      // Apenas incluir recordes do snake (chaves que terminam com _snake)
      if (childSnapshot.key.endsWith('_snake') && data.score !== undefined) {
        rankings.push(data);
      }
    });
    
    // Ordenar por score decrescente
    rankings.sort((a, b) => b.score - a.score);
    
    if (rankings.length === 0) {
      rankingList.innerHTML = '<div class="ranking-empty">Nenhum score ainda. Seja o primeiro!</div>';
      return;
    }
    
    let html = '<div class="ranking-header-row"><div class="rank-col">#</div><div class="player-col">Jogador</div><div class="score-col">Score</div></div>';
    
    rankings.forEach((ranking, index) => {
      const rank = index + 1;
      const isCurrentUser = currentUser && ranking.userId === currentUser.uid;
      const rankClass = isCurrentUser ? 'ranking-row current-user' : 'ranking-row';
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      
      html += `
        <div class="${rankClass}">
          <div class="rank-col">${medal}</div>
          <div class="player-col">${ranking.username}</div>
          <div class="score-col">${ranking.score.toLocaleString()}</div>
        </div>
      `;
    });
    
    rankingList.innerHTML = html;
  } catch (error) {
    console.error('❌ Erro ao carregar ranking:', error);
    rankingList.innerHTML = '<div class="ranking-error">Sem conexão. Ranking indisponível.</div>';
  }
}

// Modify triggerGameOver to save score
const originalTriggerGameOver = triggerGameOver;
triggerGameOver = function(reason) {
  // Salvar score no ranking
  if (state.score > 0) {
    saveScoreToRanking(state.score);
  }
  
  // Chamar função original
  originalTriggerGameOver(reason);
};
