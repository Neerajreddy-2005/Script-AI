import { LegalPage, type LegalSection } from "@/components/marketing";

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to terms",
    body: <p>By creating an account or using ScriptAI, you agree to these terms. If you don't agree, please don't use the service.</p>,
  },
  {
    id: "service",
    title: "The service",
    body: (
      <p>
        ScriptAI is an AI scriptwriting tool. It generates scripts, can ground them in documents you upload, plays them back with your browser's
        voices, and can email scripts and reminders to you. Features may change as we improve the product.
      </p>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          You own the content you submit and the scripts you generate. You give us permission to store and process it only as needed to provide
          the service.
        </p>
        <p>You are responsible for reviewing generated scripts before publishing them and for having the rights to any documents you upload.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <ul>
        <li>Don't generate content that is illegal, harmful, harassing or deceptive</li>
        <li>Don't try to access other users' data or our systems without permission</li>
        <li>Don't overload, scrape or disrupt the service</li>
      </ul>
    ),
  },
  {
    id: "ai-output",
    title: "AI-generated output",
    body: (
      <p>
        AI can make mistakes. Scripts may contain inaccuracies, even when sources are cited, so check facts before you publish. Similar prompts may
        produce similar results for different users.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "Disclaimer and liability",
    body: (
      <p>
        The service is provided "as is" without warranties of any kind. To the extent permitted by law, ScriptAI isn't liable for indirect or
        consequential losses arising from your use of the service.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: <p>We may update these terms. When we do, we'll change the date at the top of this page. Continuing to use ScriptAI means you accept the update.</p>,
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about these terms? Email <a href="mailto:terms@scriptai.com">terms@scriptai.com</a>.
      </p>
    ),
  },
];

const TermsOfServicePage = () => (
  <LegalPage
    title="Terms of service"
    updated="October 19, 2026"
    intro="These terms describe the rules for using ScriptAI. We've kept them short and readable."
    sections={SECTIONS}
  />
);

export default TermsOfServicePage;
