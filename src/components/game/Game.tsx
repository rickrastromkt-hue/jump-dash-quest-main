import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, GameState } from "@/lib/gameEngine";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import GameHUD from "./GameHUD";
import GameOverScreen from "./GameOverScreen";

interface GameProps {
  playerName: string;
  onBack: () => void;
  play: () => void;
  stop: () => void;
  pause: () => void;
}

const Game = ({ playerName, onBack, play, stop, pause }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    status: "playing",
    score: 0,
    lives: 3,
    playerName,
  });
  const [paused, setPaused] = useState(false);
  const [gameStarted] = useState(true);
  const [showRotateHint, setShowRotateHint] = useState(true);

  const hitResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    engineRef.current?.stop();
    const engine = new GameEngine(canvasRef.current, playerName, setGameState);
    engine.setOnHit(() => {
      pause();
      if (hitResumeTimer.current) clearTimeout(hitResumeTimer.current);
      hitResumeTimer.current = setTimeout(() => play(), 500);
    });
    engineRef.current = engine;
    setGameState({ status: "playing", score: 0, lives: 3, playerName });
    setShowRotateHint(true);
    setPaused(true);
    engine.start();
  }, [playerName, pause, play]);

  useEffect(() => {
    if (!gameStarted) return;
    initGame();
    return () => {
      engineRef.current?.stop();
      stop();
    };
  }, [gameStarted, initGame, stop]);

  useEffect(() => {
    if (!showRotateHint) return;
    const t = window.setTimeout(() => {
      setShowRotateHint(false);
      setPaused(false);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [showRotateHint]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (!gameStarted || gameState.status !== "playing") return;
    if (paused) stop();
    else play();
  }, [gameStarted, paused, gameState.status, play, stop]);

  // Stop music on game over; limpa pausa para o próximo jogo
  useEffect(() => {
    if (gameState.status === "gameover") {
      stop();
      setPaused(false);
    }
  }, [gameState.status, stop]);

  useEffect(() => {
    const handleResize = () => engineRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      if (e.code === "Escape" && gameState.status === "playing") {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (paused) {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          setPaused(false);
        }
        return;
      }
      if (gameState.status !== "playing") return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        engineRef.current?.jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameStarted, paused, gameState.status]);

  const handleCanvasPointer = () => {
    if (!gameStarted || paused || gameState.status !== "playing") return;
    engineRef.current?.jump();
  };

  const handleQuit = () => {
    stop();
    engineRef.current?.stop();
    onBack();
  };

  const playing = gameState.status === "playing";

  return (
    <div className="relative w-full h-screen bg-background select-none">
      <div
        className="absolute inset-0 z-0"
        onPointerDown={handleCanvasPointer}
        onTouchStart={handleCanvasPointer}
        role="presentation"
      >
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />
      </div>

      {showRotateHint && (
        <div
          className="absolute inset-0 z-[20] flex items-center justify-center p-6"
          aria-live="polite"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/20 bg-background/50 px-8 py-8 text-center shadow-2xl backdrop-blur-sm">
            <Smartphone
              className="h-14 w-14 rotate-90 text-primary"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-base font-semibold leading-snug text-foreground">
              Gire o celular para uma melhor jogabilidade.
            </p>
          </div>
        </div>
      )}

      {gameStarted && playing && paused && !showRotateHint && (
        <div
          className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-2xl font-bold text-foreground tracking-tight">Pausado</p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button className="w-full" onClick={() => setPaused(false)}>
              Continuar
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleQuit}>
              Sair do jogo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Espaço = pular · Esc = pausa</p>
        </div>
      )}

      {gameStarted && (
        <GameHUD
          lives={gameState.lives}
          score={gameState.score}
          playerName={gameState.playerName}
          playing={playing}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onQuit={handleQuit}
        />
      )}

      {gameState.status === "gameover" && (
        <GameOverScreen
          playerName={gameState.playerName}
          score={gameState.score}
          onRestart={initGame}
        />
      )}
    </div>
  );
};

export default Game;
