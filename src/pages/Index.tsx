import { useState, useEffect } from "react";
import StartScreen from "@/components/game/StartScreen";
import Game from "@/components/game/Game";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { getTopFans, type Fan } from "@/lib/firestore";

const Index = () => {
  const [currentFan, setCurrentFan] = useState<Fan | null>(null);
  const [topFans, setTopFans] = useState<Fan[]>([]);
  const [loadingFans, setLoadingFans] = useState(false);
  const { play, stop } = useYouTubePlayer("5m1ysywXMgE");

  useEffect(() => {
    if (!currentFan) stop();
  }, [currentFan, stop]);

  // Recarrega o ranking toda vez que o jogador volta ao ecrã inicial
  useEffect(() => {
    if (currentFan) return;
    setLoadingFans(true);
    getTopFans(5)
      .then(setTopFans)
      .catch(() => setTopFans([]))
      .finally(() => setLoadingFans(false));
  }, [currentFan]);

  if (!currentFan) {
    return (
      <StartScreen
        onStart={setCurrentFan}
        topFans={topFans}
        loadingFans={loadingFans}
      />
    );
  }

  return (
    <Game
      fan={currentFan}
      onBack={() => setCurrentFan(null)}
      play={play}
      stop={stop}
    />
  );
};

export default Index;
