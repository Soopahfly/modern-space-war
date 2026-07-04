"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreNode = document.getElementById("scoreboard");
const stateNode = document.getElementById("roundState");
const dialog = document.getElementById("setupDialog");
const playerCount = document.getElementById("playerCount");
const playerCountOut = document.getElementById("playerCountOut");
const gravity = document.getElementById("gravity");
const gravityOut = document.getElementById("gravityOut");
const scoreLimit = document.getElementById("scoreLimit");
const pauseButton = document.getElementById("pauseButton");
const gameMode = document.getElementById("gameMode");
const orbitMode = document.getElementById("orbitMode");
const fuelMode = document.getElementById("fuelMode");
const debrisMode = document.getElementById("debrisMode");
const moonMode = document.getElementById("moonMode");
const cometMode = document.getElementById("cometMode");
const variantMode = document.getElementById("variantMode");
const controlEditor = document.getElementById("controlEditor");
const gamepadEditor = document.getElementById("gamepadEditor");
const gamepadStatus = document.getElementById("gamepadStatus");
const mouseEditor = document.getElementById("mouseEditor");
const resetControls = document.getElementById("resetControls");

const TAU = Math.PI * 2;
const WORLD = { w: 1280, h: 800 };
const STAR = { x: WORLD.w / 2, y: WORLD.h / 2, radius: 34, gravity: 90000 };
const KING_RING = { inner: 86, outer: 170 };
const keys = new Set();

const actions = [
  { id: "left", label: "LEFT" },
  { id: "right", label: "RIGHT" },
  { id: "thrust", label: "THRUST" },
  { id: "fire", label: "FIRE" }
];

const defaultControlSets = [
  { left: "KeyA", right: "KeyD", thrust: "KeyW", fire: "KeyS" },
  { left: "KeyJ", right: "KeyL", thrust: "KeyI", fire: "KeyK" },
  { left: "KeyF", right: "KeyH", thrust: "KeyT", fire: "KeyG" },
  { left: "ArrowLeft", right: "ArrowRight", thrust: "ArrowUp", fire: "ArrowDown" },
  { left: "Numpad4", right: "Numpad6", thrust: "Numpad8", fire: "Numpad5" },
  { left: "KeyV", right: "KeyN", thrust: "KeyY", fire: "KeyB" }
];

let controlSets = cloneControlSets(defaultControlSets);

const hulls = [
  [[14, 0], [-12, -9], [-7, 0], [-12, 9]],
  [[13, 0], [-10, -11], [-3, 0], [-10, 11]],
  [[15, 0], [-12, -7], [-12, 7]],
  [[13, 0], [-8, -12], [-12, 0], [-8, 12]],
  [[15, 0], [-6, -10], [-12, -4], [-12, 4], [-6, 10]],
  [[13, 0], [-7, -8], [-13, -11], [-8, 0], [-13, 11], [-7, 8]]
];

const variantTraits = [
  { label: "FAST", turn: 1.12, thrust: 1.14, shot: 0.95, cool: 1.05, fuel: 0.92 },
  { label: "GUN", turn: 0.94, thrust: 0.96, shot: 1.18, cool: 0.82, fuel: 1 },
  { label: "TANK", turn: 0.82, thrust: 0.9, shot: 1, cool: 1.08, fuel: 1.28 },
  { label: "DRIFT", turn: 1.02, thrust: 0.84, shot: 1, cool: 1, fuel: 1.5 },
  { label: "SNAP", turn: 1.25, thrust: 0.94, shot: 0.9, cool: 0.92, fuel: 0.9 },
  { label: "LONG", turn: 0.9, thrust: 1, shot: 1.28, cool: 1.2, fuel: 1.05 }
];

let players = [];
let shots = [];
let sparks = [];
let stars = [];
let debris = [];
let moons = [];
let comet = null;
let lastTime = performance.now();
let paused = false;
let started = false;
let betweenRounds = true;
let roundTimer = 0;
let targetScore = 7;
let options = {};
let teamScores = [0, 0];
let roundScored = false;
let cometTimer = 6;
let pendingBind = null;
let pendingPadBind = null;
let playerPads = Array(6).fill(null);
let mousePlayer = null;
let mouseTurn = 0;
let mouseButtons = 0;

function cloneControlSets(sets) {
  return sets.map((set) => ({ ...set }));
}

function seededStars() {
  let seed = 19462;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  stars = Array.from({ length: 170 }, () => ({
    x: next() * WORLD.w,
    y: next() * WORLD.h,
    r: next() > 0.86 ? 1.25 : 0.7,
    a: 0.25 + next() * 0.7
  }));
}

function readOptions() {
  return {
    mode: gameMode.value,
    orbit: orbitMode.value,
    fuel: fuelMode.checked,
    debris: debrisMode.checked,
    moons: moonMode.checked,
    comet: cometMode.checked,
    variants: variantMode.checked
  };
}

function resetMatch() {
  const count = Number(playerCount.value);
  options = readOptions();
  targetScore = clamp(Number(scoreLimit.value) || 7, 1, 25);
  STAR.gravity = Number(gravity.value) * 1450;
  teamScores = [0, 0];
  players = Array.from({ length: count }, (_, i) => makePlayer(i, count));
  shots = [];
  sparks = [];
  debris = [];
  comet = null;
  cometTimer = 4;
  setupMoons();
  started = true;
  betweenRounds = false;
  roundScored = false;
  roundTimer = 0;
  paused = false;
  pauseButton.textContent = "II";
  renderScores();
  if (mousePlayer !== null && canvas.requestPointerLock) canvas.requestPointerLock();
}

function makePlayer(index, count) {
  const trait = options.variants ? variantTraits[index] : { label: "", turn: 1, thrust: 1, shot: 1, cool: 1, fuel: 1 };
  return {
    id: index,
    name: `P${index + 1}`,
    team: index % 2,
    score: 0,
    alive: true,
    cool: 0,
    kingTime: 0,
    invulnerable: 1.6,
    fuel: 100 * trait.fuel,
    maxFuel: 100 * trait.fuel,
    trait,
    ...spawnFor(index, count)
  };
}

function spawnRound() {
  const count = players.length;
  players.forEach((p, i) => {
    Object.assign(p, spawnFor(i, count), {
      alive: true,
      cool: 0,
      kingTime: 0,
      invulnerable: 1.6,
      fuel: p.maxFuel
    });
  });
  shots = [];
  debris = options.debris ? debris.slice(-12) : [];
  comet = null;
  cometTimer = 4 + Math.random() * 4;
  betweenRounds = false;
  roundScored = false;
  roundTimer = 0;
}

function spawnFor(index, count) {
  const angle = (index / count) * TAU - Math.PI / 2;
  const base = Math.min(WORLD.w, WORLD.h);
  const radiusMap = { close: 0.24, mid: 0.36, far: 0.46 };
  const mix = [0.24, 0.36, 0.46][index % 3];
  const radius = base * (options.orbit === "mixed" ? mix : radiusMap[options.orbit] || 0.36);
  return {
    x: STAR.x + Math.cos(angle) * radius,
    y: STAR.y + Math.sin(angle) * radius,
    vx: Math.sin(angle) * 28,
    vy: -Math.cos(angle) * 28,
    angle: angle + Math.PI
  };
}

function setupMoons() {
  moons = options.moons ? [
    { orbit: 235, phase: 0, speed: 0.34, radius: 13, gravity: 24000, x: 0, y: 0 },
    { orbit: 315, phase: Math.PI, speed: -0.22, radius: 10, gravity: 17000, x: 0, y: 0 }
  ] : [];
}

function renderScores() {
  if (options.mode === "teams") {
    scoreNode.innerHTML = [0, 1].map((team) =>
      `<div class="score"><span>T${team + 1}</span><strong>${teamScores[team]}</strong></div>`
    ).join("");
    return;
  }
  const leader = bountyTarget();
  scoreNode.innerHTML = players.map((p) => {
    const tag = options.mode === "bounty" && leader === p ? "*" : "";
    const fuel = options.fuel ? ` ${Math.ceil(p.fuel)}` : "";
    const team = options.mode === "teams" ? ` T${p.team + 1}` : "";
    const trait = options.variants ? ` ${p.trait.label}` : "";
    return `<div class="score"><span>${p.name}${team}${tag}${trait}</span><strong>${p.score}${fuel}</strong></div>`;
  }).join("");
}

function renderControlEditor() {
  const count = Number(playerCount.value);
  controlEditor.innerHTML = "";
  for (let player = 0; player < count; player++) {
    const row = document.createElement("div");
    row.className = "control-row";
    const name = document.createElement("span");
    name.textContent = `P${player + 1}`;
    row.append(name);
    for (const action of actions) {
      const button = document.createElement("button");
      button.className = "bind-button";
      button.type = "button";
      button.dataset.player = String(player);
      button.dataset.action = action.id;
      button.title = `${name.textContent} ${action.label}`;
      button.textContent = pendingBind && pendingBind.player === player && pendingBind.action === action.id
        ? "PRESS"
        : `${action.label} ${keyLabel(controlSets[player][action.id])}`;
      if (button.textContent === "PRESS") button.classList.add("waiting");
      row.append(button);
    }
    controlEditor.append(row);
  }
}

function keyLabel(code) {
  if (!code) return "---";
  const labels = {
    ArrowLeft: "LEFT",
    ArrowRight: "RIGHT",
    ArrowUp: "UP",
    ArrowDown: "DOWN",
    Space: "SPACE",
    Enter: "ENTER",
    Escape: "ESC"
  };
  if (labels[code]) return labels[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `N${code.slice(6)}`;
  return code.replace(/^(Shift|Control|Alt)/, "");
}

function setControlBinding(player, action, code) {
  for (const set of controlSets) {
    for (const candidate of actions) {
      if (set[candidate.id] === code) set[candidate.id] = "";
    }
  }
  controlSets[player][action] = code;
  keys.delete(code);
  pendingBind = null;
  renderControlEditor();
}

function renderGamepadEditor() {
  const count = Number(playerCount.value);
  gamepadEditor.innerHTML = "";
  for (let player = 0; player < count; player++) {
    const button = document.createElement("button");
    button.className = "pad-button";
    button.type = "button";
    button.dataset.player = String(player);
    const assigned = playerPads[player];
    button.textContent = pendingPadBind === player
      ? `P${player + 1} PRESS PAD`
      : `P${player + 1} PAD ${assigned === null ? "---" : assigned + 1}`;
    if (pendingPadBind === player) button.classList.add("waiting");
    gamepadEditor.append(button);
  }
  renderGamepadStatus();
}

function renderGamepadStatus() {
  const pads = connectedGamepads();
  if (!pads.length) {
    gamepadStatus.textContent = "No gamepads detected";
    return;
  }
  gamepadStatus.textContent = pads.map((pad) => `PAD ${pad.index + 1}: ${cleanPadName(pad.id)}`).join(" / ");
}

function cleanPadName(id) {
  return id.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().slice(0, 32);
}

function connectedGamepads() {
  if (!navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads()).filter(Boolean);
}

function readPadInput(player, action) {
  const index = playerPads[player];
  if (index === null || !navigator.getGamepads) return false;
  const pad = navigator.getGamepads()[index];
  if (!pad) return false;
  const x = axis(pad, 0);
  if (action === "left") return x < -0.35 || button(pad, 14);
  if (action === "right") return x > 0.35 || button(pad, 15);
  if (action === "thrust") return button(pad, 0) || button(pad, 6) || button(pad, 7) || axis(pad, 1) < -0.65 || button(pad, 12);
  if (action === "fire") return button(pad, 1) || button(pad, 2) || button(pad, 5) || button(pad, 13);
  return false;
}

function actionActive(player, action) {
  const controls = controlSets[player];
  return keys.has(controls[action]) || readPadInput(player, action) || readMouseInput(player, action);
}

function axis(pad, index) {
  const value = pad.axes[index] || 0;
  return Math.abs(value) < 0.18 ? 0 : value;
}

function button(pad, index) {
  const control = pad.buttons[index];
  return Boolean(control && control.pressed);
}

function findActiveGamepad() {
  for (const pad of connectedGamepads()) {
    const moved = pad.axes.some((value) => Math.abs(value) > 0.65);
    const pressed = pad.buttons.some((item) => item.pressed);
    if (moved || pressed) return pad.index;
  }
  return null;
}

function processGamepadAssignment() {
  if (pendingPadBind === null) return;
  const index = findActiveGamepad();
  if (index === null) return;
  playerPads = playerPads.map((value) => value === index ? null : value);
  playerPads[pendingPadBind] = index;
  pendingPadBind = null;
  renderGamepadEditor();
}

function renderMouseEditor() {
  const count = Number(playerCount.value);
  mouseEditor.innerHTML = "";
  for (let player = 0; player < count; player++) {
    const button = document.createElement("button");
    button.className = "mouse-button";
    button.type = "button";
    button.dataset.player = String(player);
    button.textContent = mousePlayer === player ? `P${player + 1} MOUSE ON` : `P${player + 1} MOUSE ---`;
    mouseEditor.append(button);
  }
}

function readMouseInput(player, action) {
  if (mousePlayer !== player || document.pointerLockElement !== canvas) return false;
  if (action === "thrust") return Boolean(mouseButtons & 1);
  if (action === "fire") return Boolean(mouseButtons & 2);
  return false;
}

function update(dt) {
  if (!started) {
    stateNode.textContent = "READY";
    return;
  }
  if (paused) {
    stateNode.textContent = "PAUSED";
    return;
  }
  if (betweenRounds) {
    roundTimer -= dt;
    if (roundTimer <= 0) spawnRound();
    stateNode.textContent = "READY";
    return;
  }

  stateNode.textContent = modeLabel();
  updateMoons(dt);
  updateComet(dt);
  for (const p of players) updatePlayer(p, dt);
  mouseTurn = 0;
  updateShots(dt);
  updateDebris(dt);
  updateSparks(dt);
  resolveShipCollisions();
  checkRoundEnd();
  if (options.fuel || options.mode === "king" || options.mode === "bounty") renderScores();
}

function modeLabel() {
  if (options.mode === "teams") return "TEAMS";
  if (options.mode === "bounty") return "BOUNTY";
  if (options.mode === "king") return "KING";
  return "LIVE";
}

function updatePlayer(p, dt) {
  if (!p.alive) return;
  if (mousePlayer === p.id && document.pointerLockElement === canvas) {
    p.angle += mouseTurn * 0.014 * p.trait.turn;
  }
  if (actionActive(p.id, "left")) p.angle -= 4.25 * p.trait.turn * dt;
  if (actionActive(p.id, "right")) p.angle += 4.25 * p.trait.turn * dt;
  if (actionActive(p.id, "thrust") && (!options.fuel || p.fuel > 0)) {
    p.vx += Math.cos(p.angle) * 235 * p.trait.thrust * dt;
    p.vy += Math.sin(p.angle) * 235 * p.trait.thrust * dt;
    p.fuel = Math.max(0, p.fuel - 18 * dt);
    makeThrust(p);
  }
  if (actionActive(p.id, "fire") && p.cool <= 0) fire(p);
  p.cool = Math.max(0, p.cool - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  applyGravityBodies(p, dt);
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 0.999;
  p.vy *= 0.999;
  wrap(p);
  if (distance(p, STAR) < STAR.radius + 8 && p.invulnerable <= 0) destroyShip(p);
  if (options.mode === "king") updateKingScore(p, dt);
  if (comet && distance(p, comet) < comet.radius + 8 && p.invulnerable <= 0) destroyShip(p);
}

function updateKingScore(p, dt) {
  const d = distance(p, STAR);
  if (d >= KING_RING.inner && d <= KING_RING.outer) {
    p.kingTime += dt;
    if (p.kingTime >= 3) {
      p.kingTime -= 3;
      addScore(p.id, 1);
    }
  }
}

function applyGravityBodies(body, dt) {
  applyBodyGravity(body, STAR.x, STAR.y, STAR.gravity, dt);
  for (const m of moons) applyBodyGravity(body, m.x, m.y, m.gravity, dt);
}

function applyBodyGravity(body, x, y, gravityStrength, dt) {
  const dx = x - body.x;
  const dy = y - body.y;
  const d2 = Math.max(dx * dx + dy * dy, 1600);
  const d = Math.sqrt(d2);
  const pull = gravityStrength / d2;
  body.vx += (dx / d) * pull * dt;
  body.vy += (dy / d) * pull * dt;
}

function updateMoons(dt) {
  for (const m of moons) {
    m.phase += m.speed * dt;
    m.x = STAR.x + Math.cos(m.phase) * m.orbit;
    m.y = STAR.y + Math.sin(m.phase) * m.orbit;
  }
}

function updateComet(dt) {
  if (!options.comet) return;
  if (!comet) {
    cometTimer -= dt;
    if (cometTimer <= 0) {
      const side = Math.floor(Math.random() * 4);
      const angle = Math.random() * TAU;
      const start = [
        { x: -60, y: Math.random() * WORLD.h },
        { x: WORLD.w + 60, y: Math.random() * WORLD.h },
        { x: Math.random() * WORLD.w, y: -60 },
        { x: Math.random() * WORLD.w, y: WORLD.h + 60 }
      ][side];
      comet = { ...start, vx: Math.cos(angle) * 210, vy: Math.sin(angle) * 210, radius: 18, life: 8 };
    }
    return;
  }
  comet.x += comet.vx * dt;
  comet.y += comet.vy * dt;
  comet.life -= dt;
  if (comet.life <= 0) {
    comet = null;
    cometTimer = 8 + Math.random() * 8;
  }
}

function updateShots(dt) {
  for (const s of shots) {
    applyGravityBodies(s, dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    wrap(s);
    if (distance(s, STAR) < STAR.radius) s.life = 0;
    for (const m of moons) if (distance(s, m) < m.radius) s.life = 0;
    for (const d of debris) if (distance(s, d) < d.radius) s.life = 0;
    for (const p of players) {
      if (!p.alive || p.id === s.owner || p.invulnerable > 0 || sameTeam(s.owner, p.id)) continue;
      if (distance(s, p) < 14) {
        s.life = 0;
        destroyShip(p, s.owner);
        break;
      }
    }
  }
  shots = shots.filter((s) => s.life > 0);
}

function updateDebris(dt) {
  for (const d of debris) {
    applyGravityBodies(d, dt);
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
    d.spin += d.spinRate * dt;
    wrap(d);
    if (distance(d, STAR) < STAR.radius) d.life = 0;
    for (const p of players) {
      if (!p.alive || p.invulnerable > 0) continue;
      if (distance(d, p) < d.radius + 8) {
        d.life = 0;
        destroyShip(p);
      }
    }
  }
  debris = debris.filter((d) => d.life > 0);
}

function updateSparks(dt) {
  for (const s of sparks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    wrap(s);
  }
  sparks = sparks.filter((s) => s.life > 0);
}

function resolveShipCollisions() {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (!a.alive || !b.alive || a.invulnerable > 0 || b.invulnerable > 0 || sameTeam(a.id, b.id)) continue;
      if (distance(a, b) < 22) {
        destroyShip(a);
        destroyShip(b);
      }
    }
  }
}

function checkRoundEnd() {
  const winnerText = matchWinnerText();
  if (winnerText) {
    stateNode.textContent = winnerText;
    betweenRounds = true;
    roundTimer = 999999;
    return;
  }
  const alive = players.filter((p) => p.alive);
  const teamsAlive = new Set(alive.map((p) => p.team));
  const roundOver = options.mode === "teams" ? teamsAlive.size <= 1 : alive.length <= 1;
  if (roundOver) {
    if (alive.length > 0 && !roundScored) addScore(alive[0].id, 1);
    renderScores();
    betweenRounds = true;
    roundTimer = 2.2;
  }
}

function matchWinnerText() {
  if (options.mode === "teams") {
    const team = teamScores.findIndex((score) => score >= targetScore);
    return team >= 0 ? `T${team + 1} WINS` : "";
  }
  const winner = players.find((p) => p.score >= targetScore);
  return winner ? `${winner.name} WINS` : "";
}

function fire(p) {
  const speed = 430 * p.trait.shot;
  shots.push({
    x: p.x + Math.cos(p.angle) * 18,
    y: p.y + Math.sin(p.angle) * 18,
    vx: p.vx + Math.cos(p.angle) * speed,
    vy: p.vy + Math.sin(p.angle) * speed,
    life: 1.85,
    owner: p.id
  });
  p.cool = 0.28 * p.trait.cool;
}

function destroyShip(p, scorerId = null) {
  if (!p.alive) return;
  p.alive = false;
  burst(p.x, p.y, 24);
  if (options.debris) makeDebris(p);
  if (scorerId !== null && players[scorerId]) {
    let points = 1;
    if (options.mode === "bounty" && bountyTarget() === p) points = 2;
    addScore(scorerId, points);
    roundScored = true;
  }
}

function addScore(playerId, points) {
  const player = players[playerId];
  if (!player) return;
  if (options.mode === "teams") teamScores[player.team] += points;
  else player.score += points;
  renderScores();
}

function bountyTarget() {
  if (!players.length) return null;
  const top = Math.max(...players.map((p) => p.score));
  return players.find((p) => p.score === top) || null;
}

function sameTeam(aId, bId) {
  return options.mode === "teams" && players[aId] && players[bId] && players[aId].team === players[bId].team;
}

function burst(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const v = 40 + Math.random() * 190;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.7 });
  }
}

function makeDebris(p) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * TAU;
    const v = 28 + Math.random() * 110;
    debris.push({
      x: p.x,
      y: p.y,
      vx: p.vx * 0.35 + Math.cos(a) * v,
      vy: p.vy * 0.35 + Math.sin(a) * v,
      radius: 5 + Math.random() * 5,
      spin: Math.random() * TAU,
      spinRate: -2 + Math.random() * 4,
      life: 7 + Math.random() * 5
    });
  }
}

function makeThrust(p) {
  if (Math.random() > 0.6) return;
  const a = p.angle + Math.PI + (Math.random() - 0.5) * 0.5;
  sparks.push({
    x: p.x - Math.cos(p.angle) * 12,
    y: p.y - Math.sin(p.angle) * 12,
    vx: p.vx * 0.2 + Math.cos(a) * (60 + Math.random() * 80),
    vy: p.vy * 0.2 + Math.sin(a) * (60 + Math.random() * 80),
    life: 0.16 + Math.random() * 0.18
  });
}

function draw() {
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  drawStars();
  if (options.mode === "king") drawKingRing();
  drawMoons();
  drawStar();
  drawComet();
  drawDebris();
  for (const s of shots) drawShot(s);
  for (const p of players) drawShip(p);
  drawSparks();
  if (betweenRounds && roundTimer > 900000) drawWinner();
}

function drawStars() {
  ctx.save();
  ctx.fillStyle = "#fff";
  for (const star of stars) {
    ctx.globalAlpha = star.a;
    ctx.fillRect(star.x, star.y, star.r, star.r);
  }
  ctx.restore();
}

function drawKingRing() {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(STAR.x, STAR.y, KING_RING.inner, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(STAR.x, STAR.y, KING_RING.outer, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawStar() {
  ctx.save();
  ctx.translate(STAR.x, STAR.y);
  ctx.strokeStyle = "#f7f7f7";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#fff";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r = i % 2 ? STAR.radius * 0.72 : STAR.radius * 1.16;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, STAR.radius * 0.43, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawMoons() {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  for (const m of moons) {
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.x - m.radius, m.y);
    ctx.lineTo(m.x + m.radius, m.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawComet() {
  if (!comet) return;
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#fff";
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, comet.radius, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(comet.x, comet.y);
  ctx.lineTo(comet.x - comet.vx * 0.22, comet.y - comet.vy * 0.22);
  ctx.stroke();
  ctx.restore();
}

function drawDebris() {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  for (const d of debris) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.8, d.life / 2);
    ctx.translate(d.x, d.y);
    ctx.rotate(d.spin);
    ctx.strokeRect(-d.radius, -d.radius * 0.5, d.radius * 2, d.radius);
    ctx.restore();
  }
  ctx.restore();
}

function drawShip(p) {
  if (!p.alive) return;
  const blink = p.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  if (blink) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#fff";
  ctx.beginPath();
  hulls[p.id].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.stroke();
  if (options.fuel) drawFuelGlyph(p);
  ctx.restore();
  drawShipLabel(p);
}

function drawFuelGlyph(p) {
  const width = 22 * (p.fuel / p.maxFuel);
  ctx.beginPath();
  ctx.moveTo(-11, 14);
  ctx.lineTo(-11 + width, 14);
  ctx.stroke();
}

function drawShipLabel(p) {
  const leader = options.mode === "bounty" && bountyTarget() === p;
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "13px Courier New, monospace";
  const team = options.mode === "teams" ? `T${p.team + 1} ` : "";
  const bounty = leader ? "*" : "";
  ctx.fillText(`${team}${p.name}${bounty}`, p.x + 16, p.y - 16);
  ctx.restore();
}

function drawShot(s) {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 7;
  ctx.shadowColor = "#fff";
  ctx.beginPath();
  ctx.arc(s.x, s.y, 2.4, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawSparks() {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  for (const s of sparks) {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWinner() {
  const text = matchWinnerText();
  if (!text) return;
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "52px Courier New, monospace";
  ctx.fillText(text, WORLD.w / 2, WORLD.h / 2 - 60);
  ctx.font = "18px Courier New, monospace";
  ctx.fillText("ENTER", WORLD.w / 2, WORLD.h / 2 - 22);
  ctx.restore();
}

function distance(a, b) {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  dx = Math.min(dx, WORLD.w - dx);
  dy = Math.min(dy, WORLD.h - dy);
  return Math.sqrt(dx * dx + dy * dy);
}

function wrap(body) {
  body.x = (body.x + WORLD.w) % WORLD.w;
  body.y = (body.y + WORLD.h) % WORLD.h;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  processGamepadAssignment();
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = WORLD.w * ratio;
  canvas.height = WORLD.h * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener("keydown", (event) => {
  if (pendingPadBind !== null && event.code === "Escape") {
    event.preventDefault();
    pendingPadBind = null;
    renderGamepadEditor();
    return;
  }
  if (pendingBind) {
    event.preventDefault();
    if (event.code === "Escape") {
      pendingBind = null;
      renderControlEditor();
      return;
    }
    if (!["Enter", "Space", "Tab"].includes(event.code)) {
      setControlBinding(pendingBind.player, pendingBind.action, event.code);
    }
    return;
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === "Enter" && betweenRounds && roundTimer > 900000) resetMatch();
  if (event.code === "Escape" && !dialog.open) {
    keys.clear();
    dialog.showModal();
  }
  if (event.code === "Space") {
    paused = !paused;
    pauseButton.textContent = paused ? ">" : "II";
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

controlEditor.addEventListener("click", (event) => {
  const button = event.target.closest(".bind-button");
  if (!button) return;
  pendingBind = {
    player: Number(button.dataset.player),
    action: button.dataset.action
  };
  renderControlEditor();
});

gamepadEditor.addEventListener("click", (event) => {
  const button = event.target.closest(".pad-button");
  if (!button) return;
  pendingPadBind = Number(button.dataset.player);
  renderGamepadEditor();
});

mouseEditor.addEventListener("click", (event) => {
  const button = event.target.closest(".mouse-button");
  if (!button) return;
  const player = Number(button.dataset.player);
  mousePlayer = mousePlayer === player ? null : player;
  mouseTurn = 0;
  mouseButtons = 0;
  renderMouseEditor();
});

resetControls.addEventListener("click", () => {
  controlSets = cloneControlSets(defaultControlSets);
  pendingBind = null;
  pendingPadBind = null;
  playerPads = Array(6).fill(null);
  mousePlayer = null;
  mouseTurn = 0;
  mouseButtons = 0;
  keys.clear();
  renderControlEditor();
  renderGamepadEditor();
  renderMouseEditor();
});

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? ">" : "II";
});

playerCount.addEventListener("input", () => {
  playerCountOut.value = playerCount.value;
  pendingBind = null;
  pendingPadBind = null;
  if (mousePlayer !== null && mousePlayer >= Number(playerCount.value)) mousePlayer = null;
  renderControlEditor();
  renderGamepadEditor();
  renderMouseEditor();
});

gravity.addEventListener("input", () => {
  gravityOut.value = gravity.value;
});

dialog.addEventListener("close", () => {
  resetMatch();
});

dialog.addEventListener("cancel", (event) => {
  if (!started) event.preventDefault();
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("gamepadconnected", () => {
  renderGamepadEditor();
});

window.addEventListener("gamepaddisconnected", (event) => {
  playerPads = playerPads.map((value) => value === event.gamepad.index ? null : value);
  pendingPadBind = null;
  renderGamepadEditor();
});

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) mouseTurn += event.movementX;
});

window.addEventListener("mousedown", (event) => {
  if (document.pointerLockElement !== canvas) return;
  mouseButtons = event.buttons;
  event.preventDefault();
});

window.addEventListener("mouseup", (event) => {
  mouseButtons = event.buttons;
});

canvas.addEventListener("contextmenu", (event) => {
  if (mousePlayer !== null) event.preventDefault();
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas) {
    mouseButtons = 0;
    mouseTurn = 0;
  }
});

seededStars();
resizeCanvas();
options = readOptions();
renderScores();
renderControlEditor();
renderGamepadEditor();
renderMouseEditor();
if (typeof dialog.showModal === "function") {
  dialog.showModal();
} else {
  dialog.setAttribute("open", "");
}
requestAnimationFrame(frame);
