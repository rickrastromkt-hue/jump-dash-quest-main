import { playJumpSound, playHitSound, playGameOverSound } from "./audio";

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
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const GRAVITY = 0.55;
const JUMP_FORCE = -14;
const GROUND_OFFSET = 60;

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
  private speed = 5;
  private obstacleTimer = 0;
  private obstacleInterval = 90;
  private elapsed = 0;
  private animId = 0;
  private groundY = 0;
  private onStateChange: (state: GameState) => void;
  private state: GameState;
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
    onStateChange: (state: GameState) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onStateChange = onStateChange;
    this.state = { status: "playing", score: 0, lives: 3, playerName };
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
    this.obstacleInterval = Math.max(56, 102 - this.elapsed * 0.007);
    this.state.score = Math.floor(this.elapsed / 6);

    this.bgOffset = (this.bgOffset + this.speed * 0.3) % w;

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

    // Obstacles
    this.obstacleTimer++;
    if (this.obstacleTimer >= this.obstacleInterval) {
      this.obstacleTimer = 0;
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
        if (this.collides(this.player, obstacleHitBox(o))) {
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
    }

    // Particles
    this.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; });
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

    // Ground with tile image
    const gImg = this.images.groundTileImg;
    if (gImg && gImg.complete && gImg.naturalWidth > 0) {
      const tileW = 64, tileH = 64;
      for (let tx = 0; tx < w + tileW; tx += tileW) {
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

    // Obstacles with image
    const oImg = this.images.obstacleImg;
    this.obstacles.forEach((o) => {
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

      // Draw player frame
      const frames = this.images.playerFrames;
      const frameImg = frames ? frames[p.frame % frames.length] : null;
      if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
        ctx.drawImage(frameImg, p.x, p.y, p.width, p.height);
      } else {
        ctx.fillStyle = "#4a90d9";
        ctx.fillRect(p.x, p.y, p.width, p.height);
      }

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

  private saveScore() {
    const scores = this.getScores();
    scores.push({ name: this.state.playerName, score: this.state.score });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem("runner_scores", JSON.stringify(scores.slice(0, 10)));
  }

  getScores(): { name: string; score: number }[] {
    try {
      return JSON.parse(localStorage.getItem("runner_scores") || "[]");
    } catch {
      return [];
    }
  }
}
