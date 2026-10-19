import { AudioLines, BellRing, Copy, FileUp, Mail, PenLine, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { CheckList, CtaBand, Faq, Highlight, PageHeader, Reveal, SectionHeading } from "@/components/marketing";

const STEPS = [
  {
    icon: PenLine,
    title: "Describe your idea",
    description: "Enter a topic, choose a platform, tone and length. Add an audience, keywords or a call to action for more control.",
    details: ["Six platforms, from YouTube to podcasts", "Six tones, from casual to inspirational", "Lengths from 2 to 20+ minutes"],
  },
  {
    icon: FileUp,
    title: "Add your knowledge (optional)",
    description: "Upload brand guides, product notes or research to your knowledge base and pick the documents this script should use.",
    details: ["PDF, Markdown and text files", "Facts are cited as [S1], [S2]…", "Your documents stay private to you"],
  },
  {
    icon: Sparkles,
    title: "Generate",
    description: "Standard mode writes in a single pass. Assisted mode also checks the draft and revises it before showing you.",
    details: ["Structured intro, main content and conclusion", "Quality checks and insights", "Or run it in the background and get it by email"],
  },
  {
    icon: AudioLines,
    title: "Review and listen",
    description: "Switch between the editor and a clean preview, then press Listen to hear the script read aloud.",
    details: ["Choose a voice, speed and pitch", "Preview hides production cues", "Spot awkward lines by ear"],
  },
  {
    icon: Mail,
    title: "Share and plan",
    description: "Copy the script, email it to yourself, or set a reminder for when it's time to record or post.",
    details: ["One-click copy", "Email with sources included", "Reminder emails at the time you choose"],
  },
];

const UNDER_THE_HOOD = [
  { icon: FileUp, title: "Retrieval from your documents", text: "Your files are split and indexed so the most relevant passages are used for each script." },
  { icon: ShieldCheck, title: "Automatic quality checks", text: "Length, keywords, structure and calls to action are verified before a script is marked as passed." },
  { icon: Workflow, title: "Automations", text: "Emails, background runs and reminders run as automated workflows, so nothing depends on keeping a tab open." },
];

const FAQ = [
  { question: "How long does it take to generate a script?", answer: "Usually a few seconds. Assisted mode takes a little longer because it checks and revises the draft." },
  { question: "Can I edit the generated script?", answer: "Yes. Copy it into your editor of choice, or regenerate with different settings until it's right." },
  { question: "Does voice generation cost anything?", answer: "No. It uses the speech voices built into your browser and device, so it's free and needs nothing extra installed." },
  { question: "What happens if I close the tab?", answer: "Use 'Generate in background & email me'. The script is written on our servers and sent to your inbox." },
];

const SIDE_ICONS = [Copy, Mail, BellRing];

const HowItWorksPage = () => (
  <div>
    <PageHeader
      eyebrow="How it works"
      title={
        <>
          From idea to <Highlight>finished script</Highlight> in minutes
        </>
      }
      subtitle="A simple workflow that does the heavy lifting, while you stay in control of every word."
    />

    <section className="container-page pb-24">
      <ol className="relative mx-auto max-w-4xl space-y-6 before:absolute before:left-[27px] before:top-4 before:bottom-4 before:w-px before:bg-line sm:before:left-[31px]">
        {STEPS.map(({ icon: Icon, title, description, details }, i) => (
          <Reveal key={title} delay={i * 60}>
            <li className="relative flex gap-5 sm:gap-8">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-pop sm:h-16 sm:w-16">
                <Icon className="h-6 w-6" />
              </span>
              <div className="card flex-1 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-text">Step {i + 1}</p>
                <h2 className="mt-2 text-2xl font-bold text-text">{title}</h2>
                <p className="mt-2 text-muted">{description}</p>
                <CheckList items={details} className="mt-5 text-sm" />
                {i === STEPS.length - 1 && (
                  <div className="mt-6 flex gap-2">
                    {SIDE_ICONS.map((SideIcon, k) => (
                      <span key={k} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-accent-text">
                        <SideIcon className="h-4 w-4" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>

    <section className="aurora-soft py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Under the hood" title="What happens when you press Generate" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {UNDER_THE_HOOD.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="card p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-text">{title}</h3>
              <p className="mt-2 text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="container-page py-24">
      <SectionHeading eyebrow="FAQ" title="Common questions" />
      <div className="mx-auto mt-12 max-w-3xl">
        <Faq items={FAQ} />
      </div>
    </section>

    <CtaBand title="See it for yourself" subtitle="Your first script takes less than a minute." to="/register" label="Create a free account" />
  </div>
);

export default HowItWorksPage;
