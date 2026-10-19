import { LegalPage, type LegalSection } from "@/components/marketing";

const SECTIONS: LegalSection[] = [
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <ul>
        <li>
          <strong>Account information:</strong> your name and email address when you sign up.
        </li>
        <li>
          <strong>Your content:</strong> the topics and settings you submit, the scripts we generate, documents you upload to your knowledge base,
          and reminders you schedule.
        </li>
        <li>
          <strong>Technical data:</strong> basic request logs (such as time, request ID and errors) that help us keep the service running.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "How we use your information",
    body: (
      <ul>
        <li>To generate scripts and ground them in the documents you choose</li>
        <li>To send the emails you request, such as scripts and reminders</li>
        <li>To keep your account secure and your data separate from other users</li>
        <li>To diagnose problems and improve the service</li>
      </ul>
    ),
  },
  {
    id: "providers",
    title: "Service providers",
    body: (
      <p>
        We rely on trusted providers to run ScriptAI: a database and authentication provider, hosting providers, AI model providers that process
        your prompts to produce scripts and search embeddings, and an email provider. They only receive what they need to perform their task.
      </p>
    ),
  },
  {
    id: "voice",
    title: "Voice generation",
    body: (
      <p>
        Voice playback uses your browser's built-in speech engine. Depending on your browser and the voice you choose, the text may be processed by
        your browser or operating system vendor. We don't store audio.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: <p>We keep your data while your account is active. You can delete uploaded documents at any time from the dashboard.</p>,
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Access to your data is restricted to your account by row-level security. No method of transmission or storage is perfectly secure, but we
        work to protect your information.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <p>
        Depending on where you live, you may have the right to access, correct, delete or export your personal information, and to withdraw
        consent. Contact us to make a request.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about privacy? Email <a href="mailto:privacy@scriptai.com">privacy@scriptai.com</a>.
      </p>
    ),
  },
];

const PrivacyPolicyPage = () => (
  <LegalPage
    title="Privacy policy"
    updated="October 19, 2026"
    intro="This policy explains what information ScriptAI collects, why we collect it, and the choices you have. We only collect what we need to run the service."
    sections={SECTIONS}
  />
);

export default PrivacyPolicyPage;
