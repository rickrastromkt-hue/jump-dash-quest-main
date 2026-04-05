import { useEffect, useState, type ReactNode } from "react";

/**
 * Em telemóvel em retrato, roda o conteúdo 90° (landscape “lógico”) sem exigir giro físico.
 * Em landscape ou ecrã largo, o jogo ocupa o ecrã normalmente.
 */
function shouldRotateContent(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(orientation: portrait)").matches) return false;
  return window.matchMedia("(max-width: 932px)").matches;
}

export function LandscapeEnforcer({ children }: { children: ReactNode }) {
  const [rotate, setRotate] = useState(false);

  useEffect(() => {
    const update = () => setRotate(shouldRotateContent());
    update();
    const mqPortrait = window.matchMedia("(orientation: portrait)");
    const mqNarrow = window.matchMedia("(max-width: 932px)");
    mqPortrait.addEventListener("change", update);
    mqNarrow.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mqPortrait.removeEventListener("change", update);
      mqNarrow.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!rotate) {
    return (
      <div className="relative h-[100dvh] min-h-[100svh] w-full overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-background">
      <div
        className="absolute left-1/2 top-1/2 box-border"
        style={{
          width: "100vh",
          height: "100vw",
          maxHeight: "100vw",
          maxWidth: "100vh",
          transform: "translate(-50%, -50%) rotate(90deg)",
          WebkitTransform: "translate(-50%, -50%) rotate(90deg)",
        }}
      >
        <div className="relative h-full w-full min-h-0 min-w-0">{children}</div>
      </div>
    </div>
  );
}
