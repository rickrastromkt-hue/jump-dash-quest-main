import { useState, useEffect } from "react";
import StartScreen from "@/components/game/StartScreen";
import Game from "@/components/game/Game";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

const Index = () => {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const { play, stop } = useYouTubePlayer("5m1ysywXMgE");

  useEffect(() => {
    if (!playerName) stop();
  }, [playerName, stop]);

  const getScores = (): { name: string; score: number }[] => {
    try {
      return JSON.parse(localStorage.getItem("runner_scores") || "[]");
    } catch {
      return [];
    }
  };

  if (!playerName) {
    return <StartScreen onStart={setPlayerName} scores={getScores()} />;
  }

  return (
    <Game
      playerName={playerName}
      onBack={() => setPlayerName(null)}
      play={play}
      stop={stop}
    />
  );
};

export default Index;
