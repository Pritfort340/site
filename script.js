const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  regionSelect: document.getElementById('regionSelect'),
  playerStats: document.getElementById('playerStats'),
  eventInfo: document.getElementById('eventInfo'),
  clanInfo: document.getElementById('clanInfo'),
  leaderboard: document.getElementById('leaderboard'),
};

const world = {
  w: canvas.width,
  h: canvas.height,
  zones: [
    { name: 'Город', color: '#1f3f5b', x: 0, y: 0, w: 320, h: 300 },
    { name: 'Лес', color: '#214d2e', x: 320, y: 0, w: 320, h: 300 },
    { name: 'Пещера', color: '#4a3a2a', x: 640, y: 0, w: 320, h: 300 },
    { name: 'Арена', color: '#5b1f29', x: 0, y: 300, w: 960, h: 300 },
  ]
};

const player = {
  name: 'Hero', clan: 'MushRoom', x: 150, y: 150, r: 12,
  hp: 100, maxHp: 100, level: 1, xp: 0, gold: 0, kills: 0, speed: 190,
  attackCooldown: 0,
};

const regionalData = {
  EU: { online: 81 },
  NA: { online: 64 },
  ASIA: { online: 104 },
};
let currentRegion = 'EU';

const keys = new Set();
const enemies = Array.from({ length: 12 }, (_, i) => spawnEnemy(i));

function spawnEnemy(i) {
  return {
    id: i,
    x: 350 + Math.random() * 560,
    y: 80 + Math.random() * 490,
    r: 10,
    hp: 40,
    maxHp: 40,
    speed: 30 + Math.random() * 20,
    vx: Math.random() > 0.5 ? 1 : -1,
    vy: Math.random() > 0.5 ? 1 : -1,
  };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
ui.regionSelect.addEventListener('change', () => { currentRegion = ui.regionSelect.value; refreshUI(); });

let last = performance.now();
let eventTimer = 60;
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  const len = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx / len) * player.speed * dt, player.r, world.w - player.r);
  player.y = clamp(player.y + (dy / len) * player.speed * dt, player.r, world.h - player.r);

  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  if (keys.has(' ') && player.attackCooldown === 0) {
    player.attackCooldown = 0.3;
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < 45) {
        enemy.hp -= 20;
        if (enemy.hp <= 0) {
          player.kills += 1;
          player.gold += 5;
          player.xp += 15;
          enemy.x = 350 + Math.random() * 560;
          enemy.y = 80 + Math.random() * 490;
          enemy.hp = enemy.maxHp;
        }
      }
    }
  }

  if (player.xp >= player.level * 80) {
    player.xp = 0;
    player.level += 1;
    player.maxHp += 15;
    player.hp = player.maxHp;
  }

  for (const enemy of enemies) {
    enemy.x += enemy.vx * enemy.speed * dt;
    enemy.y += enemy.vy * enemy.speed * dt;
    if (enemy.x < 330 || enemy.x > world.w - 10) enemy.vx *= -1;
    if (enemy.y < 10 || enemy.y > world.h - 10) enemy.vy *= -1;
  }

  eventTimer -= dt;
  if (eventTimer <= 0) {
    eventTimer = 60;
    player.gold += 30;
    player.xp += 30;
  }

  refreshUI();
}

function getLeaderboard() {
  const bots = [
    { name: 'Ares', level: 5, score: 550 },
    { name: 'Yuna', level: 4, score: 420 },
    { name: 'Khan', level: 3, score: 350 },
  ];
  const me = { name: `${player.name} (you)`, level: player.level, score: player.kills * 100 + player.gold };
  return [me, ...bots].sort((a, b) => b.score - a.score);
}

function refreshUI() {
  ui.playerStats.innerHTML = `
    <p><strong>${player.name}</strong> [${currentRegion}]</p>
    <p>Уровень: ${player.level} | XP: ${player.xp}/${player.level * 80}</p>
    <p>HP: ${player.hp}/${player.maxHp}</p>
    <p>Золото: ${player.gold} | Убийств: ${player.kills}</p>
  `;
  ui.eventInfo.innerHTML = `<p>Мировой босс через: <strong>${Math.ceil(eventTimer)}с</strong></p><p>Онлайн: ${regionalData[currentRegion].online}</p>`;
  ui.clanInfo.innerHTML = `<p>Клан: <strong>${player.clan}</strong></p><p>Роль: Лидер</p><p>Клановые очки: ${player.kills * 12}</p>`;

  ui.leaderboard.innerHTML = '';
  getLeaderboard().forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.name} — Lvl ${entry.level}, score ${entry.score}`;
    ui.leaderboard.appendChild(li);
  });
}

function draw() {
  ctx.clearRect(0, 0, world.w, world.h);

  for (const zone of world.zones) {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '16px sans-serif';
    ctx.fillText(zone.name, zone.x + 10, zone.y + 24);
  }

  for (const enemy of enemies) {
    ctx.fillStyle = '#ff7171';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#54c8ff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
}
