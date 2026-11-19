import Link from "next/link";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import { AdaptiveResumeWorkspace } from "@/components/workspace/AdaptiveResumeWorkspace";
import DashboardLayout from "@/app/(dashboard)/layout";
import { RevealSection } from "@/components/marketing/RevealSection";
import { ArrowDown, MoveRight, CircleCheck, FileText, Fingerprint } from "lucide-react";

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
                <h1>Your next role,<br /><em>grounded in your work.</em></h1>
                <p>Paste a job description. See a resume draft shaped from your experience, with every line ready for your review.</p>
                <div className="proof-hero-actions">
                  <SignUpButton mode="modal"><button className="proof-primary-button">Paste a job description <MoveRight size={17} /></button></SignUpButton>
                  <Link href="#how-it-works" className="proof-scroll-link">See how it works <ArrowDown size={15} /></Link>
                </div>
                <p className="proof-hero-promise"><Fingerprint size={17} /> Your experience stays yours. You approve every line.</p>
              </div>
              <ResumeWorkbenchExample />
            </section>

            <div className="proof-format-strip" role="region" tabIndex={0} aria-label="Ways to get started. Focus or hover to pause the moving text.">
              <p className="sr-only">Upload your resume. Paste your work history. Review every detail. Start with the job you want.</p>
              <div className="proof-format-track" aria-hidden="true">
                {[0, 1].map((copy) => (
                  <div className="proof-format-group" key={copy} aria-hidden={copy === 1 ? "true" : undefined}>
                    <strong>Upload your resume</strong>
                    <strong>Paste your work history</strong>
                    <strong>Review every detail</strong>
                    <strong>Start with the job you want</strong>
                  </div>
                ))}
              </div>
            </div>

            <RevealSection className="proof-how" id="how-it-works">
              <div className="proof-how-heading">
                <h2>Your work, shaped for this role.</h2>
                <p>Keep the details once. Bring the right ones forward when a new opportunity comes along.</p>
              </div>
              <div className="proof-how-steps">
                <article><span className="proof-step-mark proof-step-paper" aria-hidden="true"><FileText size={18} /></span><h3>Keep your experience</h3><p>Add your work, projects, education, and skills to your private Data Bank. Upload a resume to get started faster.</p><Link href="/sign-up">Build your Data Bank <MoveRight size={15} /></Link></article>
                <article><span className="proof-step-mark proof-step-match" aria-hidden="true"><CircleCheck size={19} /></span><h3>Paste the job</h3><p>Share the job description. Adaptive Resume finds relevant details from your own saved experience.</p><Link href="/sign-up">Tailor a resume <MoveRight size={15} /></Link></article>
                <article><span className="proof-step-mark proof-step-edit" aria-hidden="true"><FileText size={18} /></span><h3>Review and make it yours</h3><p>Edit, keep, or skip every suggestion. Then export a resume that reflects the work you’ve really done.</p><Link href="/privacy">See how your data is handled <MoveRight size={15} /></Link></article>
              </div>
            </RevealSection>

            <RevealSection className="proof-use-cases" id="your-work">
              <div className="proof-use-intro">
                <h2>Show how your work<br /><em>travels with you.</em></h2>
                <p>A support specialist applying for a customer success role can bring forward relevant experience without changing the facts.</p>
              </div>
              <div className="proof-use-list" aria-label="Example: customer support specialist applying for customer success manager">
                <div className="proof-scenario-heading"><span>Illustrative example</span><strong>Customer support → Customer success</strong></div>
                <div className="proof-scenario-grid">
                  <article className="proof-scenario-role">
                    <span>What the role asks for</span>
                    <h3>Customer Success Manager</h3>
                    <p>Guide new accounts through setup, resolve recurring blockers, and bring customer feedback to the product team.</p>
                  </article>
                  <article className="proof-scenario-record">
                    <span>Already in your Data Bank</span>
                    <ul><li>Wrote a setup guide for new customers</li><li>Passed recurring onboarding issues to product</li></ul>
                  </article>
                  <article className="proof-scenario-draft">
                    <span>Suggested resume line</span>
                    <blockquote>Created onboarding resources and brought recurring customer setup issues to the product team.</blockquote>
                    <small>Linked to two saved career records. Review or edit before saving.</small>
                  </article>
                </div>
              </div>
            </RevealSection>

            <RevealSection className="proof-privacy-band">
              <div><h2>Your work is personal.<br />Your resume should be, too.</h2><p>Imported details wait for your review. Contact information stays private unless you choose to share a resume.</p></div>
              <Link href="/privacy" className="proof-outline-link">Read the privacy policy <MoveRight size={16} /></Link>
            </RevealSection>

            <RevealSection className="proof-final-cta">
              <h2>Ready to make your next resume?</h2>
              <p>Start with a job description. Add your experience as you go.</p>
              <SignUpButton mode="modal"><button className="proof-primary-button">Make a resume for this job <MoveRight size={17} /></button></SignUpButton>
            </RevealSection>
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
