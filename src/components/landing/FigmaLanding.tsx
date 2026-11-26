"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { FigmaIcon, FigmaLogo } from "@/components/ui/FigmaIcon";

export interface DetailedBullet {
  text: string;
  keywords: string[];
}

export interface RoleAnnotation {
  id: string;
  badge: string;
  text: string;
  side: "left" | "right";
  top: string;
  arrowType: "left" | "right" | "up-left" | "down-left" | "up-right" | "down-right";
  rotation?: string;
  badgeColor?: string;
  arrowColor?: string;
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
  annotations: RoleAnnotation[];
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
    annotations: [
      {
        id: "r0-banner",
        badge: "92% ATS MATCH",
        text: "Target headline anchored to React 18 & Design Systems",
        side: "right",
        top: "13.5%",
        arrowType: "left",
        rotation: "rotate(-1.5deg)",
      },
      {
        id: "r0-exp",
        badge: "PRIORITIZED #1",
        text: "Web Vitals (FCP -42%) & checkout perf moved to top bullet",
        side: "left",
        top: "36.5%",
        arrowType: "right",
        rotation: "rotate(1.2deg)",
      },
      {
        id: "r0-skills",
        badge: "SKILLS RE-ORDERED",
        text: "React, Next.js, Radix & Tailwind brought to #1 priority",
        side: "right",
        top: "73.5%",
        arrowType: "up-left",
        rotation: "rotate(-1.2deg)",
      },
    ],
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
    annotations: [
      {
        id: "r1-summary",
        badge: "SYSTEMS HEADLINE",
        text: "Summary reframed for Microservices & ACID Reliability",
        side: "left",
        top: "21%",
        arrowType: "down-right",
        rotation: "rotate(1.5deg)",
      },
      {
        id: "r1-project",
        badge: "ACID DATABASE PROJECT",
        text: "Highlighted Prisma row-level locks & Redis caching",
        side: "right",
        top: "53.5%",
        arrowType: "down-left",
        rotation: "rotate(-1.5deg)",
      },
      {
        id: "r1-skills",
        badge: "BACKEND PRIORITIZED",
        text: "Distributed backend stack ranked above UI tools",
        side: "left",
        top: "71.5%",
        arrowType: "up-right",
        rotation: "rotate(1.2deg)",
      },
    ],
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
    annotations: [
      {
        id: "r2-banner",
        badge: "80% ATS MATCH",
        text: "Re-anchored for API Governance & Tooling at Postman",
        side: "left",
        top: "13.5%",
        arrowType: "right",
        rotation: "rotate(-1.5deg)",
      },
      {
        id: "r2-exp",
        badge: "DEV-TOOLING FOCUS",
        text: "OpenAPI 3.0 specs & automated TypeScript SDKs put first",
        side: "right",
        top: "36.5%",
        arrowType: "left",
        rotation: "rotate(1.2deg)",
      },
      {
        id: "r2-tool",
        badge: "FEATURED TOOL",
        text: "Open-source CLI Mock Tool (1,800+ downloads) highlighted",
        side: "left",
        top: "54.5%",
        arrowType: "right",
        rotation: "rotate(-1.2deg)",
      },
    ],
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
        <section className="compact-section">
          <b>EXPERIENCE &amp; PROJECTS</b>
          <h4>
            {role.experience[0].title} <span>{role.experience[0].company}</span>
          </h4>
          <p>
            <HighlightedText
              text={role.experience[0].bullets[0].text}
              keywords={role.experience[0].bullets[0].keywords}
            />
          </p>
          <p>
            <HighlightedText
              text={role.projects[0].bullets[0].text}
              keywords={role.projects[0].bullets[0].keywords}
            />
          </p>
        </section>
        <section className="compact-section">
          <b>TARGET SKILLS</b>
          <div className="sheet-skills">
            {role.skills.slice(0, 5).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
        <section className="compact-section compact-edu">
          <b>EDUCATION</b>
          <p className="compact-edu-text">B.Tech CSE · Pune Institute of Computer Tech · 8.8 CGPA</p>
        </section>
        <div className="evidence-note">
          <FigmaIcon name="shield" size={13} />
          <span>Every claim links to approved evidence</span>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-sheet hero-a4-sheet">
      <div className="resume-top">
        <div>
          <strong>ARJUN MEHTA</strong>
          <span className="hero-resume-subtitle">Frontend &amp; Full-Stack Software Engineer</span>
          <div className="hero-resume-contact">
            <span>Pune, MH</span>
            <span>·</span>
            <span>+91 98201 45820</span>
            <span>·</span>
            <span>arjun.mehta@email.com</span>
            <span>·</span>
            <span>github.com/arjunmehta</span>
          </div>
        </div>
        <span className="match-pill" style={{ background: role.color }}>
          {role.match}% match
        </span>
      </div>
      <div className="resume-rule" />
      <div className="hero-target-banner">
        <span>TARGET · FRONTEND INTERN @ RAZORPAY</span>
        <span className="hero-target-badge">92% ATS MATCH</span>
      </div>

      <section className="hero-sheet-section">
        <b>EXPERIENCE</b>
        <div className="hero-entry">
          <div className="hero-entry-header">
            <h4>Frontend Engineering Intern · <span>PayPulse Technologies</span></h4>
            <span className="hero-entry-dates">Jan 2024 – Present</span>
          </div>
          <p>
            <HighlightedText
              text="Re-architected user dashboard with React 18 & TypeScript, cutting First Contentful Paint by 42% and eliminating unnecessary re-renders via useMemo and React.memo."
              keywords={["React 18", "TypeScript", "First Contentful Paint by 42%", "useMemo", "React.memo"]}
            />
          </p>
          <p>
            <HighlightedText
              text="Engineered 20+ accessible UI components using Tailwind CSS and Radix UI primitives, ensuring 100% WCAG 2.1 AA compliance across mobile and desktop viewports."
              keywords={["Tailwind CSS", "Radix UI", "100% WCAG 2.1 AA"]}
            />
          </p>
        </div>
      </section>

      <section className="hero-sheet-section">
        <b>FEATURED PROJECTS</b>
        <div className="hero-entry">
          <div className="hero-entry-header">
            <h4>Campus Trade Portal · <span>Production SPA (React / Node.js)</span></h4>
            <span className="hero-entry-dates">Sept 2023 – Dec 2023</span>
          </div>
          <p>
            <HighlightedText
              text="Developed responsive single-page web app used by 420+ university students for textbook exchanges, featuring real-time debounce search and client-side caching."
              keywords={["420+ university students", "debounce search", "client-side caching"]}
            />
          </p>
          <p>
            <HighlightedText
              text="Integrated RESTful payment gateway APIs with optimistic UI states and resilient error boundaries, decreasing checkout drop-offs by 14%."
              keywords={["RESTful payment gateway APIs", "optimistic UI states", "error boundaries"]}
            />
          </p>
        </div>
      </section>

      <section className="hero-sheet-section">
        <b>TECHNICAL SKILLS</b>
        <div className="hero-skills-grid">
          <div><b>Languages &amp; Core:</b> TypeScript · JavaScript (ES6+) · HTML5 · CSS3 · SQL</div>
          <div><b>Frameworks &amp; UI:</b> React 18 · Next.js · Tailwind CSS · Radix UI · Redux Toolkit</div>
          <div><b>Developer Tools:</b> Vite · Git · GitHub Actions · Jest · Web Vitals · REST APIs</div>
        </div>
      </section>

      <section className="hero-sheet-section">
        <b>EDUCATION</b>
        <div className="hero-edu-row">
          <div>
            <strong>B.Tech in Computer Science &amp; Engineering</strong> · Pune Institute of Computer Technology
          </div>
          <span>2022 – 2026 | CGPA: 8.8 / 10</span>
        </div>
      </section>

      <div className="evidence-note">
        <FigmaIcon name="shield" size={13} />
        <span>Every claim links to approved evidence · Zero AI hallucinations</span>
      </div>
    </div>
  );
}

export function DetailedResumeSheet({ roleIndex = 0 }: { roleIndex?: number }) {
  const role = roles[roleIndex] || roles[0];

  return (
    <div className="detailed-resume-sheet" aria-label="Detailed tailored resume">
      <div className="detailed-resume-top">
        <div>
          <strong>ARJUN MEHTA</strong>
          <span className="detailed-subtitle">Software Engineer · B.Tech Computer Science (2026)</span>
          <div className="detailed-contact-bar">
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
        <span className="detailed-match-pill" style={{ background: role.color }}>
          {role.match}% match
        </span>
      </div>

      <div className="detailed-rule" />

      <div className="detailed-target-banner">
        <span>{role.targetBanner}</span>
        <span className="score-tag">VERIFIED MATCH</span>
      </div>

      <div className="detailed-section">
        <span className="detailed-section-title">PROFESSIONAL SUMMARY</span>
        <p className="detailed-summary-text">{role.summary}</p>
      </div>

      <div className="detailed-section">
        <span className="detailed-section-title">WORK EXPERIENCE</span>
        {role.experience.map((exp) => (
          <div className="detailed-entry-item" key={exp.title + exp.company}>
            <div className="detailed-entry-header">
              <h4>
                {exp.title} · <span>{exp.company}</span>
              </h4>
              <span className="entry-meta">
                {exp.period} | {exp.location}
              </span>
            </div>
            <ul className="detailed-bullets">
              {exp.bullets.map((b, bi) => (
                <li key={bi}>
                  <HighlightedText text={b.text} keywords={b.keywords} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="detailed-section">
        <span className="detailed-section-title">PRODUCTION &amp; OPEN SOURCE PROJECTS</span>
        {role.projects.map((proj) => (
          <div className="detailed-entry-item" key={proj.title}>
            <div className="detailed-entry-header">
              <h4>
                {proj.title} · <span>{proj.type}</span>
              </h4>
            </div>
            <ul className="detailed-bullets">
              {proj.bullets.map((b, bi) => (
                <li key={bi}>
                  <HighlightedText text={b.text} keywords={b.keywords} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="detailed-section">
        <span className="detailed-section-title">TECHNICAL SKILLS</span>
        <div className="detailed-categorized-skills">
          {role.skillCategories.map((cat) => (
            <div className="detailed-skill-cat-row" key={cat.category}>
              <b>{cat.category}:</b> {cat.skills.join(" · ")}
            </div>
          ))}
        </div>
      </div>

      <div className="detailed-section">
        <span className="detailed-section-title">EDUCATION</span>
        <div className="detailed-education-item">
          <div>
            <b>B.Tech in Computer Science &amp; Engineering</b> · Pune Institute of Computer Technology
          </div>
          <span>2022 – 2026 | CGPA: 8.8 / 10</span>
        </div>
      </div>

      <div className="detailed-evidence-note">
        <span>
          <FigmaIcon name="shield" size={13} /> Grounded in Career Vault Facts
        </span>
        <span>0 Hallucinated Claims · ATS-Ready</span>
      </div>
    </div>
  );
}

export function HandDrawnArrow({
  type,
  color = "#111111",
}: {
  type: "left" | "right" | "up-left" | "down-left" | "up-right" | "down-right";
  color?: string;
}) {
  if (type === "right") {
    // Points from left callout horizontally right into resume
    return (
      <svg
        className="hand-arrow arrow-right"
        viewBox="0 0 76 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 6 14 C 26 12, 48 16, 68 20"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 54 13 C 59 16, 64 18, 68 20"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 55 28 C 60 25, 64 22, 68 20"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 12 18 C 24 16, 38 18, 50 21"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  if (type === "down-right") {
    // Points from left callout down and right into resume
    return (
      <svg
        className="hand-arrow arrow-down-right"
        viewBox="0 0 76 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 6 10 C 26 12, 48 20, 68 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 55 21 C 59 24, 64 27, 68 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 57 37 C 61 34, 64 32, 68 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 12 14 C 26 14, 38 20, 50 25"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  if (type === "up-right") {
    // Points from left callout up and right into resume
    return (
      <svg
        className="hand-arrow arrow-up-right"
        viewBox="0 0 76 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 6 30 C 26 28, 48 20, 68 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 57 4 C 61 6, 65 8, 68 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 55 19 C 59 16, 64 13, 68 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 12 26 C 26 26, 38 20, 50 15"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  if (type === "down-left") {
    // Points from right callout down and left into resume
    return (
      <svg
        className="hand-arrow arrow-down-left"
        viewBox="0 0 76 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 70 10 C 50 12, 28 20, 8 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 21 21 C 17 24, 12 27, 8 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 19 37 C 15 34, 12 32, 8 30"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 64 14 C 50 14, 38 20, 26 25"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  if (type === "up-left") {
    // Points from right callout up and left into resume
    return (
      <svg
        className="hand-arrow arrow-up-left"
        viewBox="0 0 76 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 70 30 C 50 28, 28 20, 8 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 19 4 C 15 6, 11 8, 8 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 21 19 C 17 16, 12 13, 8 10"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 64 26 C 50 26, 38 20, 26 15"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  // Default: "left" — points from right callout horizontally left into resume
  return (
    <svg
      className="hand-arrow arrow-left"
      viewBox="0 0 76 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 70 14 C 50 12, 28 16, 8 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 22 13 C 17 16, 12 18, 8 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 21 28 C 16 25, 12 22, 8 20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 64 18 C 52 16, 38 18, 26 21"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function ResumeAnnotationsLayer({ roleIndex = 0 }: { roleIndex?: number }) {
  const currentRole = roles[roleIndex] || roles[0];
  const annotations = currentRole.annotations || [];

  return (
    <div className="resume-annotations-layer" aria-hidden="true">
      {annotations.map((ann, idx) => (
        <div
          key={`${currentRole.company}-${ann.id}`}
          className={`resume-callout callout-${ann.side}`}
          style={{
            top: ann.top,
            animationDelay: `${0.06 * (idx + 1)}s`,
          }}
        >
          {ann.side === "left" ? (
            <>
              <div
                className="callout-card"
                style={{ transform: ann.rotation || "none" }}
              >
                <div className="callout-badge">
                  <span className="callout-badge-dot" />
                  {ann.badge}
                </div>
                <p className="callout-text">{ann.text}</p>
              </div>
              <div className="callout-arrow-wrapper">
                <HandDrawnArrow
                  type={ann.arrowType}
                  color={ann.arrowColor || "#111111"}
                />
              </div>
            </>
          ) : (
            <>
              <div className="callout-arrow-wrapper">
                <HandDrawnArrow
                  type={ann.arrowType}
                  color={ann.arrowColor || "#111111"}
                />
              </div>
              <div
                className="callout-card"
                style={{ transform: ann.rotation || "none" }}
              >
                <div className="callout-badge">
                  <span className="callout-badge-dot" />
                  {ann.badge}
                </div>
                <p className="callout-text">{ann.text}</p>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function FigmaLanding() {
  const [role, setRole] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const userManualRef = useRef(false);
  const manualTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Unified Scroll Stage Synchronizer (Spread -> Spotlight -> Role switcher)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let displayedProgress = 0;
    let targetProgress = 0;
    let frame = 0;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isMobileViewport = () => typeof window !== "undefined" && window.innerWidth <= 900;

    const applyMobileStatic = () => {
      stage.style.setProperty("--scroll-progress", "1");
      stage.style.setProperty("--spread", "0");
      stage.style.setProperty("--travel", "1");
      stage.style.setProperty("--travel-x", "0px");
      stage.style.setProperty("--travel-y", "0px");
      stage.style.setProperty("--gallery-opacity", "0");
      stage.style.setProperty("--side-opacity", "0");
      stage.style.setProperty("--spotlight-opacity", "1");
      stage.setAttribute("data-spotlight", "true");
    };

    const applyProgress = (p: number) => {
      // Phase 1 (Spread into Inverted U Arch): p from 0.00 to 0.08 -> Cards fan out
      const spread = Math.max(0, Math.min(1, p / 0.08));

      // Phase 2 (Section 2 Dwell): p from 0.08 to 0.18
      // Crisp dwell in Section 2 so travel initiates promptly.

      // Phase 3 (Continuous Downward & Center Travel): p from 0.18 to 0.28
      const travel = Math.max(0, Math.min(1, (p - 0.18) / 0.10));
      // Spotlight (left copy & right signals) glides in as middle card enters center
      const spotlight = Math.max(0, Math.min(1, (p - 0.22) / 0.06));

      // Opacities: clean numbers between 0 and 1
      const galleryOpacity = Math.max(0, Math.min(1, 1 - travel * 1.5));
      const sideOpacity = Math.max(0, Math.min(1, 1 - travel * 1.5));
      const spotlightOpacity = spotlight;

      // Transforms — Card 2 glides smoothly from 63vw to 50vw (-13vw) and down 20px into Section 3 center
      const travelX = (-travel * 13).toFixed(2) + "vw";
      const travelY = (travel * 20).toFixed(1) + "px";

      stage.style.setProperty("--scroll-progress", p.toFixed(4));
      stage.style.setProperty("--spread", spread.toFixed(4));
      stage.style.setProperty("--travel", travel.toFixed(4));
      stage.style.setProperty("--travel-x", travelX);
      stage.style.setProperty("--travel-y", travelY);
      stage.style.setProperty("--gallery-opacity", galleryOpacity.toFixed(4));
      stage.style.setProperty("--side-opacity", sideOpacity.toFixed(4));
      stage.style.setProperty("--spotlight-opacity", spotlightOpacity.toFixed(4));

      if (spotlight >= 0.5) {
        stage.setAttribute("data-spotlight", "true");
      } else {
        stage.removeAttribute("data-spotlight");
      }

      // Phase 4: Calibrated Section 3 dwell for all 3 versions:
      // - p < 0.26: Section 2 and continuous travel (Card 2 arrives in center)
      // - p from 0.26 to 0.46: Role 01 (Frontend Intern @ Razorpay)
      // - p from 0.46 to 0.66: Role 02 (SDE I @ CRED) — crisp, reduced scroll between versions
      // - p from 0.66 to 0.82: Role 03 (Product Engineer @ Postman)
      // - p >= 0.82: Unpins and smoothly continues scrolling into the sections below earlier
      if (p < 0.26) {
        userManualRef.current = false;
        setRole(0);
      } else if (!userManualRef.current) {
        if (p < 0.46) {
          setRole(0);
        } else if (p < 0.66) {
          setRole(1);
        } else {
          setRole(2);
        }
      }
    };

    const render = () => {
      const distance = targetProgress - displayedProgress;
      displayedProgress += distance * 0.085;
      applyProgress(displayedProgress);

      if (Math.abs(distance) > 0.0003) {
        frame = requestAnimationFrame(render);
      } else {
        displayedProgress = targetProgress;
        applyProgress(displayedProgress);
        frame = 0;
      }
    };

    const measure = () => {
      if (isMobileViewport()) {
        applyMobileStatic();
        return;
      }
      const rect = stage.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;
      targetProgress = Math.max(0, Math.min(1, -rect.top / totalScrollable));

      if (reducedMotion) {
        displayedProgress = targetProgress;
        applyProgress(displayedProgress);
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

  const handleRoleSelect = useCallback((idx: number) => {
    setRole(idx);
    userManualRef.current = true;
    if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
    if (typeof window !== "undefined" && window.innerWidth > 900) {
      manualTimeoutRef.current = setTimeout(() => {
        userManualRef.current = false;
      }, 4000);
    }
  }, []);

  return (
    <main className="landing">
      {/* Top Navigation */}
      <nav className="top-nav">
        <FigmaLogo />
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#proof" onClick={() => setMenuOpen(false)}>
            One story, adapted
          </a>
          <a href="#shift" onClick={() => setMenuOpen(false)}>
            Interactive demo
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <Link href="/privacy" onClick={() => setMenuOpen(false)}>
            Privacy
          </Link>
          <div className="mobile-drawer-auth">
            <SignInButton mode="modal">
              <button type="button" className="text-button" onClick={() => setMenuOpen(false)}>
                Log in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="nav-cta" onClick={() => setMenuOpen(false)}>
                Build my resume <FigmaIcon name="arrow" size={17} />
              </button>
            </SignUpButton>
          </div>
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
            Store your verified projects, skills, and experience once in your Career Vault. Paste any job post—we adapt your real facts into an ATS-ready resume in seconds. Zero fake claims, zero AI hallucinations.
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
          <ResumeSheet roleIndex={0} />
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

      {/* Section 02 & 03 — Story Gallery & Spotlight Stage */}
      <section className="stage-section" ref={stageRef} id="proof">
        <div id="shift" style={{ position: "absolute", top: "70%", pointerEvents: "none" }} />
        <div className="stage-sticky">
          {/* Left Panel: Gallery Copy cross-fades into Spotlight Copy & Role Switcher */}
          <div className="stage-left-panel">
            <div className="stage-gallery-copy">
              <h2>
                One career history.
                <br />
                <em><span className="no-break-word">Customized</span> for every role.</em>
              </h2>
              <p>
                You don&apos;t need to rewrite your resume from scratch for every application. See how
                the same verified skills and experience adapt to highlight exactly what each job
                description asks for.
              </p>
            </div>

            <div className="stage-spotlight-copy">
              <h2>
                Same candidate.
                <br />
                <em>Different spotlight.</em>
              </h2>
              <p className="spotlight-desc">
                <span className="desktop-hint">Scroll down or choose a role below to see how Arjun&apos;s verified experience and skills rearrange to match what each employer wants:</span>
                <span className="mobile-hint">Tap any role below to see how Arjun&apos;s verified experience adapts in real-time:</span>
              </p>
              <div className="spotlight-tabs" role="tablist">
                {roles.map((item, i) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handleRoleSelect(i)}
                    className={`spotlight-tab-btn ${role === i ? "active" : ""}`}
                    role="tab"
                    aria-selected={role === i}
                  >
                    <div className="tab-indicator" style={{ background: item.color }}>
                      0{i + 1}
                    </div>
                    <div className="tab-info">
                      <b>{item.label}</b>
                      <small>{item.company}</small>
                    </div>
                    <span className="tab-match" style={{ color: item.color }}>
                      {item.match}% fit
                    </span>
                  </button>
                ))}
              </div>
              <div className="spotlight-scroll-hint">
                <span>↓</span> Scroll to change roles automatically
              </div>
            </div>
          </div>

          {/* Cards Container: Holds Card 1 (left), Card 3 (right), and Card 2 (middle traveler & Section 3 spotlight resume) */}
          <div className="stage-cards-container">
            {/* Card 1: Left Card (curves DOWN & LEFT in inverted U arch) */}
            <div className="stage-card resume-card-1" aria-hidden="true">
              <DetailedResumeSheet roleIndex={1} />
            </div>

            {/* Card 3: Right Card (curves DOWN & RIGHT in inverted U arch) */}
            <div className="stage-card resume-card-3" aria-hidden="true">
              <DetailedResumeSheet roleIndex={2} />
            </div>

            {/* Middle Card: Card 2 (starts at arch apex, travels DOWN & LEFT into Section 3 center) */}
            <div className="stage-card resume-card-2 stage-traveler">
              <DetailedResumeSheet roleIndex={role} />
              <ResumeAnnotationsLayer roleIndex={role} />
            </div>
          </div>

          {/* Right Panel: Matched signals panel appears as Card 2 arrives in the spotlight */}
          <div className="stage-right-panel">
            <div className="spotlight-signals-panel">
              <div className="signals-header">
                <span>MATCHED SIGNALS</span>
                <b>{roles[role].match}% ATS Fit</b>
              </div>
              <div className="signals-list">
                {roles[role].signals.map((sig) => (
                  <div className="signal-item" key={sig.name}>
                    <div className="signal-title-row">
                      <b>{sig.name}</b>
                      <span>{sig.pct}%</span>
                    </div>
                    <div className="signal-bar-track">
                      <i
                        className="signal-bar-fill"
                        style={{
                          width: `${sig.pct}%`,
                          background: roles[role].color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="spotlight-truth-card">
                <div className="truth-icon-wrap">
                  <FigmaIcon name="shield" size={18} />
                </div>
                <div>
                  <strong>100% Truth-Bound</strong>
                  <p>
                    Every bullet and skill is derived from Arjun&apos;s Career Vault facts. Zero AI hallucinations, zero exaggerated claims.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


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
          <a href="#proof">Story</a>
          <a href="#shift">Demo</a>
          <a href="#how">How it works</a>
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
