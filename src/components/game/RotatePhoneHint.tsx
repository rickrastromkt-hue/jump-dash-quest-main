import { useCallback, useEffect, useRef, useState } from "react";

function isLikelyPhonePortrait(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 1024px)").matches;
  const portrait = window.innerHeight > window.innerWidth;
  return coarse && narrow && portrait;
}

interface RotatePhoneHintProps {
  onContinue: () => void;
}

const BANNER_MS = 3000;

/**
 * Em retrato no telemóvel: bloco translúcido só com o título, ~3s, sem botão.
 * O jogo só inicia depois (onContinue).
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
    if (!isLikelyPhonePortrait()) {
      fireContinue();
      return;
    }

    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      fireContinue();
    }, BANNER_MS);

    return () => {
      window.clearTimeout(t);
    };
  }, [fireContinue]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-6 z-[200] w-[min(92vw,20rem)] -translate-x-1/2 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-center shadow-lg backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold leading-snug text-white/95">
        Gire seu celular para jogar na horizontal
      </p>
    </div>
  );
}
