import { useCallback, useEffect, useRef, useState } from "react";
import { LandscapeEnforcer } from "@/components/LandscapeEnforcer";
import { GameEngine, GameState } from "@/lib/gameEngine";
import { Button } from "@/components/ui/button";
import GameHUD from "./GameHUD";
import GameOverScreen from "./GameOverScreen";

interface GameProps {
  playerName: string;
  onBack: () => void;
  play: () => void;
  stop: () => void;
}

const Game = ({ playerName, onBack, play, stop }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    status: "playing",
    score: 0,
    lives: 3,
    playerName,
  });
  const [paused, setPaused] = useState(false);

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    engineRef.current?.stop();
    const engine = new GameEngine(canvasRef.current, playerName, setGameState);
    engineRef.current = engine;
    setGameState({ status: "playing", score: 0, lives: 3, playerName });
    setPaused(false);
    engine.start();
  }, [playerName]);

  useEffect(() => {
    initGame();
    return () => {
      engineRef.current?.stop();
      stop();
    };
  }, [initGame, stop]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (gameState.status !== "playing") return;
    if (paused) stop();
    else play();
  }, [paused, gameState.status, play, stop]);

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
    const canvas = canvasRef.current;
    const ro =
      canvas &&
      new ResizeObserver(() => {
        engineRef.current?.resize();
      });
    if (canvas && ro) ro.observe(canvas);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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
  }, [paused, gameState.status]);

  const handleCanvasPointer = () => {
    if (paused || gameState.status !== "playing") return;
    engineRef.current?.jump();
  };

  const handleQuit = () => {
    stop();
    engineRef.current?.stop();
    onBack();
  };

  const playing = gameState.status === "playing";

  return (
    <LandscapeEnforcer>
      <div className="relative h-full min-h-[100dvh] w-full bg-background select-none">
        <div
          className="absolute inset-0 z-0"
          onPointerDown={handleCanvasPointer}
          onTouchStart={handleCanvasPointer}
          role="presentation"
        >
          <canvas ref={canvasRef} className="w-full h-full block touch-none" />
        </div>

        {playing && paused && (
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

        <GameHUD
          lives={gameState.lives}
          score={gameState.score}
          playerName={gameState.playerName}
          playing={playing}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onQuit={handleQuit}
        />

        {gameState.status === "gameover" && (
          <GameOverScreen
            playerName={gameState.playerName}
            score={gameState.score}
            onRestart={initGame}
          />
        )}
      </div>
    </LandscapeEnforcer>
  );
};

export default Game;
