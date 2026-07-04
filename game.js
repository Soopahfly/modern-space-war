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
const soundMode = document.getElementById("soundMode");
const attractMode = document.getElementById("attractMode");
const turnTune = document.getElementById("turnTune");
const turnTuneOut = document.getElementById("turnTuneOut");
const thrustTune = document.getElementById("thrustTune");
const thrustTuneOut = document.getElementById("thrustTuneOut");
const shotTune = document.getElementById("shotTune");
const shotTuneOut = document.getElementById("shotTuneOut");
const botCount = document.getElementById("botCount");
const botCountOut = document.getElementById("botCountOut");
const botDifficulty = document.getElementById("botDifficulty");
const botRevenge = document.getElementById("botRevenge");
const roomCode = document.getElementById("roomCode");
const hostRoom = document.getElementById("hostRoom");
const joinRoom = document.getElementById("joinRoom");
const leaveRoom = document.getElementById("leaveRoom");
const onlineStatus = document.getElementById("onlineStatus");
const controlEditor = document.getElementById("controlEditor");
const gamepadEditor = document.getElementById("gamepadEditor");
const gamepadStatus = document.getElementById("gamepadStatus");
const mouseEditor = document.getElementById("mouseEditor");
const saveProfile = document.getElementById("saveProfile");
const loadProfile = document.getElementById("loadProfile");
const joinByInput = document.getElementById("joinByInput");
const connectHid = document.getElementById("connectHid");
const inputStatus = document.getElementById("inputStatus");
const touchControls = document.getElementById("touchControls");
const resetControls = document.getElementById("resetControls");

const TAU = Math.PI * 2;
const WORLD = { w: 1280, h: 800 };
const STAR = { x: WORLD.w / 2, y: WORLD.h / 2, radius: 34, gravity: 90000 };
const KING_RING = { inner: 86, outer: 170 };
const STAR_GRAVITY_SCALE = 90000;
const GRAVITY_SOFTENING = 64;
const MAX_GRAVITY_ACCEL = 980;
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

const botDifficulties = {
  rookie: { label: "Rookie", reaction: 0.34, aimError: 0.34, lead: 0.22, fireAngle: 0.11, fireRange: 400, fireDiscipline: 0.45, thrust: 0.82, danger: 190, jitter: 0.2, trick: 0, vindictive: false },
  standard: { label: "Standard", reaction: 0.2, aimError: 0.2, lead: 0.45, fireAngle: 0.16, fireRange: 520, fireDiscipline: 0.68, thrust: 0.96, danger: 155, jitter: 0.12, trick: 0.15, vindictive: false },
  veteran: { label: "Veteran", reaction: 0.12, aimError: 0.11, lead: 0.72, fireAngle: 0.21, fireRange: 650, fireDiscipline: 0.84, thrust: 1.08, danger: 130, jitter: 0.07, trick: 0.34, vindictive: false },
  ace: { label: "Ace", reaction: 0.07, aimError: 0.055, lead: 0.94, fireAngle: 0.27, fireRange: 760, fireDiscipline: 0.96, thrust: 1.16, danger: 112, jitter: 0.035, trick: 0.55, vindictive: false },
  bastard: { label: "Bastard", reaction: 0.045, aimError: 0.025, lead: 1.08, fireAngle: 0.32, fireRange: 920, fireDiscipline: 1, thrust: 1.22, danger: 96, jitter: 0.018, trick: 1, vindictive: true }
};

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
let onlineRole = "local";
let onlineRoom = "";
let onlinePlayer = 0;
let socket = null;
let remoteInputs = Array.from({ length: 6 }, () => blankInput());
let lastSnapshotAt = 0;
let joinInputMode = false;
let touchState = blankInput();
let botPlayers = new Set();
let botInputs = Array.from({ length: 6 }, () => blankInput());
let botStates = Array.from({ length: 6 }, () => makeBotState());
let hidDevice = null;
let hidPlayer = 0;
let hidTurn = 0;
let hidButtons = 0;
let audioContext = null;
let attractTimer = 0;
let thrustSoundTimer = 0;

function blankInput() {
  return { left: false, right: false, thrust: false, fire: false, mouseTurn: 0 };
}

function makeBotState() {
  return {
    targetId: null,
    reaction: 0,
    wobble: 0,
    fireHold: 0,
    revengeTarget: null,
    revengeHeat: 0
  };
}

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
    variants: variantMode.checked,
    sound: soundMode.checked,
    attract: attractMode.checked,
    turnTune: Number(turnTune.value) / 100,
    thrustTune: Number(thrustTune.value) / 100,
    shotTune: Number(shotTune.value) / 100,
    bots: Number(botCount.value),
    botDifficulty: botDifficulty.value,
    botRevenge: botRevenge.checked
  };
}

function resetMatch() {
  const count = Number(playerCount.value);
  options = readOptions();
  targetScore = clamp(Number(scoreLimit.value) || 7, 1, 25);
  STAR.gravity = starGravityFromSlider();
  teamScores = [0, 0];
  players = Array.from({ length: count }, (_, i) => makePlayer(i, count));
  configureBots(count);
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
  playTone(150, 0.05, 0.04);
  if (mousePlayer !== null && canvas.requestPointerLock) canvas.requestPointerLock();
}

function configureBots(count) {
  botPlayers = new Set();
  const bots = clamp(options.bots || 0, 0, Math.max(0, count - 1));
  for (let i = count - bots; i < count; i++) botPlayers.add(i);
  botInputs = Array.from({ length: 6 }, () => blankInput());
  botStates = Array.from({ length: 6 }, () => makeBotState());
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
  const orbitalSpeed = Math.sqrt(Math.max(STAR.gravity, 1) / radius) * 0.48;
  return {
    x: STAR.x + Math.cos(angle) * radius,
    y: STAR.y + Math.sin(angle) * radius,
    vx: Math.sin(angle) * orbitalSpeed,
    vy: -Math.cos(angle) * orbitalSpeed,
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
    const bot = botPlayers.has(p.id) ? " CPU" : "";
    return `<div class="score"><span>${p.name}${team}${tag}${trait}${bot}</span><strong>${p.score}${fuel}</strong></div>`;
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

function localActionActive(player, action) {
  const controls = controlSets[player];
  return keys.has(controls[action]) ||
    readPadInput(player, action) ||
    readMouseInput(player, action) ||
    readTouchInput(player, action) ||
    readHidInput(player, action);
}

function actionActive(player, action) {
  if (botPlayers.has(player)) return Boolean(botInputs[player] && botInputs[player][action]);
  if (onlineRole === "host" && player !== 0) return Boolean(remoteInputs[player] && remoteInputs[player][action]);
  return localActionActive(player, action);
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
  if (joinInputMode) {
    const joined = findActiveGamepad();
    if (joined !== null) claimNextPlayer("pad", joined);
    return;
  }
  if (pendingPadBind === null) return;
  const index = findActiveGamepad();
  if (index === null) return;
  playerPads = playerPads.map((value) => value === index ? null : value);
  playerPads[pendingPadBind] = index;
  pendingPadBind = null;
  renderGamepadEditor();
}

async function connectWebHid() {
  if (!navigator.hid) {
    inputStatus.textContent = "WebHID unavailable in this browser";
    return;
  }
  const devices = await navigator.hid.requestDevice({ filters: [] });
  if (!devices.length) return;
  hidDevice = devices[0];
  await hidDevice.open();
  hidDevice.addEventListener("inputreport", (event) => {
    const bytes = new Uint8Array(event.data.buffer);
    hidTurn = bytes.length ? (bytes[0] << 24) >> 24 : 0;
    hidButtons = bytes.length > 1 ? bytes[1] : 0;
  });
  hidPlayer = 0;
  inputStatus.textContent = `WebHID ${hidDevice.productName || "device"} on P1`;
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

function readTouchInput(player, action) {
  return player === 0 && Boolean(touchState[action]);
}

function readHidInput(player, action) {
  if (!hidDevice || player !== hidPlayer) return false;
  if (action === "left") return hidTurn < -1;
  if (action === "right") return hidTurn > 1;
  if (action === "thrust") return Boolean(hidButtons & 1);
  if (action === "fire") return Boolean(hidButtons & 2);
  return false;
}

function updateBots(dt) {
  if (!botPlayers.size) return;
  const skill = botDifficulties[options.botDifficulty] || botDifficulties.standard;
  const humansPresent = players.some((p) => p.alive && !botPlayers.has(p.id));
  for (const id of botPlayers) {
    const bot = players[id];
    const state = botStates[id] || makeBotState();
    botStates[id] = state;
    state.fireHold = Math.max(0, state.fireHold - dt);
    state.revengeHeat = Math.max(0, state.revengeHeat - dt * 0.08);
    if (!bot || !bot.alive) {
      botInputs[id] = blankInput();
      continue;
    }
    state.reaction -= dt;
    if (state.reaction <= 0) {
      state.reaction = skill.reaction * (0.65 + Math.random() * 0.7);
      state.wobble = (Math.random() - 0.5) * skill.aimError;
      const nextTarget = chooseBotTarget(bot, skill, humansPresent);
      state.targetId = nextTarget ? nextTarget.id : null;
    }
    const target = players[state.targetId] && players[state.targetId].alive
      ? players[state.targetId]
      : chooseBotTarget(bot, skill, humansPresent);
    if (!target) {
      botInputs[id] = blankInput();
      continue;
    }
    state.targetId = target.id;
    const aim = chooseBotAim(bot, target, skill, state);
    const turn = normalizeAngle(aim.angle - bot.angle);
    const starD = distance(bot, STAR);
    const starDelta = toroidalDelta(bot, STAR);
    const starTurn = normalizeAngle(Math.atan2(-starDelta.dy, -starDelta.dx) - bot.angle);
    const danger = starD < skill.danger || closingOnStar(bot, starDelta, starD);
    const fireAngle = aim.trick ? skill.fireAngle * 0.82 : skill.fireAngle;
    const canFire = state.fireHold <= 0 && Math.abs(turn) < fireAngle && aim.distance < skill.fireRange && !shotWouldHitStar(bot, aim.angle, skill);
    if (canFire) state.fireHold = 0.08 + Math.random() * Math.max(0.08, 0.24 - skill.reaction * 0.35);
    botInputs[id] = {
      left: danger ? starTurn < -0.08 : turn < -0.08,
      right: danger ? starTurn > 0.08 : turn > 0.08,
      thrust: danger || (Math.abs(turn) < 0.85 + skill.jitter && aim.distance > 130 && Math.random() < skill.thrust),
      fire: canFire && Math.random() < skill.fireDiscipline,
      mouseTurn: 0
    };
  }
}

function chooseBotAim(bot, target, skill, state) {
  const shotSpeed = 430 * bot.trait.shot * options.shotTune;
  let best = null;
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      const dx = target.x + ox * WORLD.w - bot.x;
      const dy = target.y + oy * WORLD.h - bot.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
      const leadTime = clamp(distanceToTarget / shotSpeed, 0, 1.25) * skill.lead;
      const leadDx = dx + (target.vx - bot.vx) * leadTime;
      const leadDy = dy + (target.vy - bot.vy) * leadTime;
      const distance = Math.sqrt(leadDx * leadDx + leadDy * leadDy);
      const angle = Math.atan2(leadDy, leadDx) + state.wobble;
      const starClearance = shotStarClearance(bot, angle);
      const wrapLane = ox !== 0 || oy !== 0;
      const skim = starClearance > STAR.radius + 10 && starClearance < STAR.radius + 95;
      let score = -distance;
      score += wrapLane ? 180 * skill.trick : 0;
      score += skim ? 140 * skill.trick : 0;
      score -= shotWouldHitStar(bot, angle, skill) ? 10000 : 0;
      score += Math.random() * skill.jitter * 100;
      if (!best || score > best.score) best = { angle, distance, trick: wrapLane || skim, score };
    }
  }
  return best || { angle: bot.angle, distance: Infinity, trick: false };
}

function chooseBotTarget(bot, skill, humansPresent) {
  let best = null;
  let bestScore = -Infinity;
  const state = botStates[bot.id] || makeBotState();
  for (const candidate of players) {
    if (!candidate.alive || candidate.id === bot.id || sameTeam(candidate.id, bot.id)) continue;
    const d = Math.max(1, distance(bot, candidate));
    let score = 900 / d;
    if (options.mode === "bounty" && bountyTarget() === candidate) score += 2.2;
    if (options.mode === "king") {
      const ringD = Math.abs(distance(candidate, STAR) - (KING_RING.inner + KING_RING.outer) / 2);
      score += clamp(1.2 - ringD / 140, 0, 1.2);
    }
    if ((options.botRevenge || skill.vindictive) && humansPresent && !botPlayers.has(candidate.id) && state.revengeTarget === candidate.id) {
      score += (skill.vindictive ? 5.5 : 3.5) * clamp(state.revengeHeat, 0, 1);
    }
    score += Math.random() * skill.jitter;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function closingOnStar(bot, starDelta, starD) {
  if (starD > 220) return false;
  const inwardSpeed = (bot.vx * starDelta.dx + bot.vy * starDelta.dy) / Math.max(1, starD);
  return inwardSpeed > 80 && starD < 175;
}

function shotStarClearance(bot, angle) {
  const delta = toroidalDelta(bot, STAR);
  const along = delta.dx * Math.cos(angle) + delta.dy * Math.sin(angle);
  if (along <= 0 || along > 560) return Infinity;
  return Math.abs(delta.dx * Math.sin(angle) - delta.dy * Math.cos(angle));
}

function shotWouldHitStar(bot, angle, skill) {
  const clearance = shotStarClearance(bot, angle);
  const margin = skill && skill.trick > 0.8 ? 2 : 6;
  return clearance < STAR.radius + margin;
}

function updateAttract(dt) {
  if (started || !attractMode.checked || dialog.open === false) {
    attractTimer = 0;
    return;
  }
  attractTimer += dt;
  if (attractTimer < 4) return;
  options = readOptions();
  options.bots = Math.max(2, options.bots || 4);
  playerCount.value = String(Math.max(Number(playerCount.value), options.bots));
  playerCountOut.value = playerCount.value;
  targetScore = 7;
  STAR.gravity = starGravityFromSlider();
  teamScores = [0, 0];
  players = Array.from({ length: Number(playerCount.value) }, (_, i) => makePlayer(i, Number(playerCount.value)));
  configureBots(players.length);
  shots = [];
  sparks = [];
  debris = [];
  comet = null;
  setupMoons();
  started = true;
  betweenRounds = false;
  stateNode.textContent = "DEMO";
}

function shortestDelta(value, size) {
  if (value > size / 2) return value - size;
  if (value < -size / 2) return value + size;
  return value;
}

function toroidalDelta(from, to) {
  return {
    dx: shortestDelta(to.x - from.x, WORLD.w),
    dy: shortestDelta(to.y - from.y, WORLD.h)
  };
}

function normalizeAngle(value) {
  while (value > Math.PI) value -= TAU;
  while (value < -Math.PI) value += TAU;
  return value;
}

function playTone(frequency, duration, volume = 0.035) {
  if (!options.sound && !soundMode.checked) return;
  if (!audioContext) audioContext = new AudioContext();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function saveControlProfile() {
  const profile = {
    controlSets,
    playerPads,
    mousePlayer,
    turnTune: turnTune.value,
    thrustTune: thrustTune.value,
    shotTune: shotTune.value,
    botCount: botCount.value,
    botDifficulty: botDifficulty.value,
    botRevenge: botRevenge.checked
  };
  localStorage.setItem("modernSpaceWar.profile", JSON.stringify(profile));
  inputStatus.textContent = "Profile saved";
}

function loadControlProfile() {
  const raw = localStorage.getItem("modernSpaceWar.profile");
  if (!raw) {
    inputStatus.textContent = "No saved profile";
    return;
  }
  const profile = JSON.parse(raw);
  controlSets = cloneControlSets(profile.controlSets || defaultControlSets);
  playerPads = profile.playerPads || Array(6).fill(null);
  mousePlayer = profile.mousePlayer ?? null;
  turnTune.value = profile.turnTune || "100";
  thrustTune.value = profile.thrustTune || "100";
  shotTune.value = profile.shotTune || "100";
  botCount.value = profile.botCount || "0";
  botDifficulty.value = profile.botDifficulty || "standard";
  botRevenge.checked = Boolean(profile.botRevenge);
  updateTuneOutputs();
  renderControlEditor();
  renderGamepadEditor();
  renderMouseEditor();
  inputStatus.textContent = "Profile loaded";
}

function claimNextPlayer(kind, value) {
  const next = Math.min(Number(playerCount.value), 5);
  playerCount.value = String(Math.max(Number(playerCount.value), next + 1));
  playerCountOut.value = playerCount.value;
  if (kind === "pad") {
    playerPads = playerPads.map((item) => item === value ? null : item);
    playerPads[next] = value;
  }
  if (kind === "mouse") mousePlayer = next;
  if (kind === "key") controlSets[next] = { ...defaultControlSets[next] };
  joinInputMode = false;
  inputStatus.textContent = `P${next + 1} joined by ${kind}`;
  renderControlEditor();
  renderGamepadEditor();
  renderMouseEditor();
}

function updateTuneOutputs() {
  turnTuneOut.value = turnTune.value;
  thrustTuneOut.value = thrustTune.value;
  shotTuneOut.value = shotTune.value;
  botCountOut.value = botCount.value;
}

function connectOnline(kind) {
  leaveOnline(false);
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);
  onlineStatus.textContent = "Connecting";
  socket.addEventListener("open", () => {
    const code = roomCode.value.trim().toUpperCase();
    sendOnline(kind === "host" ? { type: "create" } : { type: "join", room: code });
  });
  socket.addEventListener("message", (event) => handleOnlineMessage(JSON.parse(event.data)));
  socket.addEventListener("close", () => leaveOnline(false));
  socket.addEventListener("error", () => {
    onlineStatus.textContent = "Online server not reachable";
  });
}

function handleOnlineMessage(message) {
  if (message.type === "created" || message.type === "joined") {
    onlineRole = message.host ? "host" : "client";
    onlineRoom = message.room;
    onlinePlayer = message.player;
    roomCode.value = onlineRoom;
    onlineStatus.textContent = `${onlineRole.toUpperCase()} ${onlineRoom} P${onlinePlayer + 1}`;
    if (onlineRole === "client") {
      started = false;
      betweenRounds = true;
    }
    return;
  }
  if (message.type === "error") {
    onlineStatus.textContent = message.message || "Online error";
    leaveOnline(false);
    return;
  }
  if (message.type === "peer" && onlineRole === "host") {
    const count = clamp(message.count, 2, 6);
    playerCount.value = String(Math.max(Number(playerCount.value), count));
    playerCountOut.value = playerCount.value;
    renderControlEditor();
    renderGamepadEditor();
    renderMouseEditor();
    onlineStatus.textContent = `HOST ${onlineRoom} ${message.count} PLAYERS`;
    return;
  }
  if (message.type === "input" && onlineRole === "host") {
    remoteInputs[message.player] = message.input;
    return;
  }
  if (message.type === "snapshot" && onlineRole === "client") {
    applySnapshot(message.state);
  }
}

function leaveOnline(updateStatus = true) {
  if (socket) {
    const closing = socket;
    socket = null;
    closing.close();
  }
  onlineRole = "local";
  onlineRoom = "";
  onlinePlayer = 0;
  remoteInputs = Array.from({ length: 6 }, () => blankInput());
  if (updateStatus) onlineStatus.textContent = "Offline";
}

function sendOnline(message) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function publishOnline(dt) {
  if (onlineRole === "client") {
    sendOnline({ type: "input", input: localInputPacket(0) });
    return;
  }
  if (onlineRole !== "host") return;
  lastSnapshotAt += dt;
  if (lastSnapshotAt >= 0.05) {
    lastSnapshotAt = 0;
    sendOnline({ type: "snapshot", state: snapshotState() });
  }
}

function localInputPacket(player) {
  return {
    left: localActionActive(player, "left"),
    right: localActionActive(player, "right"),
    thrust: localActionActive(player, "thrust"),
    fire: localActionActive(player, "fire"),
    mouseTurn: mousePlayer === player && document.pointerLockElement === canvas ? mouseTurn : 0
  };
}

function snapshotState() {
  return {
    players,
    shots,
    sparks,
    debris,
    moons,
    comet,
    started,
    betweenRounds,
    roundTimer,
    targetScore,
    options,
    teamScores,
    roundScored,
    cometTimer,
    starGravity: STAR.gravity,
    stateText: stateNode.textContent
  };
}

function applySnapshot(state) {
  players = state.players || [];
  shots = state.shots || [];
  sparks = state.sparks || [];
  debris = state.debris || [];
  moons = state.moons || [];
  comet = state.comet;
  started = state.started;
  betweenRounds = state.betweenRounds;
  roundTimer = state.roundTimer;
  targetScore = state.targetScore;
  options = state.options || {};
  teamScores = state.teamScores || [0, 0];
  roundScored = state.roundScored;
  cometTimer = state.cometTimer;
  STAR.gravity = state.starGravity || STAR.gravity;
  stateNode.textContent = state.stateText || "ONLINE";
  renderScores();
}

function update(dt) {
  publishOnline(dt);
  if (onlineRole === "client") return;
  updateAttract(dt);
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
  updateBots(dt);
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
    p.angle += mouseTurn * 0.014 * p.trait.turn * options.turnTune;
  }
  if (onlineRole === "host" && p.id !== 0 && remoteInputs[p.id]) {
    p.angle += remoteInputs[p.id].mouseTurn * 0.014 * p.trait.turn * options.turnTune;
    remoteInputs[p.id].mouseTurn = 0;
  }
  if (actionActive(p.id, "left")) p.angle -= 4.25 * p.trait.turn * options.turnTune * dt;
  if (actionActive(p.id, "right")) p.angle += 4.25 * p.trait.turn * options.turnTune * dt;
  if (actionActive(p.id, "thrust") && (!options.fuel || p.fuel > 0)) {
    p.vx += Math.cos(p.angle) * 235 * p.trait.thrust * options.thrustTune * dt;
    p.vy += Math.sin(p.angle) * 235 * p.trait.thrust * options.thrustTune * dt;
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
  const d2 = dx * dx + dy * dy;
  const d = Math.max(Math.sqrt(d2), 1);
  const softened = d2 + GRAVITY_SOFTENING * GRAVITY_SOFTENING;
  const pull = Math.min(MAX_GRAVITY_ACCEL, gravityStrength / softened);
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
  const speed = 430 * p.trait.shot * options.shotTune;
  shots.push({
    x: p.x + Math.cos(p.angle) * 18,
    y: p.y + Math.sin(p.angle) * 18,
    vx: p.vx + Math.cos(p.angle) * speed,
    vy: p.vy + Math.sin(p.angle) * speed,
    life: 1.85,
    owner: p.id
  });
  p.cool = 0.28 * p.trait.cool;
  playTone(620, 0.045, 0.028);
}

function destroyShip(p, scorerId = null) {
  if (!p.alive) return;
  p.alive = false;
  burst(p.x, p.y, 24);
  playTone(80, 0.16, 0.055);
  if (options.debris) makeDebris(p);
  const skill = botDifficulties[options.botDifficulty] || botDifficulties.standard;
  if ((options.botRevenge || skill.vindictive) && botPlayers.has(p.id) && scorerId !== null && !botPlayers.has(scorerId)) {
    const state = botStates[p.id] || makeBotState();
    state.revengeTarget = scorerId;
    state.revengeHeat = 1;
    botStates[p.id] = state;
  }
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
  thrustSoundTimer -= 0.016;
  if (thrustSoundTimer <= 0) {
    thrustSoundTimer = 0.12;
    playTone(115, 0.035, 0.018);
  }
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

function starGravityFromSlider() {
  return Math.max(0, Number(gravity.value)) * STAR_GRAVITY_SCALE;
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
  if (joinInputMode && !["Enter", "Space", "Tab", "Escape"].includes(event.code)) {
    event.preventDefault();
    claimNextPlayer("key", event.code);
    return;
  }
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
  if (event.code === "Enter" && betweenRounds && roundTimer > 900000 && onlineRole !== "client") resetMatch();
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

saveProfile.addEventListener("click", saveControlProfile);
loadProfile.addEventListener("click", loadControlProfile);

joinByInput.addEventListener("click", () => {
  joinInputMode = !joinInputMode;
  inputStatus.textContent = joinInputMode ? "Press a key, pad button, or mouse button" : "Join-by-input off";
});

connectHid.addEventListener("click", () => {
  connectWebHid().catch(() => {
    inputStatus.textContent = "WebHID connection failed";
  });
});

hostRoom.addEventListener("click", () => {
  connectOnline("host");
});

joinRoom.addEventListener("click", () => {
  connectOnline("join");
});

leaveRoom.addEventListener("click", () => {
  leaveOnline();
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

for (const input of [turnTune, thrustTune, shotTune, botCount]) {
  input.addEventListener("input", updateTuneOutputs);
}

touchControls.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-touch]");
  if (!button) return;
  event.preventDefault();
  touchState[button.dataset.touch] = true;
  button.setPointerCapture(event.pointerId);
});

touchControls.addEventListener("pointerup", (event) => {
  const button = event.target.closest("button[data-touch]");
  if (!button) return;
  touchState[button.dataset.touch] = false;
});

touchControls.addEventListener("pointercancel", (event) => {
  const button = event.target.closest("button[data-touch]");
  if (!button) return;
  touchState[button.dataset.touch] = false;
});

dialog.addEventListener("close", () => {
  if (onlineRole === "client") return;
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
  if (joinInputMode) {
    event.preventDefault();
    claimNextPlayer("mouse");
    return;
  }
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
