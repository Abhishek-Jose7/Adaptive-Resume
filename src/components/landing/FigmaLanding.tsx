"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { FigmaIcon, FigmaLogo } from "@/components/ui/FigmaIcon";

export interface DetailedBullet {
  text: string;
  keywords: string[];
}

export interface DetailedRole {
  label: string;
  targetRole: string;
  company: string;
  location: string;
  match: number;
  color: string;
  skills: string[];
  signals: { name: string; pct: number }[];
  targetBanner: string;
  summary: string;
  experience: {
    title: string;
    company: string;
    location: string;
    period: string;
    bullets: DetailedBullet[];
  }[];
  projects: {
    title: string;
    type: string;
    bullets: DetailedBullet[];
  }[];
  skillCategories: {
    category: string;
    skills: string[];
  }[];
}

export const roles: DetailedRole[] = [
  {
    label: "Frontend Intern",
    targetRole: "Frontend Engineer Intern",
    company: "Razorpay",
    location: "Bengaluru, India",
    match: 92,
    color: "#a98452",
    skills: ["React", "TypeScript", "REST APIs", "Tailwind CSS", "Web Vitals"],
    signals: [
      { name: "React & Component Architecture", pct: 95 },
      { name: "TypeScript & Strict Typing", pct: 90 },
      { name: "REST APIs & Optimistic UI", pct: 88 },
      { name: "Tailwind CSS & WCAG Accessibility", pct: 94 },
    ],
    targetBanner: "TARGET: FRONTEND INTERN @ RAZORPAY · 92% ATS MATCH",
    summary:
      "Frontend-focused engineer specializing in React 18, TypeScript, and modern component design systems. Proven experience slashing bundle sizes, integrating payment flows with optimistic UI, and building responsive, accessible web applications.",
    experience: [
      {
        title: "Frontend Engineering Intern",
        company: "PayPulse Technologies",
        location: "Remote",
        period: "Jan 2024 – Present",
        bullets: [
          {
            text: "Re-architected user dashboard with React 18 & TypeScript, cutting First Contentful Paint by 42% and eliminating unnecessary re-renders via useMemo and React.memo.",
            keywords: ["React 18", "TypeScript", "First Contentful Paint", "useMemo", "React.memo"],
          },
          {
            text: "Engineered 20+ accessible UI components using Tailwind CSS and Radix UI primitives, ensuring 100% WCAG 2.1 AA compliance across mobile and desktop viewports.",
            keywords: ["Tailwind CSS", "Radix UI", "WCAG 2.1 AA"],
          },
          {
            text: "Integrated RESTful payment gateway APIs with optimistic UI states and resilient error boundaries, decreasing checkout drop-offs by 14%.",
            keywords: ["RESTful payment gateway APIs", "optimistic UI states", "error boundaries"],
          },
        ],
      },
    ],
    projects: [
      {
        title: "Campus Trade Portal",
        type: "Production SPA (React / Vite)",
        bullets: [
          {
            text: "Developed responsive single-page web app used by 420+ university students for textbook exchanges, featuring real-time debounce search and client-side caching.",
            keywords: ["420+ university students", "debounce search", "client-side caching"],
          },
          {
            text: "Built robust client-side form validation using React Hook Form & Zod, dropping form submission input errors by 65%.",
            keywords: ["React Hook Form", "Zod", "65%"],
          },
        ],
      },
      {
        title: "DevLens — Core Web Vitals Visualizer",
        type: "Open-Source Web Utility",
        bullets: [
          {
            text: "Built real-time web performance dashboard leveraging Chrome DevTools Protocol and Chart.js, visualizing LCP and CLS metrics across 50+ URLs.",
            keywords: ["real-time web performance dashboard", "Chart.js", "LCP", "CLS"],
          },
        ],
      },
    ],
    skillCategories: [
      {
        category: "Languages & Core",
        skills: ["TypeScript", "JavaScript (ES6+)", "HTML5", "CSS3 / Sass"],
      },
      {
        category: "Frameworks & UI",
        skills: ["React.js", "Next.js", "Tailwind CSS", "Radix UI", "Redux Toolkit"],
      },
      {
        category: "Tools & Testing",
        skills: ["Vite", "Webpack", "Git", "Jest", "React Testing Library", "Figma"],
      },
    ],
  },
  {
    label: "SDE I",
    targetRole: "Software Development Engineer I",
    company: "CRED",
    location: "Bengaluru, India",
    match: 86,
    color: "#6f8377",
    skills: ["Node.js", "PostgreSQL", "System Design", "Redis", "Microservices"],
    signals: [
      { name: "Node.js & Microservices Architecture", pct: 92 },
      { name: "PostgreSQL Indexing & Optimization", pct: 89 },
      { name: "Redis Caching & Concurrency", pct: 85 },
      { name: "System Design & Distributed Data", pct: 84 },
    ],
    targetBanner: "TARGET: SDE I @ CRED · 86% ATS MATCH",
    summary:
      "Full-stack software engineer with strong foundations in distributed backend systems, PostgreSQL query optimization, and high-concurrency microservices. Passionate about clean architecture, strict ACID guarantees, and automated CI/CD pipelines.",
    experience: [
      {
        title: "Software Engineering Intern",
        company: "PayPulse Technologies",
        location: "Remote",
        period: "Jan 2024 – Present",
        bullets: [
          {
            text: "Engineered Node.js & TypeScript microservices processing 12,000+ daily financial transactions with 99.9% service uptime.",
            keywords: ["Node.js", "TypeScript microservices", "12,000+ daily financial transactions", "99.9% service uptime"],
          },
          {
            text: "Optimized PostgreSQL indexes and compound query execution plans, dropping p95 database response latency from 410ms down to 88ms.",
            keywords: ["PostgreSQL indexes", "p95 database response latency", "88ms"],
          },
          {
            text: "Authored comprehensive test suites using Jest and Supertest, driving automated integration test coverage from 54% to 91% in CI/CD pipeline.",
            keywords: ["Jest", "Supertest", "91% in CI/CD pipeline"],
          },
        ],
      },
    ],
    projects: [
      {
        title: "Campus Trade Portal",
        type: "Distributed Backend Architecture",
        bullets: [
          {
            text: "Designed normalized relational schema with Prisma ORM and enforced ACID transactional consistency using row-level locking during order checkout.",
            keywords: ["relational schema", "Prisma ORM", "ACID transactional consistency", "row-level locking"],
          },
          {
            text: "Configured Redis cache layer for high-frequency inventory queries, absorbing 68% of database load during campus peak traffic hours.",
            keywords: ["Redis cache layer", "68% of database load"],
          },
        ],
      },
      {
        title: "Distributed Order Ledger & Bot",
        type: "Systems Project",
        bullets: [
          {
            text: "Implemented event-driven transactional ledger utilizing WebSockets and idempotency keys to guarantee exactly-once message delivery.",
            keywords: ["event-driven transactional ledger", "idempotency keys", "exactly-once message delivery"],
          },
        ],
      },
    ],
    skillCategories: [
      {
        category: "Backend & Systems",
        skills: ["Node.js", "Express", "TypeScript", "PostgreSQL", "Redis", "Prisma ORM"],
      },
      {
        category: "Architecture & Ops",
        skills: ["System Design", "Microservices", "REST APIs", "Docker", "Git", "CI/CD"],
      },
      {
        category: "Languages & Testing",
        skills: ["TypeScript", "Python", "SQL", "Go", "Jest", "Supertest"],
      },
    ],
  },
  {
    label: "Product Engineer",
    targetRole: "Product & Backend Engineer",
    company: "Postman",
    location: "Bengaluru, India",
    match: 80,
    color: "#315849",
    skills: ["API Design", "OpenAPI", "Webhooks", "Telemetry", "Developer Tools"],
    signals: [
      { name: "OpenAPI 3.0 & REST Contract Design", pct: 94 },
      { name: "Webhooks & Reliable Event Queues", pct: 88 },
      { name: "OpenTelemetry & Distributed Tracing", pct: 86 },
      { name: "Developer Experience & SDK Generation", pct: 90 },
    ],
    targetBanner: "TARGET: PRODUCT ENGINEER @ POSTMAN · 80% ATS MATCH",
    summary:
      "Product-minded software engineer focused on developer tooling, API governance, and distributed telemetry. Experienced in translating user requirements into scalable developer platforms, open-source utilities, and automated SDK generators.",
    experience: [
      {
        title: "Backend & Developer Tooling Intern",
        company: "PayPulse Technologies",
        location: "Remote",
        period: "Jan 2024 – Present",
        bullets: [
          {
            text: "Authored strict OpenAPI 3.0 specifications and automated TypeScript SDK generation, speeding up partner developer onboarding by 3x.",
            keywords: ["OpenAPI 3.0 specifications", "automated TypeScript SDK generation", "3x"],
          },
          {
            text: "Built resilient webhook delivery system with exponential backoff retry queues in Redis, handling 250,000+ reliable event dispatches daily.",
            keywords: ["webhook delivery system", "Redis", "250,000+ reliable event dispatches"],
          },
          {
            text: "Implemented OpenTelemetry distributed tracing and structured JSON logging across 4 services, reducing Mean Time to Resolution (MTTR) by 45%.",
            keywords: ["OpenTelemetry distributed tracing", "Mean Time to Resolution (MTTR) by 45%"],
          },
        ],
      },
    ],
    projects: [
      {
        title: "API Mock & Contract Validator CLI",
        type: "Open-Source Developer Tool",
        bullets: [
          {
            text: "Built cross-platform Node.js CLI tool that validates HTTP payload responses against JSON Schemas in pre-commit git hooks; 1,800+ weekly downloads.",
            keywords: ["CLI tool", "JSON Schemas", "1,800+ weekly downloads"],
          },
          {
            text: "Authored interactive terminal UI using Commander.js and automated version releases via GitHub Actions.",
            keywords: ["Commander.js", "GitHub Actions"],
          },
        ],
      },
      {
        title: "Campus Trade Analytics Pipeline",
        type: "Telemetry & Product Analytics",
        bullets: [
          {
            text: "Instrumented custom telemetry pipeline to track funnel conversion metrics, generating automated weekly retention summaries for campus sellers.",
            keywords: ["telemetry pipeline", "funnel conversion metrics", "weekly retention summaries"],
          },
        ],
      },
    ],
    skillCategories: [
      {
        category: "API & Tooling",
        skills: ["API Design", "OpenAPI 3.0", "Postman", "Webhooks", "JSON Schema", "CLI Tools"],
      },
      {
        category: "Backend & Observability",
        skills: ["Node.js", "TypeScript", "Redis", "PostgreSQL", "Docker", "OpenTelemetry"],
      },
      {
        category: "Product & Workflow",
        skills: ["Developer Experience", "Telemetry & Metrics", "Git", "GitHub Actions"],
      },
    ],
  },
];

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords || keywords.length === 0) return <>{text}</>;
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
        return isMatch ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ResumeSheet({
  roleIndex = 0,
  compact = false,
}: {
  roleIndex?: number;
  compact?: boolean;
}) {
  const role = roles[roleIndex] || roles[0];

  if (compact) {
    return (
      <div className="resume-sheet compact">
        <div className="resume-top">
          <div>
            <strong>ARJUN MEHTA</strong>
            <span className="resume-subtitle">B.Tech CSE · Pune, India</span>
          </div>
          <span className="match-pill" style={{ background: role.color }}>
            {role.match}% match
          </span>
        </div>
        <div className="resume-rule" />
        <div className="target-banner">
          <span>{role.targetBanner}</span>
        </div>
        <div className="resume-section">
          <span className="section-title">WORK EXPERIENCE</span>
          <div className="entry-item">
            <div className="entry-header">
              <h4>
                {role.experience[0].title} · <span>{role.experience[0].company}</span>
              </h4>
              <span className="entry-meta">{role.experience[0].period}</span>
            </div>
            <ul className="entry-bullets">
              <li>
                <HighlightedText
                  text={role.experience[0].bullets[0].text}
                  keywords={role.experience[0].bullets[0].keywords}
                />
              </li>
            </ul>
          </div>
        </div>
        <div className="resume-section">
          <span className="section-title">KEY PROJECT</span>
          <div className="entry-item">
            <div className="entry-header">
              <h4>
                {role.projects[0].title} · <span>{role.projects[0].type}</span>
              </h4>
            </div>
            <ul className="entry-bullets">
              <li>
                <HighlightedText
                  text={role.projects[0].bullets[0].text}
                  keywords={role.projects[0].bullets[0].keywords}
                />
              </li>
            </ul>
          </div>
        </div>
        <div className="resume-section">
          <span className="section-title">TARGET SKILLS</span>
          <div className="sheet-skills">
            {role.skills.slice(0, 5).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>
        <div className="evidence-note">
          <span>
            <FigmaIcon name="shield" size={13} /> Verified by Career Vault
          </span>
          <span>0 unverified claims</span>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-sheet">
      <div className="resume-top">
        <div>
          <strong>ARJUN MEHTA</strong>
          <span className="resume-subtitle">Software Engineer · B.Tech Computer Science (2026)</span>
          <div className="resume-contact-bar">
            <span>Pune, MH, India</span>
            <span>·</span>
            <span>+91 98201 45820</span>
            <span>·</span>
            <span>arjun.mehta@email.com</span>
            <span>·</span>
            <span>github.com/arjunmehta</span>
            <span>·</span>
            <span>linkedin.com/in/arjun-mehta</span>
          </div>
        </div>
        <span className="match-pill" style={{ background: role.color }}>
          {role.match}% match
        </span>
      </div>

      <div className="resume-rule" />

      <div className="target-banner">
        <span>{role.targetBanner}</span>
        <span className="score-tag">VERIFIED MATCH</span>
      </div>

      <div className="resume-section">
        <span className="section-title">PROFESSIONAL SUMMARY</span>
        <p className="summary-text">{role.summary}</p>
      </div>

      <div className="resume-section">
        <span className="section-title">WORK EXPERIENCE</span>
        {role.experience.map((exp) => (
          <div className="entry-item" key={exp.title + exp.company}>
            <div className="entry-header">
              <h4>
                {exp.title} · <span>{exp.company}</span>
              </h4>
              <span className="entry-meta">
                {exp.period} | {exp.location}
              </span>
            </div>
            <ul className="entry-bullets">
              {exp.bullets.map((b, bi) => (
                <li key={bi}>
                  <HighlightedText text={b.text} keywords={b.keywords} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="resume-section">
        <span className="section-title">PRODUCTION &amp; OPEN SOURCE PROJECTS</span>
        {role.projects.map((proj) => (
          <div className="entry-item" key={proj.title}>
            <div className="entry-header">
              <h4>
                {proj.title} · <span>{proj.type}</span>
              </h4>
            </div>
            <ul className="entry-bullets">
              {proj.bullets.map((b, bi) => (
                <li key={bi}>
                  <HighlightedText text={b.text} keywords={b.keywords} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="resume-section">
        <span className="section-title">TECHNICAL SKILLS</span>
        <div className="categorized-skills">
          {role.skillCategories.map((cat) => (
            <div className="skill-cat-row" key={cat.category}>
              <b>{cat.category}:</b> {cat.skills.join(" · ")}
            </div>
          ))}
        </div>
      </div>

      <div className="resume-section">
        <span className="section-title">EDUCATION</span>
        <div className="education-item">
          <div>
            <b>B.Tech in Computer Science &amp; Engineering</b> · Pune Institute of Computer Technology
          </div>
          <span>2022 – 2026 | CGPA: 8.8 / 10</span>
        </div>
      </div>

      <div className="evidence-note">
        <span>
          <FigmaIcon name="shield" size={13} /> Grounded in Career Vault Facts
        </span>
        <span>0 Hallucinated Claims · ATS-Ready</span>
      </div>
    </div>
  );
}

export function FigmaLanding() {
  const [role, setRole] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const tailorRef = useRef<HTMLElement>(null);
  const userManualRef = useRef(false);
  const manualTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gallery Symmetrical Scroll Animation
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

  // Section 03 "TRY THE SHIFT" Scroll Synchronizer
  useEffect(() => {
    const tailor = tailorRef.current;
    if (!tailor) return;

    const handleScroll = () => {
      if (userManualRef.current) return;
      const rect = tailor.getBoundingClientRect();
      const windowH = window.innerHeight;

      // When tailor section is in view
      if (rect.top <= windowH * 0.4 && rect.bottom >= windowH * 0.2) {
        const totalScrollable = rect.height - windowH;
        if (totalScrollable > 0) {
          const scrolled = -rect.top + windowH * 0.15;
          const p = Math.max(0, Math.min(1, scrolled / totalScrollable));
          if (p < 0.35) {
            setRole(0);
          } else if (p < 0.70) {
            setRole(1);
          } else {
            setRole(2);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleRoleSelect = useCallback((idx: number) => {
    setRole(idx);
    userManualRef.current = true;
    if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
    manualTimeoutRef.current = setTimeout(() => {
      userManualRef.current = false;
    }, 3500);
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
          <a href="#shift" onClick={() => setMenuOpen(false)}>
            Interactive demo
          </a>
          <Link href="/privacy" onClick={() => setMenuOpen(false)}>
            Privacy
          </Link>
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
            <span>Smart Resume Tailoring</span>
            <span>Backed By Real Facts</span>
          </div>
          <h1>
            Your real skills.
            <br />
            <em>Tailored to any job post.</em>
          </h1>
          <p className="hero-lede">
            Store your projects, skills, and work experience once in your Career Vault. When you find
            a job you want, paste the job description—we match your actual background to what the
            employer is looking for and build an ATS-ready resume in seconds. Zero fake claims, zero
            AI hallucinations.
          </p>
          <div className="hero-actions">
            <SignUpButton mode="modal">
              <button type="button" className="primary-button">
                Build my tailored resume <FigmaIcon name="arrow" />
              </button>
            </SignUpButton>
            <SignUpButton mode="modal">
              <button type="button" className="secondary-button">
                <FigmaIcon name="download" /> Import existing resume
              </button>
            </SignUpButton>
          </div>
        </div>

        <div className="hero-visual" aria-label="Resume tailoring preview">
          <ResumeSheet roleIndex={0} compact={false} />
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
        <div className="ticker-track">
          <div className="ticker-group">
            NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span> EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span> NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span> EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span>
          </div>
          <div className="ticker-group" aria-hidden="true">
            NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span> EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span> NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span> EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span>
          </div>
        </div>
      </section>

      {/* Section 02 — Symmetrical Scroll Gallery */}
      <section className="gallery-section" ref={galleryRef} id="proof">
        <div className="gallery-sticky">
          <div className="gallery-copy">
            <h2>
              One career history.
              <br />
              <em>Customized for every role.</em>
            </h2>
            <p>
              You don&apos;t need to rewrite your resume from scratch for every application. See how
              the same verified skills and experience adapt to highlight exactly what each job
              description asks for.
            </p>
          </div>
          <div className="scroll-gallery">
            {roles.map((item, index) => (
              <div className={`gallery-card card-${index}`} key={item.label}>
                <div className="gallery-role">
                  <span style={{ background: item.color }}>{index + 1}</span>
                  <div>
                    <b>{item.label}</b>
                    <small>{item.company} · {item.location}</small>
                  </div>
                </div>
                <ResumeSheet roleIndex={index} compact />
              </div>
            ))}
          </div>
          <div className="scroll-meter">
            <span />
            <small>SCROLL TO ADAPT</small>
          </div>
        </div>
      </section>

      {/* Section Bridge */}
      <div className="section-bridge" aria-hidden="true">
        <span>ONE VERIFIED FOUNDATION</span>
        <i />
        <b>THE THREE-STEP METHOD</b>
        <i />
        <span>TARGETED APPLICATIONS</span>
      </div>

      {/* Steps Section — How It Works */}
      <section className="steps-section" id="how">
        <div className="section-heading">
          <span className="section-index">HOW IT WORKS</span>
          <h2>
            From your real experience
            <br />
            to an interview-ready resume.
          </h2>
          <p>Three simple steps. No prompt engineering, no guesswork.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card step-dark">
            <span className="step-num">01</span>
            <div className="icon-box">
              <FigmaIcon name="bank" />
            </div>
            <h3>
              Save your real
              <br />
              background once
            </h3>
            <p>
              Upload an existing resume or add your projects, internships, and technical skills into
              your Career Vault. You verify every fact.
            </p>
            <div className="mini-vault">
              {["Campus Portal · Project", "PayPulse · Internship", "TypeScript · Skill"].map((x, i) => (
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
              Paste any
              <br />
              job description
            </h3>
            <p>
              Paste the job post from LinkedIn, Indeed, or any career portal. Our engine instantly
              extracts the skills and keywords the recruiter wants.
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
              Get your tailored
              <br />
              ATS resume
            </h3>
            <p>
              We generate a resume that spotlights your matching experience and skills. Every bullet
              point is grounded in your real background, ready to export as PDF.
            </p>
            <div className="approved-bullet">
              <FigmaIcon name="shield" />
              <div>
                <span>EVIDENCE-LINKED</span>
                <p>Re-architected dashboard with React 18 &amp; TypeScript.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Section 03 — Interactive Demo (Scroll-Driven Role Shift) */}
      <section className="tailor-section" ref={tailorRef} id="shift">
        <div className="tailor-sticky">
          <div className="tailor-heading">
            <span className="section-index">INTERACTIVE PREVIEW</span>
            <h2>
              Same candidate.
              <br />
              Different spotlight.
            </h2>
            <p>
              Scroll down or choose a role below to see how Arjun&apos;s verified experience and skills
              rearrange to match what each employer wants:
            </p>
            <div className="role-tabs">
              {roles.map((item, i) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => handleRoleSelect(i)}
                  className={role === i ? "active" : ""}
                >
                  {item.label} @ {item.company}
                  <span>{item.match}% match</span>
                </button>
              ))}
            </div>
          </div>
          <div className="tailor-preview">
            <div className="analysis-rail">
              <span>MATCHED SIGNALS</span>
              {roles[role].signals.map((sig) => (
                <div key={sig.name}>
                  <b>{sig.name}</b>
                  <div>
                    <i style={{ width: `${sig.pct}%`, background: roles[role].color }} />
                  </div>
                  <small>{sig.pct}% confidence</small>
                </div>
              ))}
              <div className="truth-box">
                <FigmaIcon name="shield" />
                <p>
                  <b>100% Truth-Bound</b>
                  <br />0 unverified claims or AI hallucinations
                </p>
              </div>
            </div>
            <ResumeSheet roleIndex={role} compact={false} />
          </div>
        </div>
      </section>

      {/* Section 04 — Privacy Trust Section */}
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
          <span className="section-index">DATA PRIVACY &amp; SECURITY</span>
          <h2>
            Your career data is private.
            <br />
            Period.
          </h2>
        </div>
        <div className="trust-copy">
          <p>
            Your work history is deeply personal. We use it only to generate the resumes you
            request—never to train public models, never to sell ads, and never to share with recruiters.
          </p>
          <div>
            <span>
              <FigmaIcon name="check" size={16} /> AES-256 Encrypted
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
          real proof to back it up.
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
          <a href="#how">How it works</a>
          <a href="#shift">Demo</a>
          <Link href="/privacy">Privacy</Link>
          <SignInButton mode="modal">
            <button type="button">Log in</button>
          </SignInButton>
        </div>
        <span>© 2026 Adaptive Resume</span>
      </footer>
    </main>
  );
}
