import { playJumpSound, playHitSound, playGameOverSound } from "./audio";
import { updateFanScore } from "./firestore";

// ====== PLACEHOLDER IMAGES ======
// To customize, just replace these PNGs in src/assets/game/:
//   player_frame_1.png .. player_frame_4.png  (64x74 each, transparent bg)
//   ground_tile.png                            (64x64, seamless tile)
//   obstacle.png                               (40x60, transparent bg)
import playerFrame1Url from "../assets/game/player_frame_1.png";
import playerFrame2Url from "../assets/game/player_frame_2.png";
import playerFrame3Url from "../assets/game/player_frame_3.png";
import playerFrame4Url from "../assets/game/player_frame_4.png";
import groundTileUrl from "../assets/game/ground_tile.png";
import obstacleUrl from "../assets/game/obstacle.png";

const playerFrameUrls = [playerFrame1Url, playerFrame2Url, playerFrame3Url, playerFrame4Url];

let playerFrames: HTMLImageElement[] | null = null;
let groundTileImg: HTMLImageElement | null = null;
let obstacleImg: HTMLImageElement | null = null;

function loadGameImages() {
  if (!playerFrames) {
    playerFrames = playerFrameUrls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });
  }
  if (!groundTileImg) {
    groundTileImg = new Image();
    groundTileImg.src = groundTileUrl;
  }
  if (!obstacleImg) {
    obstacleImg = new Image();
    obstacleImg.src = obstacleUrl;
  }
  return { playerFrames, groundTileImg, obstacleImg };
}

export interface GameState {
  status: "playing" | "gameover";
  score: number;
  lives: number;
  playerName: string;
}

interface Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  frame: number;
  frameTimer: number;
  invincible: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  scored: boolean;
  isBonus?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -17;
const GROUND_OFFSET = 60;

/** Duração total do arco de salto em frames: tempo subida + descida. */
const JUMP_DURATION_FRAMES = (2 * Math.abs(JUMP_FORCE)) / GRAVITY; // ~42.5 frames

/** Duração do modo bónus em frames (~5 segundos a 60fps). */
const BONUS_DURATION = 300;

/** Janela de spawn do bónus: 1.5s a 9s de jogo (em frames). */
const BONUS_SPAWN_MIN = 90;
const BONUS_SPAWN_MAX = 540;

/** Margens da hitbox do jogador (sprite 160×65 tem bastante área vazia nas laterais). */
const PLAYER_HIT_PAD_X = 26;
const PLAYER_HIT_PAD_Y = 8;

/**
 * Hitbox mais estreita só pela traseira (esquerda): transparência típica da PNG.
 * A frente (direita, bate primeiro no jogador) usa a borda do desenho — sem insetR.
 */
function obstacleHitBox(o: Obstacle): { x: number; y: number; width: number; height: number } {
  const insetL = Math.min(14, Math.max(3, o.width * 0.28));
  const insetR = 0;
  const insetTop = Math.min(8, Math.max(2, o.height * 0.1));
  const insetBottom = Math.min(6, Math.max(2, o.height * 0.06));
  const w = Math.max(6, o.width - insetL - insetR);
  const h = Math.max(8, o.height - insetTop - insetBottom);
  return { x: o.x + insetL, y: o.y + insetTop, width: w, height: h };
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private bgOffset = 0;
  private groundOffset = 0;
  private speed = 5;
  private pixelsSinceLastObstacle = 0;
  private nextObstacleGap = 280;
  private elapsed = 0;
  private bonusActive = 0;
  private bonusSpawnAt = 0;
  private bonusSpawned = false;
  private animId = 0;
  private groundY = 0;
  private onStateChange: (state: GameState) => void;
  private state: GameState;
  private whatsapp: string;
  private clouds: { x: number; y: number; w: number; h: number; speed: number }[] = [];
  private images: ReturnType<typeof loadGameImages>;
  private paused = false;

  private initClouds() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * w,
        y: 20 + Math.random() * (this.groundY * 0.4),
        w: 50 + Math.random() * 60,
        h: 18 + Math.random() * 14,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
  }

  constructor(
    canvas: HTMLCanvasElement,
    playerName: string,
    whatsapp: string,
    onStateChange: (state: GameState) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onStateChange = onStateChange;
    this.whatsapp = whatsapp;
    this.state = { status: "playing", score: 0, lives: 1, playerName };
    this.bonusSpawnAt = BONUS_SPAWN_MIN + Math.floor(Math.random() * (BONUS_SPAWN_MAX - BONUS_SPAWN_MIN));
    this.player = this.createPlayer();
    this.images = loadGameImages();
    this.resize();
    this.initClouds();
  }

  private createPlayer(): Player {
    return {
      x: 80, y: 0, vy: 0, width: 160, height: 65,
      grounded: true, frame: 0, frameTimer: 0, invincible: 0,
    };
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.groundY = rect.height - GROUND_OFFSET;
    this.player.y = this.groundY - this.player.height;
  }

  jump() {
    if (this.paused || !this.player.grounded || this.state.status !== "playing") return;
    this.player.vy = JUMP_FORCE;
    this.player.grounded = false;
    playJumpSound();
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  start() { this.loop(); }
  stop() { cancelAnimationFrame(this.animId); }

  private loop = () => {
    this.update();
    this.draw();
    if (this.state.status === "playing") {
      this.animId = requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.paused) return;

    const w = this.canvas.width / (window.devicePixelRatio || 1);
    this.elapsed++;

    this.speed = 5 + this.elapsed * 0.00075;
    this.state.score = Math.floor(this.elapsed / 6);

    this.bgOffset = (this.bgOffset + this.speed * 0.3) % w;
    this.groundOffset = (this.groundOffset + this.speed) % 64;

    // Player physics
    this.player.vy += GRAVITY;
    this.player.y += this.player.vy;
    if (this.player.y >= this.groundY - this.player.height) {
      this.player.y = this.groundY - this.player.height;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    this.player.frameTimer++;
    if (this.player.frameTimer > 6) {
      this.player.frame = (this.player.frame + 1) % 4;
      this.player.frameTimer = 0;
    }
    if (this.player.invincible > 0) this.player.invincible--;

    // Bónus spawn: uma vez, em momento aleatório nos primeiros 10s
    if (!this.bonusSpawned && this.elapsed >= this.bonusSpawnAt && this.elapsed <= 620) {
      this.bonusSpawned = true;
      const bSize = 48;
      this.obstacles.push({
        x: w + 20, y: this.groundY - bSize,
        width: bSize, height: bSize, scored: false, isBonus: true,
      });
    }

    // Bónus countdown + auto-jump
    if (this.bonusActive > 0) {
      this.bonusActive--;
      if (this.player.grounded) {
        this.player.vy = JUMP_FORCE * 0.78;
        this.player.grounded = false;
      }
    }

    // Obstacles — espaçamento baseado em pixels percorridos (= velocidade × tempo de salto)
    this.pixelsSinceLastObstacle += this.speed;
    if (this.pixelsSinceLastObstacle >= this.nextObstacleGap) {
      this.pixelsSinceLastObstacle = 0;
      const comfDist = JUMP_DURATION_FRAMES * this.speed;
      this.nextObstacleGap = comfDist * (1.2 + Math.random() * 1.3);
      const oh = 30 + Math.random() * 40;
      this.obstacles.push({
        x: w + 20, y: this.groundY - oh,
        width: 24 + Math.random() * 16, height: oh, scored: false,
      });
    }
    this.obstacles.forEach((o) => (o.x -= this.speed));
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > -50);

    // Collision
    if (this.player.invincible <= 0) {
      for (const o of this.obstacles) {
        const box = o.isBonus ? o : obstacleHitBox(o);
        if (!this.collides(this.player, box)) continue;

        if (o.isBonus) {
          // Coleta bónus
          this.bonusActive = BONUS_DURATION;
          this.obstacles = this.obstacles.filter((ob) => ob !== o);
          for (let i = 0; i < 26; i++) {
            this.particles.push({
              x: o.x + o.width / 2, y: o.y + o.height / 2,
              vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
              life: 1,
              color: `hsl(${38 + Math.random() * 20}, 100%, ${55 + Math.random() * 20}%)`,
            });
          }
          break;
        }

        // Invencível durante o bónus — passa por cima
        if (this.bonusActive > 0) continue;

        // Hit normal
        this.state.lives--;
        this.player.invincible = 60;
        this.spawnHitParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        if (this.state.lives <= 0) {
          this.state.status = "gameover";
          playGameOverSound();
          this.saveScore();
          this.onStateChange({ ...this.state });
          return;
        } else {
          playHitSound();
        }
        break;
      }
    }

    // Partículas de fogo durante o bónus
    if (this.bonusActive > 0) {
      for (let i = 0; i < 5; i++) {
        const bx = this.player.x + this.player.width * 0.15 + Math.random() * this.player.width * 0.7;
        const by = this.player.y + this.player.height * 0.45 + Math.random() * this.player.height * 0.55;
        this.particles.push({
          x: bx, y: by,
          vx: (Math.random() - 0.5) * 4 - this.speed * 0.45,
          vy: -(Math.random() * 5 + 1.5),
          life: 0.45 + Math.random() * 0.5,
          color: Math.random() < 0.3
            ? `hsl(${50 + Math.random() * 15}, 100%, ${70 + Math.random() * 20}%)`
            : `hsl(${8 + Math.random() * 30}, 100%, ${52 + Math.random() * 28}%)`,
        });
      }
    }

    // Particles
    this.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life -= 0.022; });
    this.particles = this.particles.filter((p) => p.life > 0);

    this.onStateChange({ ...this.state });
  }

  private collides(
    p: Player,
    box: { x: number; y: number; width: number; height: number }
  ) {
    const lx = p.x + PLAYER_HIT_PAD_X;
    const rx = p.x + p.width - PLAYER_HIT_PAD_X;
    const ty = p.y + PLAYER_HIT_PAD_Y;
    const by = p.y + p.height - PLAYER_HIT_PAD_Y;
    return lx < box.x + box.width && rx > box.x && ty < box.y + box.height && by > box.y;
  }

  private spawnHitParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 1, color: `hsl(${30 + Math.random() * 20}, 80%, 50%)`,
      });
    }
  }

  private draw() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    // Clean blue sky
    const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0, "#1e90ff");
    grad.addColorStop(0.5, "#63b3ed");
    grad.addColorStop(1, "#a0d2f0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, this.groundY);

    // Clouds
    this.clouds.forEach((c) => {
      c.x -= c.speed * this.speed * 0.08;
      if (c.x + c.w < -20) c.x = w + 20 + Math.random() * 100;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x - c.w * 0.25, c.y + 2, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + c.w * 0.25, c.y + 1, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground with tile image (scrolling at game speed)
    const gImg = this.images.groundTileImg;
    if (gImg && gImg.complete && gImg.naturalWidth > 0) {
      const tileW = 64, tileH = 64;
      const startX = -(this.groundOffset % tileW);
      for (let tx = startX; tx < w + tileW; tx += tileW) {
        for (let ty = this.groundY; ty < h; ty += tileH) {
          ctx.drawImage(gImg, tx, ty, tileW, tileH);
        }
      }
    } else {
      ctx.fillStyle = "#8a8070";
      ctx.fillRect(0, this.groundY, w, h - this.groundY);
    }

    // Ground top edge
    ctx.strokeStyle = "rgba(100,90,70,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();

    // Obstacles
    const oImg = this.images.obstacleImg;
    this.obstacles.forEach((o) => {
      if (o.isBonus) {
        this.drawBonusObstacle(ctx, o);
        return;
      }
      if (oImg && oImg.complete && oImg.naturalWidth > 0) {
        ctx.drawImage(oImg, o.x, o.y, o.width, o.height);
      } else {
        ctx.fillStyle = "#8B6914";
        ctx.fillRect(o.x, o.y, o.width, o.height);
      }
    });

    // Player
    const p = this.player;
    const blink = p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0;
    if (!blink) {
      ctx.save();

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.width / 2, this.groundY + 2, 50, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow dourado durante o bónus
      if (this.bonusActive > 0) {
        const pulse = 0.75 + 0.25 * Math.sin(this.elapsed * 0.35);
        ctx.filter = `drop-shadow(0 0 ${Math.round(10 * pulse)}px #FFD700) drop-shadow(0 0 ${Math.round(5 * pulse)}px #FF6600)`;
      }

      // Draw player frame
      const frames = this.images.playerFrames;
      const frameImg = frames ? frames[p.frame % frames.length] : null;
      if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
        ctx.drawImage(frameImg, p.x, p.y, p.width, p.height);
      } else {
        ctx.fillStyle = "#4a90d9";
        ctx.fillRect(p.x, p.y, p.width, p.height);
      }

      ctx.filter = "none";
      ctx.restore();
    }

    // Particles
    this.particles.forEach((pt) => {
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Running dust
    if (this.player.grounded && this.elapsed % 4 === 0) {
      this.particles.push({
        x: this.player.x + 10, y: this.groundY - 2,
        vx: -Math.random() * 2 - 1, vy: -Math.random() * 1.5,
        life: 0.6, color: "rgba(140,130,110,0.5)",
      });
    }
  }

  private drawBonusObstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const r = Math.min(o.width, o.height) * 0.46;
    const pulse = 0.86 + 0.14 * Math.sin(this.elapsed * 0.22);
    const angle = -Math.PI / 2 + this.elapsed * 0.045;

    // Aura externa
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2 * pulse);
    grd.addColorStop(0,   "rgba(255,220,0,0.60)");
    grd.addColorStop(0.45,"rgba(255,140,0,0.28)");
    grd.addColorStop(1,   "rgba(255,60,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Estrela
    ctx.save();
    this.drawStar(ctx, cx, cy, r * pulse, angle);
    ctx.fillStyle   = "#FFD700";
    ctx.strokeStyle = "#FF8C00";
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Brilho central
    const inner = ctx.createRadialGradient(cx, cy - r * 0.15, 0, cx, cy, r * 0.65 * pulse);
    inner.addColorStop(0,   "rgba(255,255,200,0.75)");
    inner.addColorStop(1,   "rgba(255,200,0,0)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 0.65 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, startAngle: number) {
    const inner = r * 0.42;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = startAngle + (i * Math.PI) / 5;
      const dist = i % 2 === 0 ? r : inner;
      const px = cx + dist * Math.cos(a);
      const py = cy + dist * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else         ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private saveScore() {
    updateFanScore(this.whatsapp, this.state.score).catch(console.error);
  }
}
