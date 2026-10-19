import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Pause, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { CheckList, CtaBand, Eyebrow, Faq, Highlight, Reveal, SectionHeading } from "@/components/marketing";
import { FEATURES } from "@/lib/site";
import { PLATFORMS, TONES, type Platform, type Tone } from "@/types/api";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Morning routine for remote workers", "Why our coffee is single-origin", "3 budgeting mistakes in your 20s"];

const STEPS = [
  { title: "Describe your idea", text: "Type a topic, pick a platform and a tone. Add your audience, keywords or a call to action if you like." },
  { title: "Generate and refine", text: "Get a structured script in seconds. Use assisted mode for quality checks, or ground it in your own documents." },
  { title: "Listen, send, publish", text: "Hear it read aloud, copy it, email it to yourself or set a reminder for when it's time to record." },
];

const FAQ = [
  { question: "Is ScriptAI free to use?", answer: "Yes. Create an account and start generating scripts right away. Voice generation runs in your browser at no cost." },
  { question: "Which platforms can I write for?", answer: "YouTube, TikTok, Instagram, LinkedIn, X (Twitter) and podcasts. Each one gets pacing and structure that suits it." },
  { question: "How does voice generation work?", answer: "Open any script and press Listen. Your browser's built-in voices read it aloud, and you can change the voice, speed and pitch." },
  { question: "Can scripts use my brand's information?", answer: "Upload brand guides or notes to your knowledge base. ScriptAI uses them as sources and cites them in the script." },
  { question: "Do I own the scripts I create?", answer: "Yes. Everything you generate is yours to edit, publish and monetize." },
];

/** Mini generator in the hero; it hands its values to the dashboard. */
const HeroGenerator = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("Casual");
  const [platform, setPlatform] = useState<Platform>("YouTube");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/dashboard", { state: { topic: topic.trim(), tone, platform } });
  };

  return (
    <form onSubmit={submit} className="glass-strong rounded-4xl p-5 text-left sm:p-7">
      <label htmlFor="hero-topic" className="text-sm font-semibold text-text">
        What's your video about?
      </label>
      <textarea
        id="hero-topic"
        rows={3}
        value={topic}
        maxLength={300}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. 5 productivity tips for remote teams"
        className="input-field mt-2 resize-none"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => setTopic(s)} className="chip text-xs">
            {s}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-semibold text-text">Tone</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TONES.map((t) => (
          <button key={t} type="button" onClick={() => setTone(t)} aria-pressed={tone === t} className={cn("chip", tone === t && "chip-active")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="hero-platform" className="text-sm font-semibold text-text">
            Platform
          </label>
          <select
            id="hero-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="input-field mt-2"
          >
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary h-[46px] px-6">
          <Wand2 className="h-4 w-4" /> Generate script
        </button>
      </div>
    </form>
  );
};

/** Illustrative output panels (static UI, not real data). */
const ScriptMock = () => (
  <div className="card overflow-hidden">
    <div className="flex items-center justify-between border-b border-line px-5 py-3">
      <span className="flex items-center gap-2 text-sm font-semibold text-text">
        <FileText className="h-4 w-4 text-accent" /> Remote work, done right
      </span>
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">YouTube</span>
    </div>
    <div className="space-y-4 p-5 text-sm">
      {[
        ["Hook", "What if your best work happened before 10 a.m.? Today I'll show you how."],
        ["Main content", "Tip one: protect a two-hour focus block. [B-roll: calendar view]"],
        ["Call to action", "Try one tip this week and tell me how it went in the comments."],
      ].map(([label, text]) => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">{label}</p>
          <p className="mt-1 text-text">{text}</p>
        </div>
      ))}
    </div>
  </div>
);

const VoiceMock = () => (
  <div className="card p-5">
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
        <Pause className="h-5 w-5" />
      </span>
      <div className="flex h-12 flex-1 items-center gap-[3px]" aria-hidden>
        {Array.from({ length: 42 }, (_, i) => (
          <span
            key={i}
            className={cn("w-full rounded-full", i < 18 ? "bg-accent" : "bg-surface-2")}
            style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` }}
          />
        ))}
      </div>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
      {[
        ["Voice", "Samantha"],
        ["Speed", "1.1×"],
        ["Pitch", "1.0"],
      ].map(([k, v]) => (
        <div key={k} className="rounded-xl bg-surface px-3 py-2">
          <p className="text-muted">{k}</p>
          <p className="font-semibold text-text">{v}</p>
        </div>
      ))}
    </div>
  </div>
);

const SourcesMock = () => (
  <div className="card p-5">
    <p className="text-sm text-text">
      Every bean is roasted within 48 hours of shipping <span className="rounded bg-accent-soft px-1 font-semibold text-accent-text">[S1]</span>, and
      we only buy from farms we've visited <span className="rounded bg-accent-soft px-1 font-semibold text-accent-text">[S2]</span>.
    </p>
    <div className="mt-5 space-y-2">
      {["S1 · brand_guide.md", "S2 · sourcing_notes.pdf"].map((s) => (
        <div key={s} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-muted">
          <FileText className="h-4 w-4 text-accent" /> {s}
        </div>
      ))}
    </div>
  </div>
);

const CHECKS_MOCK = (
  <div className="card p-5">
    {[
      ["Length fits the platform", true],
      ["All keywords included", true],
      ["Clear call to action", true],
      ["Hook in the first line", true],
    ].map(([label]) => (
      <div key={label as string} className="flex items-center justify-between border-b border-line py-3 text-sm last:border-0">
        <span className="text-text">{label}</span>
        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
          <ShieldCheck className="h-3.5 w-3.5" /> Passed
        </span>
      </div>
    ))}
  </div>
);

const SHOWCASE = [
  {
    eyebrow: "Voice generation",
    title: "Hear your script before you hit record",
    text: "Catch clunky lines by ear. Play any script with a natural voice, then tune the speed and pitch until it sounds right.",
    points: ["Choose from the voices on your device", "Adjust speed and pitch", "Free, runs in your browser"],
    visual: <VoiceMock />,
  },
  {
    eyebrow: "Knowledge base",
    title: "Scripts grounded in your brand, with sources",
    text: "Upload your brand guide, product notes or research. ScriptAI writes from your facts and labels every one with its source.",
    points: ["PDF, Markdown and text files", "Choose the documents per script", "Citations you can check"],
    visual: <SourcesMock />,
  },
  {
    eyebrow: "Assisted mode",
    title: "A second pass that checks the work",
    text: "Assisted mode reviews length, keywords and structure, then revises the draft automatically when something is off.",
    points: ["Automatic quality checks", "Revises itself before you see it", "Insights shown with each script"],
    visual: CHECKS_MOCK,
  },
];

const HomePage = () => (
  <div>
    {/* Hero */}
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <Reveal>
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5" /> AI scriptwriter for creators
          </Eyebrow>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-text sm:text-6xl lg:text-[4.25rem] text-balance">
            Turn ideas into <Highlight>scripts that sound like you</Highlight>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
            Write platform-ready scripts for YouTube, TikTok, Instagram, LinkedIn and podcasts in seconds. Then listen to them, send them and
            schedule them.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/dashboard" className="btn-primary px-7 py-3.5 text-base">
              Start writing for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/how-it-works" className="btn-secondary px-7 py-3.5 text-base">
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">Free to start · No credit card · Voice preview included</p>
        </Reveal>
        <Reveal delay={150}>
          <HeroGenerator />
        </Reveal>
      </div>
    </section>

    {/* Platforms strip */}
    <section className="aurora-soft border-y border-white/60 py-8">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">Scripts tuned for every platform you post on</p>
      <div className="relative mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
            <span key={i} className="rounded-full border border-white/80 bg-white/70 px-6 py-2 text-lg font-semibold text-muted shadow-[inset_0_1px_0_white,0_4px_12px_-6px_rgb(17_13_44/0.15)]">
              {p === "Twitter" ? "X (Twitter)" : p}
            </span>
          ))}
        </div>
      </div>
    </section>

    {/* Showcase blocks */}
    <section className="container-page space-y-24 py-24">
      {SHOWCASE.map((block, i) => (
        <Reveal key={block.title} className={cn("grid items-center gap-12 lg:grid-cols-2", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
          <div>
            <Eyebrow>{block.eyebrow}</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold text-text sm:text-4xl text-balance">{block.title}</h2>
            <p className="mt-4 text-lg text-muted">{block.text}</p>
            <CheckList items={block.points} className="mt-6" />
          </div>
          <div className="hero-glow relative overflow-hidden rounded-4xl border border-white/70 p-6 sm:p-10">{block.visual}</div>
        </Reveal>
      ))}
    </section>

    {/* How it works */}
    <section className="aurora-soft py-24">
      <div className="container-page">
        <SectionHeading eyebrow="How it works" title="From idea to finished script in three steps" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100} className="card p-8">
              <span className="text-5xl font-extrabold text-accent/20">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-bold text-text">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 grid items-center gap-6 lg:grid-cols-2">
          <ScriptMock />
          <div className="text-center lg:text-left">
            <p className="text-lg text-muted">Every script comes with an introduction, main content and a conclusion, plus production cues where they help.</p>
            <Link to="/how-it-works" className="mt-5 inline-flex items-center gap-2 font-semibold text-accent-text hover:underline">
              Explore the full workflow <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* Feature grid */}
    <section className="container-page py-24">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to go from blank page to published"
        subtitle="One workspace for writing, checking, listening and planning your content."
      />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }, i) => (
          <Reveal key={title} delay={(i % 3) * 80} className="card group p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text transition-colors group-hover:bg-accent group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-text">{title}</h3>
            <p className="mt-2 text-muted">{description}</p>
          </Reveal>
        ))}
      </div>
    </section>

    {/* FAQ */}
    <section className="aurora-soft py-24">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions, answered"
          subtitle={
            <>
              Can't find what you need? Visit the{" "}
              <Link to="/help-center" className="font-semibold text-accent-text hover:underline">
                help center
              </Link>
              .
            </>
          }
        />
        <Faq items={FAQ} />
      </div>
    </section>

    <CtaBand
      title={
        <>
          Your next script is <span className="text-[#c4b5fd]">one sentence away</span>
        </>
      }
      subtitle="Join creators writing faster with ScriptAI."
    />
  </div>
);

export default HomePage;
