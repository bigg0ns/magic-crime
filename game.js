const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const keys = new Set();
const player = { x: 100, y: 270, r: 12, angle: 0, speed: 170, cash: 0, heat: 0, inVehicle: false };
const marker = { x: 790, y: 120, r: 24, active: true };
const stash = { x: 760, y: 420, r: 26, active: false };
let mission = 'Reach the cyan marker';
let phase = 0;
let last = 0;
let heatTimer = 0;

const buildings = [
  { x: 220, y: 30, w: 170, h: 120 },
  { x: 460, y: 30, w: 220, h: 120 },
  { x: 220, y: 360, w: 170, h: 150 },
  { x: 470, y: 300, w: 230, h: 210 },
  { x: 30, y: 170, w: 120, h: 120 },
  { x: 780, y: 240, w: 150, h: 120 }
];

const vehicles = [
  { x: 180, y: 250, angle: 0, cooldown: 0 },
  { x: 760, y: 190, angle: Math.PI, cooldown: 0 }
];

const enemies = [
  { x: 700, y: 100, r: 10, shoot: 0 },
  { x: 650, y: 460, r: 10, shoot: 0 }
];

const blasts = [];

addEventListener('keydown', event => {
  keys.add(event.key.toLowerCase());
  if (event.key.toLowerCase() === 'r') resetGame();
});

addEventListener('keyup', event => {
  keys.delete(event.key.toLowerCase());
});

function resetGame() {
  player.x = 100;
  player.y = 270;
  player.cash = 0;
  player.heat = 0;
  player.inVehicle = false;
  player.vehicle = undefined;

  phase = 0;
  mission = 'Reach the cyan marker';
  marker.active = true;
  stash.active = false;
  blasts.length = 0;
}

function circleHit(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <
    (a.r || 12) + (b.r || 12);
}

function blocked(x, y, r = 12) {
  return buildings.some(building =>
    x + r > building.x &&
    x - r < building.x + building.w &&
    y + r > building.y &&
    y - r < building.y + building.h
  );
}

let blastCooldown = 0;

function castBlast() {
  if (blastCooldown > 0) return;

  blastCooldown = 0.35;
  blasts.push({
    x: player.x + Math.cos(player.angle) * 20,
    y: player.y + Math.sin(player.angle) * 20,
    vx: Math.cos(player.angle) * 360,
    vy: Math.sin(player.angle) * 360,
    enemy: false,
    life: 1.4
  });
}

function update(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    player.angle = Math.atan2(dy, dx);
    const sprint = keys.has('shift') ? 1.55 : 1;
    const speed = player.speed * sprint * (player.inVehicle ? 1.8 : 1);

    const nextX = player.x + dx * speed * dt;
    const nextY = player.y + dy * speed * dt;

    if (!blocked(nextX, player.y)) {
      player.x = Math.max(12, Math.min(W - 12, nextX));
    }

    if (!blocked(player.x, nextY)) {
      player.y = Math.max(12, Math.min(H - 12, nextY));
    }
  }

  if (keys.has('e') && !player.inVehicle) {
    const vehicle = vehicles.find(v =>
      Math.hypot(v.x - player.x, v.y - player.y) < 38
    );

    if (vehicle) {
      player.inVehicle = true;
      player.vehicle = vehicle;
    }
  }

  if (keys.has('f')) castBlast();

  if (player.inVehicle) {
    player.x = player.vehicle.x;
    player.y = player.vehicle.y;
  }

  if (phase === 0 && circleHit(player, marker)) {
    phase = 1;
    marker.active = false;
    stash.active = true;
    mission = 'Steal the magic cache';
  }

  if (phase === 1 && circleHit(player, stash)) {
    phase = 2;
    stash.active = false;
    player.cash += 250;
    player.heat = 2;
    mission = 'Escape — stay clear of hunters';
  }

  if (phase === 2) {
    heatTimer += dt;
    if (heatTimer > 5) {
      heatTimer = 0;
      player.heat = Math.max(0, player.heat - 1);
    }
  }

  enemies.forEach(enemy => {
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    if (distance < 180) {
      enemy.shoot -= dt;

      if (enemy.shoot <= 0) {
        enemy.shoot = 1.2;
        const angle = Math.atan2(
          player.y - enemy.y,
          player.x - enemy.x
        );

        blasts.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 130,
          vy: Math.sin(angle) * 130,
          enemy: true,
          life: 3
        });
      }
    }
  });

  for (let i = blasts.length - 1; i >= 0; i--) {
    const blast = blasts[i];

    blast.x += blast.vx * dt;
    blast.y += blast.vy * dt;
    blast.life -= dt;

    if (blast.enemy &&
        Math.hypot(blast.x - player.x, blast.y - player.y) < 14) {
      player.heat = Math.min(5, player.heat + 1);
      blasts.splice(i, 1);
    } else if (blast.life <= 0) {
      blasts.splice(i, 1);
    }
  }

  document.getElementById('heat').textContent =
    '★'.repeat(player.heat);
  document.getElementById('cash').textContent =
    '$' + player.cash;
  document.getElementById('mission').textContent =
    mission;
}

function draw() {
  ctx.fillStyle = '#252b30';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#394049';
  ctx.lineWidth = 2;

  for (let x = 0; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  buildings.forEach(building => {
    ctx.fillStyle = '#11151c';
    ctx.fillRect(
      building.x,
      building.y,
      building.w,
      building.h
    );
    ctx.strokeStyle = '#5a6272';
    ctx.strokeRect(
      building.x,
      building.y,
      building.w,
      building.h
    );
  });

  if (marker.active) {
    ctx.strokeStyle = '#58e5ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      marker.x,
      marker.y,
      marker.r + Math.sin(performance.now() / 180) * 5,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  if (stash.active) {
    ctx.fillStyle = '#b85cff';
    ctx.fillRect(stash.x - 14, stash.y - 14, 28, 28);
  }

  vehicles.forEach(vehicle => {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);

    ctx.fillStyle = '#68758f';
    ctx.fillRect(-18, -10, 36, 20);

    ctx.fillStyle = '#b7c4df';
    ctx.fillRect(-8, -8, 12, 16);
    ctx.restore();
  });

  enemies.forEach(enemy => {
    ctx.fillStyle = '#dc5547';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!player.inVehicle) {
    ctx.fillStyle = '#57d9a3';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
  }

  blasts.forEach(blast => {
    ctx.fillStyle = blast.enemy ? '#ffb35c' : '#75a8ff';
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function loop(time) {
  const dt = Math.min(
    (time - last) / 1000 || 0,
    0.033
  );

  last = time;
  blastCooldown = Math.max(0, blastCooldown - dt);

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
