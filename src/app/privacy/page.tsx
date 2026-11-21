import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileCheck2, LockKeyhole, ScanLine, ShieldCheck, CheckCircle2 } from "lucide-react";
import { FigmaLogo } from "@/components/ui/FigmaIcon";

export const metadata = {
  title: "Privacy Policy | Adaptive Resume",
  description: "Our plain-language commitment to your privacy, data security, and truthfulness.",
};

const policySections = [
  { id: "information", num: "01", title: "Information in your account", summary: "Account details, work history, projects, and credentials you provide." },
  { id: "use", num: "02", title: "How your information is used", summary: "Comparing experience against job descriptions and tailoring resume drafts." },
  { id: "documents", num: "03", title: "Your documents and OCR", summary: "In-browser document parsing and explicit consent for OCR scanning." },
  { id: "providers", num: "04", title: "AI and service providers", summary: "Encrypted API keys and stateless model interactions." },
  { id: "sharing", num: "05", title: "Sharing a resume", summary: "Public links and downloads only happen when you explicitly request them." },
  { id: "choices", num: "06", title: "Your choices and deletion", summary: "Exporting data, editing facts, and full account deletion at any time." },
  { id: "security", num: "07", title: "Security safeguards", summary: "AES-256-GCM encryption at rest, HTTPS/TLS in transit, and row-level tenant isolation." },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#eee9df] text-[#10241c] font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[rgba(16,36,28,0.15)] bg-[#10241c] text-[#eee9df] px-6 py-4 sm:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <FigmaLogo inverse />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#d8c49b] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="border-b border-[rgba(16,36,28,0.15)] bg-[#faf8f2] px-6 py-7 sm:px-12 sm:py-9">
        <div className="mx-auto max-w-4xl">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#a98452]">
            SECURITY &amp; PRIVACY GUARANTEE · 2026
          </span>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#10241c] leading-[1.15]">
            Your career data is private.
            <br />
            <em className="text-[#a98452] not-italic">Period.</em>
          </h1>
          <p className="mt-3 max-w-[65ch] text-sm sm:text-base leading-relaxed text-[#536259]">
            We built Adaptive Resume for job seekers who value integrity. We never sell your personal information, never train public models on your career records, and never fabricate claims on your resumes.
          </p>
          <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#7d847f]">
            <ShieldCheck className="h-4 w-4 text-[#315849]" /> Last updated: November 2024 · Active policy
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="px-6 py-8 sm:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#dce5df] text-[#315849]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#10241c]">You stay in control</h3>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#536259]">
              Parsed documents wait in staging for your approval. Nothing enters your permanent Career Vault until you check it and save it.
            </p>
          </div>

          <div className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#d8c49b] text-[#10241c]">
              <ScanLine className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#10241c]">Client-side processing</h3>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#536259]">
              PDF and DOCX text is extracted directly in your browser. Scanned documents use OCR only after you explicitly review and approve the request.
            </p>
          </div>

          <div className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#becbbf] text-[#10241c]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#10241c]">Never sold or monetized</h3>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#536259]">
              Your resumes are generated for your job applications only. We never sell candidate databases to recruiters, advertisers, or third parties.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <section className="px-6 pb-24 sm:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Quick Nav Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-6 shadow-sm">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#a98452]">
                ON THIS PAGE
              </span>
              <nav className="mt-3 space-y-1.5">
                {policySections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block rounded px-2.5 py-1.5 text-xs font-semibold text-[#536259] hover:bg-[#eee9df] hover:text-[#10241c] transition-colors"
                  >
                    <span className="font-mono text-[10px] text-[#a98452] mr-2">{sec.num}</span>
                    {sec.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 border-t border-[rgba(16,36,28,0.12)] pt-5">
                <Link
                  href="/settings/privacy"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-[#10241c] px-4 py-2.5 text-xs font-bold text-[#eee9df] hover:opacity-90 transition-opacity"
                >
                  Manage privacy settings <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Policy Articles */}
          <article className="space-y-8 lg:col-span-8">
            <section id="information" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">01</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">Information in your account</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  You may store candidate contact details (name, email, phone, location, LinkedIn/GitHub links), work history, projects, coursework, and technical skills in your Career Vault.
                </p>
                <p>
                  Authentication is managed securely by Clerk. When you sign in, we receive only the required authentication token and email address to maintain your session.
                </p>
                <p>
                  If you choose to connect your own AI provider key (e.g. Gemini, Groq), your key is encrypted using AES-256-GCM before storage. It is never logged in plaintext or shared with other users.
                </p>
              </div>
            </section>

            <section id="use" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">02</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">How your information is used</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  Your information is used strictly to power resume tailoring for you: analyzing job descriptions you paste, selecting matching evidence from your Career Vault, and formatting clean ATS-ready PDF/DOCX files.
                </p>
                <p>
                  Adaptive Resume operates on a <strong>zero-fabrication guarantee</strong>: our tailoring engine only selects, highlights, and formats facts you have already documented in your vault.
                </p>
              </div>
            </section>

            <section id="documents" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">03</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">Your documents and OCR</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  When you upload selectable PDF or DOCX files, text extraction happens entirely within your browser using WebAssembly and client-side parsers. No raw document bytes are sent to our backend servers.
                </p>
                <p>
                  If you upload a scanned image or raster PDF that requires Optical Character Recognition (OCR), we explicitly prompt you for consent before sending the document to OCR.space over encrypted TLS. OCR requests are stateless and discarded immediately after parsing.
                </p>
              </div>
            </section>

            <section id="providers" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">04</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">AI and service providers</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  When AI assistance is invoked to tailor wording, only the specific job description and the relevant bullet points from your Career Vault are transmitted to the chosen model API.
                </p>
                <p>
                  We configure commercial API integrations with zero-retention policies so your career data is never used to train public foundation models.
                </p>
              </div>
            </section>

            <section id="sharing" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">05</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">Sharing a resume</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  By default, all resumes and Career Vault entries are completely private. A resume is only shared externally if you click "Share" to generate an unguessable public link, or if you download a PDF/DOCX to send to a recruiter.
                </p>
                <p>
                  You can revoke or disable any public share link at any time from your Resumes dashboard.
                </p>
              </div>
            </section>

            <section id="choices" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">06</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">Your choices and deletion</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  You own your career records. You can edit, modify, or permanently delete individual facts, resumes, or your entire account at any time.
                </p>
                <p>
                  Under Privacy Settings, you can download a complete JSON archive of all your Career Vault entries and generated resumes. Requesting account deletion permanently purges all records from our primary databases.
                </p>
              </div>
            </section>

            <section id="security" className="rounded border border-[rgba(16,36,28,0.15)] bg-[#faf8f2] p-8 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#a98452]">07</span>
                <h2 className="font-serif text-2xl font-bold text-[#10241c]">Security safeguards</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#536259]">
                <p>
                  All database tables enforce row-level tenant isolation keyed to your authenticated user ID. We use industry-standard TLS encryption for all traffic in transit and AES-256-GCM for sensitive credentials at rest.
                </p>
              </div>
            </section>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(16,36,28,0.15)] bg-[#10241c] text-[#eee9df] px-6 py-10 sm:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <FigmaLogo inverse />
          <span className="font-mono text-xs text-[#d8c49b]">
            &copy; 2026 Adaptive Resume. Truth-backed resume intelligence.
          </span>
          <Link href="/" className="text-xs font-bold hover:underline">
            Return to website &rarr;
          </Link>
        </div>
      </footer>
    </div>
  );
}
