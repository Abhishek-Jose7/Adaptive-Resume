import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileCheck2, LockKeyhole, ScanLine } from "lucide-react";

export const metadata = {
  title: "Privacy | Adaptive Resume",
  description: "A plain-language guide to the information Adaptive Resume handles and the choices you have.",
};

const policySections = [
  ["information", "Information in your account"],
  ["use", "How your information is used"],
  ["documents", "Your documents and OCR"],
  ["providers", "AI and service providers"],
  ["sharing", "Sharing a resume"],
  ["choices", "Your choices and deletion"],
  ["security", "Security and policy changes"],
] as const;

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <Link href="/" className="privacy-brand"><span className="privacy-brand-mark" aria-hidden="true" /> Adaptive <strong>Resume</strong></Link>
        <Link href="/" className="privacy-back"><ArrowLeft size={15} /> Back to the website</Link>
      </header>

      <div className="privacy-layout">
        <aside className="privacy-rail" aria-label="On this page">
          <span className="privacy-rail-title">On this page</span>
          <nav>{policySections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <div className="privacy-rail-note"><LockKeyhole size={17} /><p>Your saved details aren’t public. AI requests send relevant information to the provider you select.</p></div>
        </aside>

        <article className="privacy-document">
          <div className="privacy-heading">
            <h1>Your information,<br /><em>clearly explained.</em></h1>
            <p>Adaptive Resume works with personal career details. This page tells you what the app uses, when information leaves your browser, and how you can manage what you’ve saved.</p>
            <span className="privacy-date">Last updated November 19, 2026</span>
          </div>

          <section className="privacy-summary" aria-label="Privacy at a glance">
            <div><FileCheck2 size={19} /><h2>You stay in control</h2><p>Imported details wait for your review. You decide what to keep in your Data Bank.</p></div>
            <div><ScanLine size={19} /><h2>Files are handled with care</h2><p>PDF and DOCX text is read in your browser. OCR for scans asks before sending.</p></div>
            <div><LockKeyhole size={19} /><h2>Sharing is your choice</h2><p>A resume is shared only when you export it or create a share link.</p></div>
          </section>

          <section id="information" className="privacy-section">
            <span className="privacy-section-number">01</span><div><h2>Information in your account</h2>
              <p>You may add contact details, work history, education, skills, project notes, job descriptions, application records, and resume or cover-letter drafts. Adaptive Resume also receives the account information needed to sign you in. Sign-in is provided by Clerk.</p>
              <p>If you connect an AI provider, the app stores the provider details needed to use your connection. Your full key is not shown again in the settings screen.</p>
            </div>
          </section>

          <section id="use" className="privacy-section">
            <span className="privacy-section-number">02</span><div><h2>How your information is used</h2>
              <p>The app uses your saved details to organize your Data Bank, compare experience with a job description, prepare resume and cover-letter drafts, track applications, and create exports you request. Suggestions are meant for you to review and edit; you choose what appears in a final document.</p>
            </div>
          </section>

          <section id="documents" className="privacy-section">
            <span className="privacy-section-number">03</span><div><h2>Your documents and OCR</h2>
              <p>Text is extracted from selectable PDFs and DOCX files in your browser. The extracted details are shown for review before you add them to your Data Bank.</p>
              <p>A scanned page or image needs optical character recognition (OCR). Before the app sends that file to its OCR service, it asks for your consent. If you decline, the OCR request is not made.</p>
            </div>
          </section>

          <section id="providers" className="privacy-section">
            <span className="privacy-section-number">04</span><div><h2>AI and service providers</h2>
              <p>When you request AI-assisted suggestions, the job description and the relevant experience details are sent to the provider selected for that request. This may be a provider you connected or the app’s configured provider. The provider processes that information under its own terms and privacy practices.</p>
              <p>Clerk provides sign-in. The app’s database stores account and career information so the service can work across sessions. These providers process information only as needed to provide their part of the service.</p>
            </div>
          </section>

          <section id="sharing" className="privacy-section">
            <span className="privacy-section-number">05</span><div><h2>Sharing a resume</h2>
              <p>When you export a document, a copy is saved to the destination you choose. If you create a share link, anyone with that link may be able to view the shared resume. You can manage links from the sharing controls in your account. Check a document before you send or share it.</p>
            </div>
          </section>

          <section id="choices" className="privacy-section">
            <span className="privacy-section-number">06</span><div><h2>Your choices and deletion</h2>
              <p>You can edit or remove saved career details in the app. Privacy settings include tools to export account information and request account deletion. Deletion removes information from the app’s active records; copies you exported, information a recipient already received, and records a service provider retains under its own policies may remain.</p>
              <Link href="/settings/privacy" className="privacy-settings-link">Open privacy settings <ArrowUpRight size={15} /></Link>
            </div>
          </section>

          <section id="security" className="privacy-section">
            <span className="privacy-section-number">07</span><div><h2>Security and policy changes</h2>
              <p>Adaptive Resume uses account access controls and technical safeguards to protect stored information. No internet service can guarantee perfect security. Keep your sign-in details private and remove share links you no longer need.</p>
              <p>This policy may change as the app changes. The date above shows when this page was last updated.</p>
            </div>
          </section>

          <div className="privacy-endnote"><span aria-hidden="true" />Questions about the information saved in your account? Start with <Link href="/settings/privacy">Privacy settings</Link>.</div>
        </article>
      </div>
      <footer className="privacy-footer"><Link href="/" className="privacy-brand"><span className="privacy-brand-mark" aria-hidden="true" /> Adaptive <strong>Resume</strong></Link><span>Built around the work you’ve actually done.</span><Link href="/">Return to the website <ArrowUpRight size={14} /></Link></footer>
    </main>
  );
}
