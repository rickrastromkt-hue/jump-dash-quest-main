import { Button } from "@/components/ui/button";
import { Heart, LogOut, Pause, Play } from "lucide-react";

interface GameHUDProps {
  lives: number;
  score: number;
  playerName: string;
  playing: boolean;
  paused: boolean;
  onTogglePause: () => void;
  onQuit: () => void;
}

const GameHUD = ({
  lives,
  score,
  playerName,
  playing,
  paused,
  onTogglePause,
  onQuit,
}: GameHUDProps) => (
  <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center gap-2 px-3 py-3 sm:px-4 pointer-events-none">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-foreground text-sm font-bold truncate max-w-[40vw] sm:max-w-none">
        {playerName}
      </span>
      <div className="flex gap-1 shrink-0">
        {[0, 1, 2].map((i) => (
          <Heart
            key={i}
            className="h-5 w-5"
            strokeWidth={1.75}
            fill={i < lives ? "currentColor" : "none"}
            color={i < lives ? "hsl(0 85% 55%)" : "hsl(230 15% 35%)"}
          />
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
      <div
        className="text-primary font-mono font-bold text-base sm:text-lg tabular-nums"
        style={{ textShadow: "0 0 10px hsl(199 78% 72% / 0.5)" }}
      >
        {score}
      </div>
      {playing && (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 border-primary/40 bg-background/80"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePause();
            }}
            aria-label={paused ? "Continuar" : "Pausar"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 border-primary/40 bg-background/80 text-xs sm:text-sm px-2 sm:px-3"
            onClick={(e) => {
              e.stopPropagation();
              onQuit();
            }}
          >
            <LogOut className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </>
      )}
    </div>
  </div>
);

export default GameHUD;
