import { useMemo, useState } from "react";
import { AudioLines, Mail, Rocket, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Faq, Highlight, PageHeader, type FaqItem } from "@/components/marketing";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: string; label: string; icon: typeof Rocket; items: FaqItem[] }[] = [
  {
    id: "getting-started",
    label: "Getting started",
    icon: Rocket,
    items: [
      {
        question: "How do I create my first script?",
        answer: "Sign up, open the Dashboard, enter a topic, choose a platform, tone and length, then press Generate script.",
      },
      {
        question: "Which platforms are supported?",
        answer: "YouTube, TikTok, Instagram, LinkedIn, X (Twitter) and podcasts. Each one gets a structure and pacing that suits it.",
      },
      {
        question: "What's the difference between standard and assisted mode?",
        answer: "Standard writes the script in one pass and is fastest. Assisted also runs quality checks and revises the draft when a check fails.",
      },
    ],
  },
  {
    id: "features",
    label: "Features",
    icon: Sparkles,
    items: [
      {
        question: "How does voice generation work?",
        answer:
          "After generating a script, press Listen in the Voice panel. Your browser's built-in voices read it aloud. Choose a voice and adjust speed and pitch. Available voices depend on your browser and device.",
      },
      {
        question: "How do I use my own documents?",
        answer:
          "Upload PDF, Markdown or text files in the Knowledge base panel, turn on 'Use knowledge base' and select the documents. Facts from them are cited as [S1], [S2] and so on.",
      },
      {
        question: "Can I get scripts by email?",
        answer: "Yes. Press 'Email me' on a script, or use 'Generate in background & email me' to receive it without waiting on the page.",
      },
      {
        question: "How do reminders work?",
        answer: "In the Reminders panel, pick a date and time. We'll email you when it's time to record or post.",
      },
    ],
  },
  {
    id: "account",
    label: "Account & data",
    icon: ShieldCheck,
    items: [
      {
        question: "I forgot my password. What do I do?",
        answer: "On the login page, enter your email and click 'Forgot password?'. We'll send you a reset link.",
      },
      {
        question: "Who can see my scripts and documents?",
        answer: "Only you. Your data is isolated to your account.",
      },
      {
        question: "How do I delete a document?",
        answer: "Open the Knowledge base panel on the dashboard and click the delete icon next to the document.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    icon: AudioLines,
    items: [
      {
        question: "The first request is slow. Is something wrong?",
        answer: "If nobody has used the service for a while, the server takes up to a minute to wake up. Requests after that are fast.",
      },
      {
        question: "I don't hear any voice.",
        answer: "Check that your device isn't muted, then try another voice from the list. Some browsers load voices a few seconds after the page opens.",
      },
      {
        question: "My email hasn't arrived.",
        answer: "Check your spam folder. Emails usually arrive within a minute or two.",
      },
    ],
  },
];

const HelpCenterPage = () => {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES.find((c) => c.id === active)?.items ?? [];
    return CATEGORIES.flatMap((c) => c.items).filter((item) =>
      `${item.question} ${typeof item.answer === "string" ? item.answer : ""}`.toLowerCase().includes(q),
    );
  }, [active, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Help center"
        title={
          <>
            How can we <Highlight>help?</Highlight>
          </>
        }
        subtitle="Search the answers below, or get in touch with our team."
      >
        <div className="relative mx-auto mt-10 max-w-xl">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for answers…"
            aria-label="Search help articles"
            className="input-field h-14 rounded-full pl-14 text-base shadow-card"
          />
        </div>
      </PageHeader>

      <section className="container-page grid gap-10 pb-24 lg:grid-cols-[260px_1fr]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActive(id);
                setQuery("");
              }}
              aria-pressed={!query && active === id}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors",
                !query && active === id ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface hover:text-text",
              )}
            >
              <Icon className="h-5 w-5" /> {label}
            </button>
          ))}
        </div>

        <div>
          {query && (
            <p className="mb-4 text-sm text-muted">
              {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
            </p>
          )}
          {results.length ? (
            <Faq items={results} />
          ) : (
            <div className="card p-10 text-center text-muted">No answers match your search. Try different words, or contact us below.</div>
          )}
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="glass-strong flex flex-col items-center gap-6 rounded-4xl p-10 text-center sm:flex-row sm:text-left">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
            <Mail className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text">Still have questions?</h2>
            <p className="mt-1 text-muted">Use the chat button in the corner, or email us and we'll reply as soon as we can.</p>
          </div>
          <a href="mailto:support@scriptai.com" className="btn-primary">
            Email support
          </a>
        </div>
      </section>
    </div>
  );
};

export default HelpCenterPage;
