import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export const Logo = ({ className, light = false }: { className?: string; light?: boolean }) => (
  <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="ScriptAI home">
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#d946ef] text-sm font-extrabold text-white shadow-sm">
      S
    </span>
    <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-text")}>
      Script<span className={light ? "text-[#c4b5fd]" : "text-accent"}>AI</span>
    </span>
  </Link>
);

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/blog", label: "Blog" },
  { to: "/help-center", label: "Help" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isDashboard = location.pathname.startsWith("/dashboard");
  // Auth pages have a dark side panel, so the bar stays solid there.
  const isAuth = ["/login", "/register"].includes(location.pathname);
  const isSolid = isDashboard || isAuth;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setIsMobileMenuOpen(false), [location.pathname]);

  // Floating liquid-glass pill once the page scrolls (always on app pages).
  const shell = "fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4";
  const bar = cn(
    "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 pl-4 transition-all duration-500 sm:px-4 sm:pl-5",
    // Clear glass with a stronger blur so links stay readable over scrolling content;
    // frosted on auth pages, where the bar floats over a dark panel.
    isScrolled || isMobileMenuOpen || isSolid
      ? cn("glass backdrop-blur-xl backdrop-saturate-150", isAuth ? "bg-white/[0.85]" : "bg-white/40")
      : "border border-transparent",
  );

  if (isDashboard) {
    return (
      <nav className={shell}>
        <div className={bar}>
          <Logo />
          <div className="flex items-center gap-4">
            {user?.email && <span className="hidden text-sm text-muted md:block">{user.email}</span>}
            <button onClick={handleSignOut} className="btn-secondary px-4 py-2 text-sm">
              Log out
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={shell}>
      <div className={bar}>
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-white/70 text-accent-text shadow-[inset_0_1px_0_white,0_1px_3px_rgb(17_13_44/0.08)]" : "text-muted hover:bg-white/50 hover:text-text",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <button onClick={handleSignOut} className="text-sm font-medium text-muted hover:text-text">
              Log out
            </button>
          ) : (
            <Link to="/login" className="text-sm font-medium text-muted hover:text-text">
              Log in
            </Link>
          )}
          <Link to="/dashboard" className="btn-primary px-4 py-2 text-sm">
            {user ? "Open dashboard" : "Get started free"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="rounded-full p-2 text-text md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="glass mx-auto mt-2 max-w-6xl space-y-1 rounded-3xl p-3 md:hidden">
          {LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="block rounded-xl px-3 py-3 font-medium text-text hover:bg-surface">
              {label}
            </Link>
          ))}
          {user ? (
            <button onClick={handleSignOut} className="block w-full rounded-xl px-3 py-3 text-left font-medium text-text hover:bg-surface">
              Log out
            </button>
          ) : (
            <Link to="/login" className="block rounded-xl px-3 py-3 font-medium text-text hover:bg-surface">
              Log in
            </Link>
          )}
          <Link to="/dashboard" className="btn-primary mt-3 w-full">
            Get started free
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
