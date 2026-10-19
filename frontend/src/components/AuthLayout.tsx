import type { ReactNode } from "react";
import { AudioLines, Library, ShieldCheck, Sparkles } from "lucide-react";

const POINTS = [
  { icon: Sparkles, text: "Platform-ready scripts in seconds" },
  { icon: AudioLines, text: "Hear every script with voice generation" },
  { icon: Library, text: "Grounded in your own brand documents" },
  { icon: ShieldCheck, text: "Quality checks in assisted mode" },
];

/** Split-screen shell for login and sign-up: the form on the left, a product panel on the right. */
const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="grid min-h-screen lg:grid-cols-2">
    <div className="relative flex items-center justify-center px-4 pt-28 pb-16 sm:px-8">
      <div className="hero-glow absolute inset-0 -z-10 lg:hidden" aria-hidden />
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-text sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>

    <aside className="relative hidden overflow-hidden bg-ink lg:flex lg:items-center lg:justify-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 50% at 30% 20%, rgb(var(--accent) / .55), transparent 70%), radial-gradient(40% 40% at 80% 90%, rgb(217 70 239 / .35), transparent 70%)",
        }}
      />
      <div className="relative max-w-md px-10">
        <p className="text-3xl font-bold leading-tight text-white text-balance">Write it, hear it, ship it. All in one place.</p>
        <ul className="mt-10 space-y-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-4 glass-dark rounded-2xl px-5 py-4 text-on-ink">
              <Icon className="h-5 w-5 text-[#c4b5fd]" /> {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </div>
);

export default AuthLayout;
