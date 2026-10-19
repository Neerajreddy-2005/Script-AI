import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fades its children in the first time they scroll into view. */
export const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("animate-fade-in");
          el.classList.remove("opacity-0");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("opacity-0", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

export const Eyebrow = ({ children }: { children: ReactNode }) => <span className="eyebrow">{children}</span>;

interface HeadingProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

export const SectionHeading = ({ eyebrow, title, subtitle, align = "center", className }: HeadingProps) => (
  <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl", className)}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-4 text-3xl font-bold text-text sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] text-balance">{title}</h2>
    {subtitle && <p className="mt-4 text-lg text-muted text-balance">{subtitle}</p>}
  </div>
);

/** Top-of-page hero used by the secondary pages. */
export const PageHeader = ({ eyebrow, title, subtitle, children }: HeadingProps & { children?: ReactNode }) => (
  <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
    <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
    <div className="container-page text-center">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold text-text sm:text-5xl lg:text-6xl lg:leading-[1.05] text-balance">
        {title}
      </h1>
      {subtitle && <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl text-balance">{subtitle}</p>}
      {children}
    </div>
  </section>
);

export const Highlight = ({ children }: { children: ReactNode }) => (
  <span className="bg-gradient-to-r from-accent via-[#8b5cf6] to-[#d946ef] bg-clip-text text-transparent">{children}</span>
);

export const CheckList = ({ items, className }: { items: string[]; className?: string }) => (
  <ul className={cn("space-y-3", className)}>
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3 text-muted">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export const Faq = ({ items }: { items: FaqItem[] }) => (
  <div className="card divide-y divide-line/70">
    {items.map((item) => (
      <details key={item.question} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-semibold text-text">
          {item.question}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted transition-transform duration-200 group-open:rotate-180 group-open:bg-accent-soft group-open:text-accent-text">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <div className="mt-3 pr-12 leading-relaxed text-muted">{item.answer}</div>
      </details>
    ))}
  </div>
);

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared layout for policy pages: header, sticky table of contents, readable column. */
export const LegalPage = ({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) => (
  <div>
    <PageHeader eyebrow="Legal" title={title} subtitle={`Last updated: ${updated}`} />
    <section className="container-page grid gap-12 pb-24 lg:grid-cols-[220px_1fr]">
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">On this page</p>
          <ul className="mt-4 space-y-2 border-l border-line">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-sm text-muted hover:border-accent hover:text-text">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <article className="card max-w-3xl p-6 sm:p-10">
        <div className="text-lg leading-relaxed text-muted">{intro}</div>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line pt-8 mt-8">
            <h2 className="text-xl font-bold text-text">
              <span className="mr-2 text-accent">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-accent-text [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text [&_ul]:space-y-2">
              {s.body}
            </div>
          </section>
        ))}
      </article>
    </section>
  </div>
);

interface CtaBandProps {
  title: ReactNode;
  subtitle?: ReactNode;
  to?: string;
  label?: string;
}

export const CtaBand = ({ title, subtitle, to = "/dashboard", label = "Start writing for free" }: CtaBandProps) => (
  <section className="container-page py-20">
    <div className="relative overflow-hidden rounded-4xl bg-ink px-6 py-16 text-center sm:px-16 sm:py-20">
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(50% 80% at 50% 0%, rgb(var(--accent) / .55), transparent 70%), radial-gradient(30% 50% at 90% 100%, rgb(217 70 239 / .35), transparent 70%)",
        }}
      />
      <div className="relative">
        <h2 className="mx-auto max-w-3xl text-3xl font-bold text-white sm:text-4xl text-balance">{title}</h2>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-on-ink text-balance">{subtitle}</p>}
        <Link
          to={to}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-text transition-transform duration-200 hover:-translate-y-0.5"
        >
          {label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);
