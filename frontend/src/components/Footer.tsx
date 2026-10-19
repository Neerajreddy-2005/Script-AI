import { Link } from "react-router-dom";
import { Github, Instagram, Linkedin, Mail } from "lucide-react";
import { Logo } from "./Navbar";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/how-it-works", label: "How it works" },
      { to: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/blog", label: "Blog" },
      { to: "/help-center", label: "Help center" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy-policy", label: "Privacy policy" },
      { to: "/terms-of-service", label: "Terms of service" },
    ],
  },
];

const SOCIALS = [
  { href: "https://github.com/Neerajreddy-2005/Script-AI", label: "GitHub", icon: Github },
  { href: "#", label: "LinkedIn", icon: Linkedin },
  { href: "#", label: "Instagram", icon: Instagram },
];

const Footer = () => (
  <footer className="bg-ink text-on-ink">
    <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
      <div className="space-y-5">
        <Logo light />
        <p className="max-w-xs text-sm leading-relaxed text-on-ink-muted">
          The AI scriptwriter for creators. Write, hear and send platform-ready scripts in seconds.
        </p>
        <a href="mailto:support@scriptai.com" className="inline-flex items-center gap-2 text-sm text-on-ink hover:text-white">
          <Mail className="h-4 w-4" /> support@scriptai.com
        </a>
      </div>

      {COLUMNS.map((col) => (
        <div key={col.title}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-ink-muted">{col.title}</h3>
          <ul className="mt-4 space-y-3">
            {col.links.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-on-ink transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="border-t border-white/10">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-sm text-on-ink-muted sm:flex-row">
        <p>© {new Date().getFullYear()} ScriptAI. All rights reserved.</p>
        <div className="flex items-center gap-2">
          {SOCIALS.map(({ href, label, icon: Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="glass-dark flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-white"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
