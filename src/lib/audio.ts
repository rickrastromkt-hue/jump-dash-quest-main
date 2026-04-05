import gameOverUrl from "../assets/audio/game-over.mp3";

// Synthesized arcade sounds using Web Audio API
let audioCtx: AudioContext | null = null;
let gameOverAudio: HTMLAudioElement | null = null;

function playGameOverMp3() {
  if (!gameOverAudio) gameOverAudio = new Audio(gameOverUrl);
  gameOverAudio.currentTime = 0;
  void gameOverAudio.play().catch(() => {});
}

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playJumpSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playHitSound() {
  playGameOverMp3();
}

export function playGameOverSound() {
  playGameOverMp3();
}
