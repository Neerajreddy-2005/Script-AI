import {
  AudioLines,
  BellRing,
  Library,
  Mail,
  MessagesSquare,
  MonitorSmartphone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
}

/** Every feature here exists in the product. Shared by the home and features pages. */
export const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI script generation",
    description: "Turn a one-line idea into a structured script with a hook, main content and a closing call to action.",
    details: ["Introduction, main content and conclusion", "Your audience, keywords and CTA built in", "Ready in seconds"],
  },
  {
    icon: MonitorSmartphone,
    title: "Made for every platform",
    description: "Pick YouTube, TikTok, Instagram, LinkedIn, X or a podcast and the pacing and format adapt to it.",
    details: ["Six platforms supported", "Length presets from 2 to 20+ minutes", "Production cues like [B-roll]"],
  },
  {
    icon: SlidersHorizontal,
    title: "Tone that sounds like you",
    description: "Casual, professional, humorous, educational, persuasive or inspirational: switch tone in one click.",
    details: ["Six tones to choose from", "Consistent voice from start to finish", "Regenerate with new settings anytime"],
  },
  {
    icon: AudioLines,
    title: "Voice generation",
    description: "Hear your script read aloud before you record. Choose a voice, then tune speed and pitch.",
    details: ["Natural voices built into your browser", "Adjustable speed and pitch", "Free, nothing to install"],
  },
  {
    icon: Library,
    title: "Brand knowledge base",
    description: "Upload brand guides and notes. Scripts are grounded in your documents and cite their sources.",
    details: ["Upload Markdown, text and PDF files", "Pick which documents to use", "Every claim linked to a source"],
  },
  {
    icon: ShieldCheck,
    title: "Assisted mode",
    description: "An extra pass checks length, keywords and structure, then revises the draft before you see it.",
    details: ["Automatic quality checks", "Self-revision when a check fails", "Insights shown with every script"],
  },
  {
    icon: Mail,
    title: "Email and background runs",
    description: "Send a script to your inbox, or start a generation and close the tab. It arrives by email.",
    details: ["One-click 'Email me'", "Generate in the background", "Nothing lost if you leave"],
  },
  {
    icon: BellRing,
    title: "Content reminders",
    description: "Schedule a reminder to record or post, and get an email when it's time.",
    details: ["Pick any date and time", "Linked to your latest script", "Delivered to your inbox"],
  },
  {
    icon: MessagesSquare,
    title: "Built-in support chat",
    description: "Questions while you write? Open the chat from any page.",
    details: ["Available on every page", "Quick answers to common questions", "Reach a person when needed"],
  },
];
