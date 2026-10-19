import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Voice generation with the browser's built-in Web Speech API: free, no backend, no API key.
 * Long text is split into sentence-sized chunks because Chrome stops a single utterance after ~15 s.
 */

export interface VoiceSection {
  label: string;
  text: string;
}

type Status = "idle" | "playing" | "paused";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;

const toChunks = (text: string, max = 220): string[] => {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const useVoices = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const lang = navigator.language.slice(0, 2);
      // Voices in the user's language first, then English, then the rest.
      const rank = (v: SpeechSynthesisVoice) => (v.lang.startsWith(lang) ? 0 : v.lang.startsWith("en") ? 1 : 2);
      setVoices([...window.speechSynthesis.getVoices()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
};

const Slider = ({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-sm">
      <label htmlFor={id} className="font-semibold text-text">
        {label}
      </label>
      <span className="tabular-nums text-muted">{value.toFixed(1)}×</span>
    </div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
  </div>
);

const VoicePanel = ({ sections }: { sections: VoiceSection[] }) => {
  const voices = useVoices();
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [target, setTarget] = useState("All");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const runRef = useRef(0);

  const text = useMemo(
    () => (target === "All" ? sections.map((s) => s.text).join("\n\n") : sections.find((s) => s.label === target)?.text ?? ""),
    [sections, target],
  );

  const stop = useCallback(() => {
    runRef.current += 1; // invalidates callbacks from the cancelled run
    if (supported) window.speechSynthesis.cancel();
    setStatus("idle");
    setProgress(0);
  }, []);

  // A new script, or leaving the page, stops playback.
  useEffect(() => stop, [sections, stop]);

  const play = () => {
    if (!supported || !text.trim()) return;
    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    stop();
    const run = runRef.current;
    const chunks = toChunks(text);
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? null;
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = rate;
      u.pitch = pitch;
      u.onstart = () => run === runRef.current && setProgress(i / chunks.length);
      u.onend = () => {
        if (run !== runRef.current) return;
        setProgress((i + 1) / chunks.length);
        if (i === chunks.length - 1) setStatus("idle");
      };
      u.onerror = (e) => {
        if (run === runRef.current && e.error !== "interrupted" && e.error !== "canceled") setStatus("idle");
      };
      window.speechSynthesis.speak(u);
    });
    setStatus("playing");
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  if (!supported) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        Voice generation isn't supported in this browser. Try the latest Chrome, Edge or Safari.
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <AudioLines className="h-5 w-5 text-accent" />
        <h3 className="font-bold text-text">Voice generation</h3>
        <span className="ml-auto rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">Free · in browser</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Section to read">
        {["All", ...sections.map((s) => s.label)].map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              stop();
              setTarget(label);
            }}
            aria-pressed={target === label}
            className={cn("chip text-xs", target === label && "chip-active")}
          >
            {label === "All" ? "Full script" : label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={status === "playing" ? pause : play}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-pop transition-colors hover:bg-accent-hover"
          aria-label={status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Listen"}
        >
          {status === "playing" ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {status === "playing" ? "Playing…" : status === "paused" ? "Paused" : "Press play to listen"}
          </p>
        </div>
        <button
          type="button"
          onClick={stop}
          disabled={status === "idle"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-text disabled:opacity-40"
          aria-label="Stop"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="voice" className="mb-1.5 block text-sm font-semibold text-text">
            Voice
          </label>
          <select id="voice" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} className="input-field py-2 text-sm">
            <option value="">System default</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <Slider id="rate" label="Speed" value={rate} min={0.5} max={2} step={0.1} onChange={setRate} />
        <Slider id="pitch" label="Pitch" value={pitch} min={0.5} max={1.5} step={0.1} onChange={setPitch} />
      </div>
      <p className="mt-3 text-xs text-muted">Changes to voice, speed or pitch apply the next time you press play.</p>
    </div>
  );
};

export default VoicePanel;
