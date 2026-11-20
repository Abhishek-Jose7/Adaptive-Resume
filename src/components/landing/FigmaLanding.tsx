"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { FigmaIcon, FigmaLogo } from "@/components/ui/FigmaIcon";

export const roles = [
  {
    label: "Frontend Intern",
    company: "Razorpay",
    match: 92,
    color: "#a98452",
    skills: ["React", "TypeScript", "REST APIs"],
  },
  {
    label: "SDE I",
    company: "CRED",
    match: 84,
    color: "#6f8377",
    skills: ["JavaScript", "System design", "Git"],
  },
  {
    label: "Product Engineer",
    company: "Postman",
    match: 78,
    color: "#315849",
    skills: ["Node.js", "Analytics", "Ownership"],
  },
];

export function ResumeSheet({
  roleIndex = 0,
  compact = false,
}: {
  roleIndex?: number;
  compact?: boolean;
}) {
  const role = roles[roleIndex] || roles[0];
  return (
    <div className={`resume-sheet ${compact ? "compact" : ""}`}>
      <div className="resume-top">
        <div>
          <strong>ARJUN MEHTA</strong>
          <span>B.Tech CSE · Pune, India</span>
        </div>
        <span className="match-pill" style={{ background: role.color }}>
          {role.match}% match
        </span>
      </div>
      <div className="resume-rule" />
      <p className="resume-role">
        TARGET · {role.label.toUpperCase()} @ {role.company.toUpperCase()}
      </p>
      <section>
        <b>EXPERIENCE &amp; PROJECTS</b>
        <h4>
          Campus Marketplace <span>Full-stack project</span>
        </h4>
        <p>
          Built a student marketplace used by <mark>420+ students</mark>, improving listing
          discovery through a responsive React interface.
        </p>
        <p>
          Designed <mark>REST APIs</mark> and reduced average response time by 34% through query
          optimisation.
        </p>
      </section>
      <section>
        <b>SKILLS</b>
        <div className="sheet-skills">
          {role.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </section>
      <div className="evidence-note">
        <FigmaIcon name="shield" size={14} /> Every claim links to approved evidence
      </div>
    </div>
  );
}

export function FigmaLanding() {
  const [role, setRole] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    let displayedProgress = 0;
    let targetProgress = 0;
    let frame = 0;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      const distance = targetProgress - displayedProgress;
      displayedProgress += distance * 0.105;
      gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));

      if (Math.abs(distance) > 0.0005) {
        frame = requestAnimationFrame(render);
      } else {
        displayedProgress = targetProgress;
        gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));
        frame = 0;
      }
    };

    const measure = () => {
      const rect = gallery.getBoundingClientRect();
      targetProgress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));

      if (reducedMotion) {
        displayedProgress = targetProgress;
        gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));
      } else if (!frame) {
        frame = requestAnimationFrame(render);
      }
    };

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    measure();

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="landing">
      {/* Top Navigation */}
      <nav className="top-nav">
        <FigmaLogo />
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#proof" onClick={() => setMenuOpen(false)}>
            Why truth-bound?
          </a>
          <a href="#privacy" onClick={() => setMenuOpen(false)}>
            Privacy
          </a>
        </div>
        <div className="nav-actions">
          <SignInButton mode="modal">
            <button type="button" className="text-button">
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="nav-cta">
              Build my resume <FigmaIcon name="arrow" size={17} />
            </button>
          </SignUpButton>
        </div>
        <button
          type="button"
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <FigmaIcon name="menu" />
        </button>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>Built for the job hunt</span>
            <span>Not the hype cycle</span>
          </div>
          <h1>
            One honest career.
            <br />
            <em>Every right version.</em>
          </h1>
          <p className="hero-lede">
            Turn your real projects, internships and skills into a resume that speaks directly to
            every job—without inventing a single thing.
          </p>
          <div className="hero-actions">
            <SignUpButton mode="modal">
              <button type="button" className="primary-button">
                Create my Career Vault <FigmaIcon name="arrow" />
              </button>
            </SignUpButton>
            <SignUpButton mode="modal">
              <button type="button" className="secondary-button">
                <FigmaIcon name="download" /> Import existing resume
              </button>
            </SignUpButton>
          </div>
          <p className="micro-trust">
            <FigmaIcon name="shield" size={15} /> Private by design · No credit card · Your facts stay
            yours
          </p>
        </div>

        <div className="hero-visual" aria-label="Resume tailoring example for an Indian graduate">
          <div className="visual-label">
            <span>LIVE EXAMPLE</span> ARJUN, 2025 GRAD · PUNE
          </div>
          <div className="job-card">
            <div className="company-mark">R</div>
            <div>
              <strong>Frontend Engineer Intern</strong>
              <span>Razorpay · Bengaluru</span>
            </div>
            <div className="job-match">
              92%<span>fit</span>
            </div>
          </div>
          <ResumeSheet />
          <div className="proof-tag proof-one">
            <FigmaIcon name="check" size={16} /> Verified project metric
          </div>
          <div className="proof-tag proof-two">
            <FigmaIcon name="spark" size={16} /> 6 keywords matched
          </div>
          <div className="orange-orbit" />
        </div>

        <div className="scroll-note">
          Scroll to see it adapt <span>↓</span>
        </div>
      </header>

      {/* Ticker Strip */}
      <section className="ticker" aria-label="Key benefits">
        <div>
          NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span>{" "}
          EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span> NO FAKE CLAIMS{" "}
          <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span> EVERY BULLET HAS
          PROOF <span>✦</span> YOUR DATA, NEVER SOLD
        </div>
      </section>

      {/* 01 — Scroll Gallery Section */}
      <section className="gallery-section" ref={galleryRef} id="proof">
        <div className="gallery-sticky">
          <div className="gallery-copy">
            <span className="section-index">01 — ADAPT, DON&apos;T INVENT</span>
            <h2>
              Your story stays true.
              <br />
              <em>The emphasis moves.</em>
            </h2>
            <p>
              One verified candidate profile becomes a precise resume for each role. Scroll to watch
              the same real experience change focus.
            </p>
          </div>
          <div className="scroll-gallery">
            {roles.map((item, index) => (
              <div className={`gallery-card card-${index}`} key={item.label}>
                <div className="gallery-role">
                  <span style={{ background: item.color }}>{index + 1}</span>
                  <div>
                    <b>{item.label}</b>
                    <small>{item.company} · Bengaluru</small>
                  </div>
                </div>
                <ResumeSheet roleIndex={index} compact />
              </div>
            ))}
          </div>
          <div className="scroll-meter">
            <span />
            <small>SCROLL TO TAILOR</small>
          </div>
        </div>
      </section>

      {/* Section Bridge */}
      <div className="section-bridge" aria-hidden="true">
        <span>ONE VERIFIED FOUNDATION</span>
        <i />
        <b>THE THREE-STEP METHOD</b>
        <i />
        <span>THREE PRECISE APPLICATIONS</span>
      </div>

      {/* 02 — Steps Section */}
      <section className="steps-section" id="how">
        <div className="section-heading">
          <span className="section-index">02 — THE CORE LOOP</span>
          <h2>
            From scattered history
            <br />
            to a sharper application.
          </h2>
          <p>Three calm steps. No prompt engineering required.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card step-dark">
            <span className="step-num">01</span>
            <div className="icon-box">
              <FigmaIcon name="bank" />
            </div>
            <h3>
              Build your
              <br />
              Career Data Bank
            </h3>
            <p>
              Import an old resume or add projects, coursework and internships. You approve every
              fact we keep.
            </p>
            <div className="mini-vault">
              {["Zepto clone · Project", "TCS iON · Internship", "React · Skill"].map((x, i) => (
                <div key={x}>
                  <span className={`vault-dot d${i}`} />
                  {x}
                  <FigmaIcon name="check" size={15} />
                </div>
              ))}
            </div>
          </article>
          <article className="step-card step-yellow">
            <span className="step-num">02</span>
            <div className="icon-box">
              <FigmaIcon name="target" />
            </div>
            <h3>
              Target any
              <br />
              job listing
            </h3>
            <p>
              Paste a job description. See matched skills, missing keywords and your strongest
              evidence in seconds.
            </p>
            <div className="job-analysis">
              <div>
                <span>MATCH</span>
                <b>92%</b>
              </div>
              <div className="bars">
                <i />
                <i />
                <i />
                <i />
              </div>
              <small>Strong fit for Frontend Intern</small>
            </div>
          </article>
          <article className="step-card step-light">
            <span className="step-num">03</span>
            <div className="icon-box">
              <FigmaIcon name="file" />
            </div>
            <h3>
              Review, approve
              <br />&amp; export
            </h3>
            <p>
              Trace every bullet back to a real fact. Edit the wording, approve, then export a clean
              ATS-ready PDF.
            </p>
            <div className="approved-bullet">
              <FigmaIcon name="shield" />
              <div>
                <span>EVIDENCE-LINKED</span>
                <p>Built React interface used by 420+ students.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 03 — Tailor Shift Section */}
      <section className="tailor-section">
        <div className="tailor-heading">
          <span className="section-index">03 — TRY THE SHIFT</span>
          <h2>
            Same candidate.
            <br />
            Different spotlight.
          </h2>
          <p>Choose a role to see which verified facts rise to the top.</p>
          <div className="role-tabs">
            {roles.map((item, i) => (
              <button
                type="button"
                key={item.label}
                onClick={() => setRole(i)}
                className={role === i ? "active" : ""}
              >
                {item.label}
                <span>{item.match}%</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tailor-preview">
          <div className="analysis-rail">
            <span>ROLE SIGNALS</span>
            {roles[role].skills.map((skill, i) => (
              <div key={skill}>
                <b>{skill}</b>
                <div>
                  <i style={{ width: `${92 - i * 13}%`, background: roles[role].color }} />
                </div>
                <small>{92 - i * 8}%</small>
              </div>
            ))}
            <div className="truth-box">
              <FigmaIcon name="shield" />
              <p>
                <b>Truth-bound</b>
                <br />0 unsupported claims
              </p>
            </div>
          </div>
          <ResumeSheet roleIndex={role} />
        </div>
      </section>

      {/* 04 — Privacy Trust Section */}
      <section className="trust-section" id="privacy">
        <div className="trust-stamp">
          <FigmaIcon name="lock" size={32} />
          <span>
            PRIVATE
            <br />
            BY DEFAULT
          </span>
        </div>
        <div>
          <span className="section-index">04 — YOUR CAREER IS NOT OUR PRODUCT</span>
          <h2>
            Private career data.
            <br />
            Period.
          </h2>
        </div>
        <div className="trust-copy">
          <p>
            Your work history is deeply personal. We use it only to build the resumes you
            request—never to train public models, never to sell ads, never to hand off to recruiters.
          </p>
          <div>
            <span>
              <FigmaIcon name="check" size={16} /> Encrypted
            </span>
            <span>
              <FigmaIcon name="check" size={16} /> Export anytime
            </span>
            <span>
              <FigmaIcon name="check" size={16} /> Delete in one click
            </span>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta">
        <div className="cta-star">✦</div>
        <span>YOUR NEXT APPLICATION DESERVES BETTER</span>
        <h2>
          Stop rewriting.
          <br />
          <em>Start applying.</em>
        </h2>
        <p>
          Build your Career Vault once. Walk into every application with the right story—and the
          proof to back it.
        </p>
        <SignUpButton mode="modal">
          <button type="button" className="primary-button light">
            Create my Career Vault <FigmaIcon name="arrow" />
          </button>
        </SignUpButton>
      </section>

      {/* Editorial Footer */}
      <footer className="landing-footer">
        <FigmaLogo inverse />
        <p>
          Made for ambitious starts.
          <br />
          Built in India, for everywhere.
        </p>
        <div>
          <a href="#how">Product</a>
          <Link href="/privacy">Privacy</Link>
          <SignInButton mode="modal">
            <button type="button">Log in</button>
          </SignInButton>
        </div>
        <span>© 2025 Adaptive Resume</span>
      </footer>
    </main>
  );
}
