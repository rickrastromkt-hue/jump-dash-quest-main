import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

const SESSION_DISMISS_KEY = "runner_rotate_hint_dismissed_session";

function isLikelyPhonePortrait(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 1024px)").matches;
  const portrait = window.innerHeight > window.innerWidth;
  return coarse && narrow && portrait;
}

interface RotatePhoneHintProps {
  onContinue: () => void;
}

/**
 * Aviso em retrato no telemóvel: fundo escuro semitransparente.
 * Só bloqueia o início do jogo até "Entendi", virar para paisagem ou já ter fechado na sessão.
 */
export function RotatePhoneHint({ onContinue }: RotatePhoneHintProps) {
  const [visible, setVisible] = useState(false);
  const continuedRef = useRef(false);

  const fireContinue = useCallback(() => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onContinue();
  }, [onContinue]);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
      fireContinue();
      return;
    }
    if (!isLikelyPhonePortrait()) {
      fireContinue();
      return;
    }
    setVisible(true);
  }, [fireContinue]);

  useEffect(() => {
    if (!visible) return;
    const maybeContinue = () => {
      if (window.innerWidth > window.innerHeight) {
        setVisible(false);
        fireContinue();
      }
    };
    window.addEventListener("resize", maybeContinue);
    window.addEventListener("orientationchange", maybeContinue);
    return () => {
      window.removeEventListener("resize", maybeContinue);
      window.removeEventListener("orientationchange", maybeContinue);
    };
  }, [visible, fireContinue]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setVisible(false);
    fireContinue();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-hint-title"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border/80 bg-card/90 p-6 shadow-2xl text-center space-y-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center text-primary">
          <Smartphone className="h-12 w-12 rotate-90" aria-hidden />
        </div>
        <div className="space-y-3 text-foreground">
          <h2 id="rotate-hint-title" className="text-lg font-bold leading-snug">
            Gire o celular
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O jogo pode ficar melhor no modo paisagem: mais espaço na tela e visão mais confortável
            dos obstáculos.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vire o aparelho para a horizontal ou toque abaixo para jogar assim mesmo.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={dismiss}>
          Entendi, jogar assim
        </Button>
      </div>
    </div>
  );
}
