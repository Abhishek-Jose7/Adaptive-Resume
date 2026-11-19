import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { AdaptiveResumeWorkspace } from "@/components/workspace/AdaptiveResumeWorkspace";
import DashboardLayout from "@/app/(dashboard)/layout";
import { RevealSection } from "@/components/marketing/RevealSection";
import { ArrowDown, MoveRight, CircleCheck, FileText, Fingerprint, Upload, Sun } from "lucide-react";

function ResumeWorkbenchExample() {
  return (
    <div className="proof-workbench" aria-label="Illustrative job description and tailored resume preview">
      <div className="proof-workbench-topline"><span>Example workspace</span><span>Senior Product Designer / Northstar</span></div>
      <div className="proof-workbench-columns">
        <section className="proof-job-card" aria-label="Example job description">
          <div className="proof-document-label"><span className="proof-small-dot" /> Job description</div>
          <h2>Senior Product Designer</h2>
          <p className="proof-job-company">Northstar / Remote</p>
          <div className="proof-rule" />
          <p>We’re looking for a designer who can make complex workflows feel clear. Work closely with research, product, and engineering.</p>
          <div className="proof-skill-line"><span>Product thinking</span><span>Research</span><span>Prototyping</span></div>
          <span className="proof-job-source">Illustrative example</span>
        </section>
        <section className="proof-resume-card" aria-label="Example resume draft">
          <div className="proof-document-label"><FileText size={15} /> Resume draft <span className="proof-draft-tag">Review</span></div>
          <h2>Maya Patel</h2>
          <p className="proof-resume-contact">Product designer / Chicago, IL</p>
          <div className="proof-rule" />
          <p className="proof-resume-section">Selected experience</p>
          <strong>Product Designer <span>2022—2025</span></strong>
          <p className="proof-resume-copy">Redesigned onboarding with product and engineering, making setup easier to follow for new customers.</p>
          <div className="proof-evidence-link"><span aria-hidden="true" /> From “Redesigned setup flow” in your Data Bank</div>
          <strong className="proof-earlier-title">Earlier experience <span>2019—2022</span></strong>
          <div className="proof-resume-line" /><div className="proof-resume-line short" />
          <div className="proof-preview-action">Review this line <MoveRight size={14} /></div>
        </section>
      </div>
      <div className="proof-workbench-footer"><CircleCheck size={14} /> You can edit every suggestion before it reaches your resume.</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Show when="signed-in">
        <DashboardLayout><AdaptiveResumeWorkspace /></DashboardLayout>
      </Show>
      <Show when="signed-out">
        <div className="proof-landing">
          <header className="proof-public-header">
            <Link href="/" className="proof-brand"><span className="proof-brand-mark" aria-hidden="true"><span /></span><span>Adaptive <strong>Resume</strong></span></Link>
            <nav aria-label="Public navigation">
              <Link href="#how-it-works">How it works</Link>
              <Link href="/privacy">Privacy</Link>
              <SignInButton mode="modal"><button className="proof-sign-in">Sign in</button></SignInButton>
              <SignUpButton mode="modal"><button className="proof-new-resume">Make a resume <MoveRight size={15} /></button></SignUpButton>
            </nav>
          </header>

          <main>
            <section className="proof-hero">
              <div className="proof-hero-copy">
                <p className="proof-hero-kicker"><Sun size={17} aria-hidden="true" /> A clearer next step</p>
                <h1>One job description.<br /><em>A resume that fits.</em></h1>
                <p>Paste the job you want. Get a clear draft built from the experience you’ve already saved.</p>
                <div className="proof-hero-actions">
                  <SignUpButton mode="modal"><button className="proof-primary-button">Start with a job description <MoveRight size={17} /></button></SignUpButton>
                  <Link href="#how-it-works" className="proof-scroll-link">See how it works <ArrowDown size={15} /></Link>
                </div>
                <p className="proof-hero-promise"><Fingerprint size={17} /> Your experience stays yours. You approve every line.</p>
              </div>
              <ResumeWorkbenchExample />
            </section>

            <div className="proof-format-strip" aria-label="Ways to start your Data Bank">
              <span>Start with what you have</span>
              <span><Upload size={16} /> Upload a PDF or DOCX</span>
              <span><FileText size={16} /> Paste a resume or work history</span>
              <span><CircleCheck size={16} /> Review before saving</span>
            </div>

            <section className="proof-how" id="how-it-works">
              <div className="proof-how-heading">
                <h2>Your work, shaped for this role.</h2>
                <p>Keep the details once. Bring the right ones forward when a new opportunity comes along.</p>
              </div>
              <div className="proof-how-steps">
                <article><span className="proof-step-mark proof-step-paper" aria-hidden="true"><FileText size={18} /></span><h3>Keep your experience</h3><p>Add your work, projects, education, and skills to your private Data Bank. Upload a resume to get started faster.</p><Link href="/sign-up">Build your Data Bank <MoveRight size={15} /></Link></article>
                <article><span className="proof-step-mark proof-step-match" aria-hidden="true"><CircleCheck size={19} /></span><h3>Paste the job</h3><p>Share the job description. Adaptive Resume finds relevant details from your own saved experience.</p><Link href="/sign-up">Tailor a resume <MoveRight size={15} /></Link></article>
                <article><span className="proof-step-mark proof-step-edit" aria-hidden="true"><FileText size={18} /></span><h3>Review and make it yours</h3><p>Edit, keep, or skip every suggestion. Then export a resume that reflects the work you’ve really done.</p><Link href="/privacy">See how your data is handled <MoveRight size={15} /></Link></article>
              </div>
            </section>

            <RevealSection className="proof-use-cases" id="your-work">
              <div className="proof-use-intro">
                <h2>One career story.<br /><em>More than one next step.</em></h2>
                <p>Keep your source details in one place. Build a clear version for each job you’re considering.</p>
              </div>
              <div className="proof-use-list">
                <article><span>Moving into a new field</span><p>Pull forward transferable work, like customer research or process improvements, when you apply for a different kind of role.</p><MoveRight size={18} /></article>
                <article><span>Applying for a close match</span><p>Bring the most relevant projects and responsibilities to the top, while keeping the details tied to your saved experience.</p><MoveRight size={18} /></article>
                <article><span>Managing a busy search</span><p>Keep each job description beside its resume draft and cover letter, so you can pick up where you left off.</p><MoveRight size={18} /></article>
              </div>
            </RevealSection>

            <section className="proof-privacy-band">
              <div><h2>Your work is personal.<br />Your resume should be, too.</h2><p>Imported details wait for your review. Contact information stays private unless you choose to share a resume.</p></div>
              <Link href="/privacy" className="proof-outline-link">Read the privacy policy <MoveRight size={16} /></Link>
            </section>

            <section className="proof-final-cta">
              <h2>Ready to make your next resume?</h2>
              <p>Start with a job description. Add your experience as you go.</p>
              <SignUpButton mode="modal"><button className="proof-primary-button">Make a resume for this job <MoveRight size={17} /></button></SignUpButton>
            </section>
          </main>

          <footer className="proof-public-footer">
            <Link href="/" className="proof-brand"><span className="proof-brand-mark" aria-hidden="true"><span /></span><span>Adaptive <strong>Resume</strong></span></Link>
            <span>Built around the work you’ve actually done.</span>
            <Link href="/privacy">Privacy policy</Link>
          </footer>
        </div>
      </Show>
    </>
  );
}
