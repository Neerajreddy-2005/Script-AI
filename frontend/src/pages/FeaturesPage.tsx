import { Clapperboard, GraduationCap, Megaphone, Mic } from "lucide-react";
import { CheckList, CtaBand, Highlight, PageHeader, Reveal, SectionHeading } from "@/components/marketing";
import { FEATURES } from "@/lib/site";

const AUDIENCES = [
  { icon: Clapperboard, title: "Video creators", text: "Hooks, pacing and B-roll cues for YouTube, TikTok and Reels." },
  { icon: Mic, title: "Podcasters", text: "Intros, segment outlines and outros you can read naturally." },
  { icon: Megaphone, title: "Brands and marketers", text: "On-brand scripts grounded in your own guides and product notes." },
  { icon: GraduationCap, title: "Educators", text: "Clear explanations structured for learning, at any length." },
];

const FeaturesPage = () => (
  <div>
    <PageHeader
      eyebrow="Features"
      title={
        <>
          Every tool you need to <Highlight>write, hear and ship</Highlight> scripts
        </>
      }
      subtitle="ScriptAI brings generation, quality checks, voice preview and delivery into one simple workspace."
    />

    <section className="container-page pb-24">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description, details }, i) => (
          <Reveal key={title} delay={(i % 3) * 80} className="card flex flex-col p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[#d946ef] text-white shadow-sm">
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-6 text-xl font-bold text-text">{title}</h2>
            <p className="mt-2 text-muted">{description}</p>
            <CheckList items={details} className="mt-6 border-t border-line pt-6 text-sm" />
          </Reveal>
        ))}
      </div>
    </section>

    <section className="aurora-soft py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Who it's for" title="Built for anyone who speaks to an audience" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="card p-7">
              <Icon className="h-7 w-7 text-accent" />
              <h3 className="mt-5 text-lg font-bold text-text">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <CtaBand title="Ready to try every feature?" subtitle="Create a free account and write your first script in under a minute." />
  </div>
);

export default FeaturesPage;
