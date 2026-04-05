import { useEffect, useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";

/**
 * Em viewports “tipo telemóvel” em modo retrato, pede para rodar o dispositivo.
 * Em landscape ou em ecrãs largos, não interfere.
 */
function shouldShowRotateHint(): boolean {
  if (typeof window === "undefined") return false;
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  if (!portrait) return false;
  const narrow = window.matchMedia("(max-width: 932px)").matches;
  return narrow;
}

export function LandscapeEnforcer({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => setShow(shouldShowRotateHint());
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

  return (
    <>
      {children}
      {show && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-title"
          aria-describedby="rotate-desc"
        >
          <Smartphone
            className="h-16 w-16 text-primary shrink-0 animate-pulse"
            style={{ transform: "rotate(90deg)" }}
            aria-hidden
          />
          <div className="space-y-2 max-w-sm">
            <h1 id="rotate-title" className="text-xl font-bold text-foreground">
              Gira o telemóvel
            </h1>
            <p id="rotate-desc" className="text-sm text-muted-foreground leading-relaxed">
              Este jogo funciona em modo horizontal. Roda o ecrã para o lado para continuar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
