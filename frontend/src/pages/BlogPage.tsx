import { useState } from "react";
import { AudioLines, BookOpenText, Clapperboard, Library, Share2, ShieldCheck, type LucideIcon } from "lucide-react";
import { CtaBand, Highlight, PageHeader, Reveal } from "@/components/marketing";
import { cn } from "@/lib/utils";

interface Post {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  icon: LucideIcon;
  cover: string;
}

const POSTS: Post[] = [
  {
    title: "How AI is changing the way creators write in 2026",
    excerpt: "From blank page to first draft in seconds: what AI scriptwriting does well, where it still needs you, and how to combine the two.",
    date: "October 12, 2026",
    readTime: "6 min read",
    category: "AI writing",
    icon: BookOpenText,
    cover: "from-[#5a3cf0] to-[#d946ef]",
  },
  {
    title: "5 hooks that keep viewers past the first 10 seconds",
    excerpt: "The opening line decides whether people stay. Five hook patterns that work on YouTube and short-form video, with examples.",
    date: "September 28, 2026",
    readTime: "5 min read",
    category: "Scriptwriting",
    icon: Clapperboard,
    cover: "from-[#0ea5e9] to-[#5a3cf0]",
  },
  {
    title: "Read it out loud: why voice previews make better scripts",
    excerpt: "Your ear catches what your eye misses. How listening to a draft exposes long sentences, tongue-twisters and weak transitions.",
    date: "September 9, 2026",
    readTime: "4 min read",
    category: "Voice",
    icon: AudioLines,
    cover: "from-[#f97316] to-[#d946ef]",
  },
  {
    title: "Grounding scripts in your brand guide",
    excerpt: "Upload once, stay on-brand everywhere. A practical guide to building a knowledge base that makes every script sound like you.",
    date: "August 21, 2026",
    readTime: "7 min read",
    category: "Brand",
    icon: Library,
    cover: "from-[#10b981] to-[#0ea5e9]",
  },
  {
    title: "One idea, six platforms: adapting scripts for each feed",
    excerpt: "What changes between a TikTok, a LinkedIn video and a podcast intro, and how to adapt one idea for all of them.",
    date: "August 2, 2026",
    readTime: "6 min read",
    category: "Social media",
    icon: Share2,
    cover: "from-[#5a3cf0] to-[#0ea5e9]",
  },
  {
    title: "Fact-checking AI scripts without slowing down",
    excerpt: "Citations, quality checks and a two-minute review routine that keeps your content accurate.",
    date: "July 15, 2026",
    readTime: "5 min read",
    category: "AI writing",
    icon: ShieldCheck,
    cover: "from-[#d946ef] to-[#f97316]",
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(POSTS.map((p) => p.category)))];

const Cover = ({ post, large = false }: { post: Post; large?: boolean }) => {
  const Icon = post.icon;
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-br", post.cover, large ? "h-64 lg:h-full" : "h-48")}>
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
      <Icon className={cn("relative text-white/90", large ? "h-20 w-20" : "h-12 w-12")} strokeWidth={1.5} />
    </div>
  );
};

const Meta = ({ post }: { post: Post }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent-text">{post.category}</span>
    <span className="text-muted">
      {post.date} · {post.readTime}
    </span>
  </div>
);

const BlogPage = () => {
  const [category, setCategory] = useState("All");
  const [featured, ...rest] = POSTS;
  const visible = category === "All" ? rest : POSTS.filter((p) => p.category === category);

  return (
    <div>
      <PageHeader
        eyebrow="Blog"
        title={
          <>
            Ideas for <Highlight>better scripts</Highlight>
          </>
        }
        subtitle="Tips, guides and updates on writing, voice and content strategy."
      />

      <section className="container-page pb-24">
        {category === "All" && (
          <Reveal className="card mb-12 grid overflow-hidden lg:grid-cols-2">
            <Cover post={featured} large />
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-text">Featured</p>
              <h2 className="mt-3 text-3xl font-bold text-text text-balance">{featured.title}</h2>
              <p className="mt-4 text-lg text-muted">{featured.excerpt}</p>
              <div className="mt-6">
                <Meta post={featured} />
              </div>
            </div>
          </Reveal>
        )}

        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={cn("chip", category === c && "chip-active")}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, i) => (
            <Reveal key={post.title} delay={(i % 3) * 80} className="card group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-pop">
              <Cover post={post} />
              <div className="p-6">
                <Meta post={post} />
                <h3 className="mt-4 text-lg font-bold text-text group-hover:text-accent-text">{post.title}</h3>
                <p className="mt-2 text-muted">{post.excerpt}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand title="Put these tips into practice" subtitle="Write your next script with ScriptAI." />
    </div>
  );
};

export default BlogPage;
