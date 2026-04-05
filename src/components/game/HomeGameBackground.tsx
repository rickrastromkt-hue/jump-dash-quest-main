import groundTileUrl from "@/assets/game/ground_tile.png";

const GROUND_PX = 60;

const CLOUDS: { top: string; width: number; duration: number; delay: number; scale: number }[] = [
  { top: "6%", width: 120, duration: 52, delay: -8, scale: 0.9 },
  { top: "14%", width: 160, duration: 68, delay: -35, scale: 1.05 },
  { top: "22%", width: 100, duration: 44, delay: -18, scale: 0.75 },
  { top: "10%", width: 140, duration: 58, delay: -42, scale: 0.95 },
  { top: "18%", width: 130, duration: 76, delay: -5, scale: 0.85 },
];

/**
 * Cenário do jogo (céu + chão com tile) sem personagem/obstáculos; nuvens em CSS.
 */
export function HomeGameBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-x-0 top-0"
        style={{
          bottom: GROUND_PX,
          background: "linear-gradient(to bottom, #1e90ff 0%, #63b3ed 50%, #a0d2f0 100%)",
        }}
      />

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="absolute left-0 motion-reduce:animate-none animate-cloud-drift will-change-transform"
          style={{
            top: c.top,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <div
            className="relative h-10"
            style={{
              width: c.width,
              transform: `scale(${c.scale})`,
              transformOrigin: "left center",
            }}
          >
            <div
              className="absolute rounded-full bg-white/[0.78]"
              style={{
                width: c.width * 0.42,
                height: c.width * 0.26,
                left: 0,
                top: "18%",
              }}
            />
            <div
              className="absolute rounded-full bg-white/[0.78]"
              style={{
                width: c.width * 0.32,
                height: c.width * 0.22,
                left: c.width * 0.22,
                top: "28%",
              }}
            />
            <div
              className="absolute rounded-full bg-white/[0.78]"
              style={{
                width: c.width * 0.38,
                height: c.width * 0.24,
                left: c.width * 0.48,
                top: "20%",
              }}
            />
          </div>
        </div>
      ))}

      <div
        className="absolute inset-x-0 bottom-0 bg-repeat-x"
        style={{
          height: GROUND_PX,
          backgroundImage: `url(${groundTileUrl})`,
          backgroundSize: "64px 64px",
        }}
      />

      <div
        className="absolute inset-x-0 bg-[rgba(100,90,70,0.55)]"
        style={{ bottom: GROUND_PX, height: 2 }}
      />
    </div>
  );
}
