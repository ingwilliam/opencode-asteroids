'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 1600;
const H = 1200;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Estrella fugaz: asteroide especial rápido que desaparece con el tiempo
const STAR_SPEED  = 300;          // px/s: muy por encima del asteroide más rápido (85)
const STAR_TTL    = 7;            // segundos de vida antes de desaparecer sola
const STAR_POINTS = 500;
const STAR_COLOR  = '#7fd4ff';

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.color  = '#fff';
    this.alpha  = 1;
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha  = this.alpha;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);   // tamaño pequeño: hereda el radio (16)
    this.points = STAR_POINTS;
    this.color  = STAR_COLOR;
    this.ttl    = STAR_TTL;
    this.sparkTimer = 0;

    // Mucho más rápida que cualquier asteroide normal
    const angle = rand(0, Math.PI * 2);
    const speed = STAR_SPEED + rand(-40, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-3, 3);

    // Silueta de estrella de 4 puntas (radios alternados)
    const n = 8;
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * (i % 2 === 0 ? 1.0 : 0.42);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;

    // Rastro de chispas mientras vuela
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = 0.06;
      particles.push(new Particle(this.x, this.y));
    }

    // Se desvanece al final de su vida para avisar que va a desaparecer
    this.alpha = Math.max(0, Math.min(1, this.ttl / 1.5));
  }

  split() {
    // La estrella fugaz no se fragmenta
    return [];
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define su silueta (nariz hacia +x) a escala base de la clásica.
// `scale` agranda la silueta y el radio de colisión de la nave;
// `scoreMultiplier` duplica los puntos obtenidos con ese skin.
const SHIP_SKINS = [
  { name: 'CLÁSICA', color: '#fff',     scale: 1, scoreMultiplier: 1, verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]] },
  { name: 'DELTA',   color: '#7fd4ff', scale: 1, scoreMultiplier: 1, verts: [[18, 0], [-14, -12], [-7, -4], [-7, 4], [-14, 12]] },
  { name: 'FLECHA',  color: '#ff6bd6', scale: 1, scoreMultiplier: 1, verts: [[21, 0], [-13, -6], [-7, 0], [-13, 6]] },
  { name: 'GÉMENI',  color: '#7dff8f', scale: 1, scoreMultiplier: 1, verts: [[16, 0], [-6, -7], [-14, -10], [-10, -4], [-4, 0], [-10, 4], [-14, 10], [-6, 7]] },
  { name: 'TITÁN',   color: '#ff9d4a', scale: 1, scoreMultiplier: 1, verts: [[15, 0], [-10, -11], [-13, 0], [-10, 11]] },
  { name: 'MORADA',  color: '#b06bff', scale: 2, scoreMultiplier: 2, verts: [[24, 0], [8, -6], [-6, -13], [-16, -8], [-11, 0], [-16, 8], [-6, 13], [8, 6]] },
];

const SKIN_STORAGE_KEY = 'asteroids-skin';

/**
 * Carga el índice de skin guardado en localStorage.
 * Devuelve 0 si no hay dato, está corrupto o el almacenamiento
 * no está disponible (p. ej. modo privado del navegador).
 * @returns {number} índice válido en SHIP_SKINS
 */
function loadSkinIndex() {
  try {
    const idx = Number(localStorage.getItem(SKIN_STORAGE_KEY));
    return Number.isInteger(idx) && idx >= 0 && idx < SHIP_SKINS.length ? idx : 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Guarda el índice de skin en localStorage.
 * Si el almacenamiento no está disponible, el skin se mantiene
 * solo en memoria durante la sesión.
 * @param {number} idx índice a persistir
 */
function saveSkinIndex(idx) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, String(idx));
  } catch (err) {
    // Sin persistencia disponible: la selección sigue vigente en esta sesión
  }
}

/**
 * Pasa al siguiente skin (tecla C), lo persiste y activa el cartel
 * con su nombre en el HUD.
 */
function cycleSkin() {
  skinIndex = (skinIndex + 1) % SHIP_SKINS.length;
  saveSkinIndex(skinIndex);
  skinLabelTimer = 1.6;
}

let skinIndex      = loadSkinIndex();
let skinLabelTimer = 0;   // segundos restantes del cartel "SKIN: ..." en el HUD

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;   // segundos restantes del power-up "Velocidad"
    this.tripleShot    = 0;   // segundos restantes del power-up "Triple"
    this.shield        = 0;   // segundos restantes del power-up "Escudo"
    this.dead          = false;
  }

  // Radio de colisión: crece con la escala del skin activo (la MORADA es el doble de grande)
  get radius() {
    return 12 * SHIP_SKINS[skinIndex].scale;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      // Con "Velocidad" activo la propulsión se duplica
      const thrust = this.speedBoost > 0 ? THRUST * 2 : THRUST;
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    // La boca del cañón acompaña la escala del skin activo
    const NOSE = 21 * SHIP_SKINS[skinIndex].scale;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Con "Triple" activo: 3 balas paralelas, desplazadas de forma
    // perpendicular a la nave; las tres viajan rectas, sin abanico
    if (this.tripleShot > 0) {
      const SIDE = 7;
      const px = -Math.sin(this.angle);
      const py =  Math.cos(this.angle);
      return [
        new Bullet(ox - px * SIDE, oy - py * SIDE, this.angle),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox + px * SIDE, oy + py * SIDE, this.angle),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SHIP_SKINS[skinIndex];
    const scale = skin.scale;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // La silueta se dibuja a escala base y se agranda según el skin
    ctx.scale(scale, scale);
    // La nave conserva su color de skin; con "Velocidad" solo la llama cambia
    const boosted = this.speedBoost > 0;
    ctx.strokeStyle = skin.color;
    // lineWidth compensado por la escala para mantener ~1.5 px en pantalla
    ctx.lineWidth   = 1.5 / scale;
    ctx.lineJoin    = 'round';

    // Silueta del skin activo
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor: amarilla mientras el power-up "Velocidad" está activo
    // (las coordenadas van dentro del ctx.scale, así que también crecen con el skin)
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? 'rgba(255, 210, 74, 0.9)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();

    // Burbuja del "Escudo": envuelve a la nave y late suavemente
    if (this.shield > 0) {
      // Se desvanece al final para avisar que va a expirar (como la estrella fugaz)
      const alpha  = Math.min(1, this.shield / 1.5);
      // La burbuja acompaña la escala del skin para envolver naves grandes
      const radius = (20 + 1.5 * Math.sin(this.shield * 8)) * scale;
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.globalAlpha  = alpha;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// ── Power-ups: "Velocidad", "Triple" y "Escudo" ────────────────────────────────
const POWERUP_TTL     = 10;   // segundos en pantalla antes de desaparecer
const BOOST_TIME      = 5;    // duración del efecto "Velocidad" al recogerlo
const TRIPLE_TIME     = 5;    // duración del efecto "Triple" al recogerlo
const SHIELD_TIME     = 8;    // duración base del "Escudo" al recogerlo
const SHIELD_HIT_COST = 1.5;  // segundos de escudo que consume cada impacto absorbido
const SHIELD_COLOR    = '#7fd4ff';   // mismo cian que la estrella fugaz

const POWERUP_COLORS = {
  speed:  '#ffd24a',      // Velocidad: rayo amarillo
  triple: '#7fd4ff',      // Triple: tres trazos cian
  shield: SHIELD_COLOR,   // Escudo: anillos cian
};

class PowerUp {
  // type: 'speed' ("Velocidad"), 'triple' ("Triple") o 'shield' ("Escudo")
  constructor(type) {
    this.type = type;
    this.x = rand(0, W);
    this.y = rand(0, H);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = POWERUP_TTL;
    this.radius = 10;
    this.pulse = 0;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    this.pulse += dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Escala pulsante para llamar la atención del jugador
    const scale = 1 + 0.15 * Math.sin(this.pulse * 6);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = POWERUP_COLORS[this.type];
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    if (this.type === 'triple')      this.drawTripleIcon();
    else if (this.type === 'shield') this.drawShieldIcon();
    else                             this.drawSpeedIcon();
    ctx.restore();
  }

  // Rayo estilizado del power-up "Velocidad"
  drawSpeedIcon() {
    ctx.beginPath();
    ctx.moveTo( 3, -9);
    ctx.lineTo(-5,  2);
    ctx.lineTo(-1,  2);
    ctx.lineTo(-3,  9);
    ctx.lineTo( 5, -2);
    ctx.lineTo( 1, -2);
    ctx.closePath();
    ctx.stroke();
  }

  // Tres trazos paralelos del power-up "Triple"
  drawTripleIcon() {
    for (const oy of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.moveTo(-6, oy);
      ctx.lineTo( 6, oy);
      ctx.stroke();
    }
  }

  // Anillos concéntricos del power-up "Escudo": la burbuja que envuelve a la nave
  drawShieldIcon() {
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUpTimer;
let shootingStarTimer;

// Posición aleatoria lejos de la nave (evita apariciones injustas encima del jugador)
function randomSafePosition() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (dist(ship, { x, y }) < SAFE_DIST);
  return [x, y];
}

function spawnAsteroids(count) {
  for (let i = 0; i < count; i++) {
    const [x, y] = randomSafePosition();
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerUpTimer = rand(10, 18);
  shootingStarTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  powerUpTimer = rand(10, 18);
  shootingStarTimer = rand(8, 15);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin disponible en cualquier estado del juego
  if (pressed('KeyC')) cycleSkin();
  if (skinLabelTimer > 0) skinLabelTimer -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    // Filtra asteroides expirados (la estrella fugaz puede morir por TTL en este estado)
    asteroids = asteroids.filter(a => !a.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparición periódica de power-ups (máximo uno en pantalla, tipo aleatorio)
  powerUpTimer -= dt;
  if (powerUpTimer <= 0) {
    if (powerUps.length === 0) {
      const types = ['speed', 'triple', 'shield'];
      powerUps.push(new PowerUp(types[Math.floor(Math.random() * types.length)]));
    }
    powerUpTimer = rand(10, 18);
  }

  // Aparición periódica de la estrella fugaz (solo una a la vez en pantalla)
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    if (!asteroids.some(a => a instanceof ShootingStar)) {
      const [x, y] = randomSafePosition();
      asteroids.push(new ShootingStar(x, y));
    }
    shootingStarTimer = rand(8, 15);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        // La MORADA (skin de escala 2) duplica los puntos de cada asteroide
        score += a.points * SHIP_SKINS[skinIndex].scoreMultiplier;
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up: aplicar el efecto según el tipo recogido
  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple')      ship.tripleShot = TRIPLE_TIME;
      else if (p.type === 'shield') ship.shield     = SHIELD_TIME;
      else                          ship.speedBoost = BOOST_TIME;
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        // Con el "Escudo" activo el impacto se absorbe: el asteroide se
        // destruye sin puntos ni fragmentos y el escudo se desgasta
        if (ship.shield > 0) {
          a.dead = true;
          ship.shield = Math.max(0, ship.shield - SHIELD_HIT_COST);
          explode(a.x, a.y, a.size * 5);
        } else {
          killShip();
          break;
        }
      }
    }
    // Se retiran aquí los asteroides destruidos por el escudo
    asteroids = asteroids.filter(a => !a.dead);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  // Réplica en miniatura de la nave con el skin activo
  const skin = SHIP_SKINS[skinIndex];
  const ICON_SCALE = 0.45;
  const scale = ICON_SCALE * skin.scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = skin.color;
  // lineWidth compensado por la escala para mantener 1.2 px en pantalla
  ctx.lineWidth   = 1.2 / scale;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Cuentas regresivas de los power-ups activos (apiladas bajo el nivel)
  let hudY = 46;
  if (state === 'playing') {
    if (ship.speedBoost > 0) {
      ctx.fillStyle = POWERUP_COLORS.speed;
      ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, W / 2, hudY);
      hudY += 18;
    }
    if (ship.tripleShot > 0) {
      ctx.fillStyle = POWERUP_COLORS.triple;
      ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, W / 2, hudY);
      hudY += 18;
    }
    if (ship.shield > 0) {
      ctx.fillStyle = POWERUP_COLORS.shield;
      ctx.fillText(`ESCUDO ${ship.shield.toFixed(1)}s`, W / 2, hudY);
      hudY += 18;
    }
  }

  // Nombre del skin tras cambiar con C (se desvanece en el último medio segundo)
  if (skinLabelTimer > 0) {
    const skin = SHIP_SKINS[skinIndex];
    ctx.globalAlpha = Math.min(1, skinLabelTimer / 0.5);
    ctx.fillStyle = skin.color;
    ctx.fillText(`SKIN: ${skin.name}`, W / 2, hudY);
    ctx.globalAlpha = 1;
  }

  // Indicador persistente del bono del skin MORADA mientras está activo
  if (SHIP_SKINS[skinIndex].scoreMultiplier > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = SHIP_SKINS[skinIndex].color;
    ctx.fillText(`PUNTOS x${SHIP_SKINS[skinIndex].scoreMultiplier}`, 14, 46);
    ctx.textAlign = 'center';
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 20);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
