import { useEffect } from "react";

const GLASS = ".glass, .card, .btn-secondary, .glass-strong, .glass-dark";

/**
 * One page-wide pointer listener that moves the specular highlight of whichever
 * glass surface is under the cursor (sets --mx / --my used by .glass::before).
 */
const GlassPointer = () => {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = (e.target as Element | null)?.closest?.(GLASS) as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
};

export default GlassPointer;
