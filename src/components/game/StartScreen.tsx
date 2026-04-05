import { useState } from "react";
import huffHomeUrl from "@/assets/game/huff-home.png";

interface StartScreenProps {
  onStart: (name: string) => void;
  scores: { name: string; score: number }[];
}

const StartScreen = ({ onStart, scores }: StartScreenProps) => {
  const [name, setName] = useState("");

  const handleStart = () => {
    if (name.trim()) onStart(name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <img
        src={huffHomeUrl}
        alt="Jump Dash Quest"
        className="mb-8 w-full max-w-md md:max-w-lg object-contain select-none"
        draggable={false}
      />

      <div className="w-full max-w-xs space-y-4">
        <input
          type="text"
          placeholder="Seu nome..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          maxLength={15}
          className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          style={{ boxShadow: name.trim() ? "0 0 20px hsl(199 78% 72% / 0.45)" : "none" }}
        >
          JOGAR
        </button>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Espaço / Toque = Pular
      </div>

      {scores.length > 0 && (
        <div className="mt-8 w-full max-w-xs">
          <h3 className="text-accent font-bold text-sm mb-2 text-center">🏆 RANKING</h3>
          <div className="space-y-1">
            {scores.slice(0, 5).map((s, i) => (
              <div key={i} className="flex justify-between px-3 py-1.5 rounded bg-muted text-sm">
                <span className="text-muted-foreground">{i + 1}. {s.name}</span>
                <span className="text-primary font-mono">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StartScreen;
