interface GameOverScreenProps {
  playerName: string;
  score: number;
  onRestart: () => void;
}

const GameOverScreen = ({ playerName, score, onRestart }: GameOverScreenProps) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-20">
    <h2 className="text-4xl font-bold text-destructive mb-2"
      style={{ textShadow: "0 0 20px hsl(0 85% 55% / 0.5)" }}>
      GAME OVER
    </h2>
    <p className="text-muted-foreground mb-1">{playerName}</p>
    <p className="text-3xl font-mono font-bold text-primary mb-6"
      style={{ textShadow: "0 0 15px hsl(199 78% 72% / 0.5)" }}>
      {score}
    </p>
    <button
      onClick={onRestart}
      className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105"
      style={{ boxShadow: "0 0 20px hsl(199 78% 72% / 0.45)" }}
    >
      JOGAR NOVAMENTE
    </button>
  </div>
);

export default GameOverScreen;
