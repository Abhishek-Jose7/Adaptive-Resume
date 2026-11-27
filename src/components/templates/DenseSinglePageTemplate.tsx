"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";
import { formatResumeDate } from "@/lib/editor/onePageA4Budgeter";
import { TemplateProps } from "./ClassicAtsTemplate";

function isPipeTechLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return trimmed.includes("|") && trimmed.length <= 140 && !/[.!?]\s+[A-Z]/.test(trimmed);
}

/**
 * Dense single-page ATS template modeled after classic LaTeX CS/SWE resumes:
 * - Compact margins (0.34in) & tight typography (8.6pt, 1.15 line-height)
 * - Single-line role/company & education headers to pack maximum technical depth cleanly onto 1 A4 page
 * - Honors doc.template.theme.sectionOrder (defaulting Skills right below Summary)
 */
export function DenseSinglePageTemplate({
  doc,
  fontSizePt = 8.6,
  lineHeight = 1.15,
  sectionGapRem = 0.38,
  marginInches = 0.34,
  onElementClick,
  readOnly = false,
}: TemplateProps) {
  const isA4 = (doc.page?.size || "A4") === "A4";
  const pageWidthPx = isA4 ? 794 : 816;
  const pageHeightPx = isA4 ? 1123 : 1056;

  // Enforce dense ceiling even if AutoFit passed larger default step values
  const effectiveFontPt = Math.min(fontSizePt, 9.0);
  const effectiveLineHeight = Math.min(lineHeight, 1.18);
  const effectiveGapRem = Math.min(sectionGapRem, 0.45);
  const effectiveMarginIn = Math.min(marginInches, 0.38);

  const handleClick = (section: string, id?: string) => {
    if (!readOnly && onElementClick) {
      onElementClick(section, id);
    }
  };

  const headline = (doc.profile.headline || "").trim();
  const summary = (doc.profile.summary || "").trim();
  const showSummary = Boolean(summary) && summary.toLowerCase() !== headline.toLowerCase();

  const awards = doc.awards || [];
  const certifications = doc.certifications || [];
  const hasAchievementsOrCerts = awards.length > 0 || certifications.length > 0;

  const DEFAULT_SECTION_ORDER = ["skills", "experience", "projects", "education", "certifications"];
  const rawThemeOrder = (doc.template?.theme?.sectionOrder || []).filter((s) => s !== "profile");
  const normalizedOrder = Array.from(
    new Set([
      ...rawThemeOrder.map((s) => (s === "awards" ? "certifications" : s)),
      ...DEFAULT_SECTION_ORDER,
    ])
  );

  const sectionHeadingClass =
    "font-bold uppercase tracking-wider border-b border-gray-900 pb-[1px] text-gray-950";

  const renderSection = (secKey: string): React.ReactNode => {
    switch (secKey) {
      case "skills":
        if (!doc.skills || doc.skills.length === 0) return null;
        return (
          <section
            key="skills"
            onClick={() => handleClick("skills")}
            style={{ marginTop: `${effectiveGapRem}rem` }}
            className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""}`}
          >
            <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
              Technical Skills
            </h2>
            {(() => {
              const grouped = getGroupedSkills(doc.skills);
              const hasCategories =
                grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
              if (hasCategories) {
                return (
                  <div className="mt-0.5 space-y-[1px] text-gray-900" style={{ fontSize: "0.97em" }}>
                    {grouped.map((g, idx) => (
                      <div key={idx}>
                        <span className="font-bold text-gray-950">{g.category}: </span>
                        <span>{g.items.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <p className="mt-0.5 text-gray-900" style={{ fontSize: "0.97em" }}>
                  {doc.skills.map((s) => s.name).join(", ")}
                </p>
              );
            })()}
          </section>
        );

      case "experience":
        if (!doc.experience || doc.experience.length === 0) return null;
        return (
          <section key="experience" style={{ marginTop: `${effectiveGapRem}rem` }}>
            <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
              Experience
            </h2>
            <div className="mt-0.5 space-y-1">
              {doc.experience.map((exp) => {
                const start = formatResumeDate(exp.startDate);
                const end = exp.isCurrent ? "Present" : formatResumeDate(exp.endDate) || "Present";
                return (
                  <div
                    key={exp.id}
                    onClick={() => handleClick("experience", exp.id)}
                    className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""}`}
                  >
                    <div className="flex justify-between items-baseline text-gray-950">
                      <span>
                        <span className="font-bold">{exp.position}</span>
                        {exp.company && (
                          <span className="italic text-gray-800"> — {exp.company}</span>
                        )}
                        {exp.location && (
                          <span className="text-gray-600" style={{ fontSize: "0.92em" }}>
                            {" "}
                            ({exp.location})
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 ml-2 text-gray-800" style={{ fontSize: "0.95em" }}>
                        {start ? `${start} – ${end}` : end}
                      </span>
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul
                        className="list-disc pl-3.5 mt-[1px] space-y-[1px] text-gray-900"
                        style={{ fontSize: "0.97em" }}
                      >
                        {exp.bullets.map((b) => (
                          <li key={b.id}>{b.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "projects":
        if (!doc.projects || doc.projects.length === 0) return null;
        return (
          <section key="projects" style={{ marginTop: `${effectiveGapRem}rem` }}>
            <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
              Projects
            </h2>
            <div className="mt-0.5 space-y-1">
              {doc.projects.map((proj) => {
                const firstBullet = proj.bullets?.[0]?.text || "";
                const hasStackBullet = isPipeTechLine(firstBullet);
                const stackLine = hasStackBullet
                  ? firstBullet.replace(/\.$/, "")
                  : shortenProjectDescription(proj.description) || proj.role || "";
                const displayBullets = hasStackBullet ? proj.bullets.slice(1) : proj.bullets || [];

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleClick("projects", proj.id)}
                    className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""}`}
                  >
                    <div className="flex justify-between items-baseline text-gray-950">
                      <span>
                        <span className="font-bold">{proj.name}</span>
                        {stackLine && (
                          <span className="italic font-normal text-gray-700"> | {stackLine}</span>
                        )}
                      </span>
                      {proj.url && (
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-900 hover:underline shrink-0 ml-2"
                          style={{ fontSize: "0.9em" }}
                        >
                          {proj.url}
                        </a>
                      )}
                    </div>
                    {displayBullets.length > 0 && (
                      <ul
                        className="list-disc pl-3.5 mt-[1px] space-y-[1px] text-gray-900"
                        style={{ fontSize: "0.97em" }}
                      >
                        {displayBullets.map((b) => (
                          <li key={b.id}>{b.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "education":
        if (!doc.education || doc.education.length === 0) return null;
        return (
          <section key="education" style={{ marginTop: `${effectiveGapRem}rem` }}>
            <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
              Education
            </h2>
            <div className="mt-0.5 space-y-0.5">
              {doc.education.map((edu) => {
                const start = formatResumeDate(edu.startDate);
                const end = formatResumeDate(edu.endDate) || "Present";
                const dateRange = start ? `${start} – ${end}` : end;
                return (
                  <div
                    key={edu.id}
                    onClick={() => handleClick("education", edu.id)}
                    className={`flex justify-between items-baseline cursor-pointer ${
                      !readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""
                    }`}
                  >
                    <span>
                      <span className="font-bold text-gray-950">{edu.institution}</span>
                      <span className="italic text-gray-800">
                        {" "}
                        — {edu.degree || "Degree"}
                        {edu.field ? ` (${edu.field})` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 ml-2 text-gray-800" style={{ fontSize: "0.95em" }}>
                      {dateRange}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "certifications":
        if (!hasAchievementsOrCerts) return null;
        return (
          <section
            key="certifications"
            onClick={() => handleClick("certifications")}
            style={{ marginTop: `${effectiveGapRem}rem` }}
            className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""}`}
          >
            <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
              Achievements &amp; Certifications
            </h2>
            <ul
              className="list-disc pl-3.5 mt-0.5 space-y-[1px] text-gray-900"
              style={{ fontSize: "0.96em" }}
            >
              {awards.map((a) => {
                const showIssuer =
                  a.issuer && a.issuer.trim().toLowerCase() !== a.name.trim().toLowerCase();
                return (
                  <li key={a.id}>
                    <span className="font-bold text-gray-950">{a.name}</span>
                    {showIssuer ? `: ${a.issuer}` : ""}
                    {a.issueDate ? ` (${formatResumeDate(a.issueDate)})` : ""}
                  </li>
                );
              })}
              {certifications.map((c) => (
                <li key={c.id}>
                  <span className="font-bold text-gray-950">{c.name}</span>
                  {c.issuer ? ` — ${c.issuer}` : ""}
                  {c.issueDate ? ` (${formatResumeDate(c.issueDate)})` : ""}
                </li>
              ))}
            </ul>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="bg-white text-gray-950 font-serif shadow-md print:shadow-none mx-auto w-full transition-all box-border"
      style={{
        maxWidth: `${pageWidthPx}px`,
        minHeight: `${pageHeightPx}px`,
        padding: `${effectiveMarginIn}in`,
        fontSize: `${effectiveFontPt}pt`,
        lineHeight: effectiveLineHeight,
      }}
    >
      <header
        onClick={() => handleClick("profile")}
        className={`text-center pb-1 cursor-pointer ${
          !readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""
        }`}
      >
        <h1 className="font-bold tracking-tight text-gray-950 leading-none" style={{ fontSize: "1.95em" }}>
          {doc.profile.fullName || doc.profile.name || "Your Full Name"}
        </h1>
        <div
          className="flex flex-wrap items-center justify-center gap-x-1.5 text-gray-800 mt-1"
          style={{ fontSize: "0.95em" }}
        >
          {[
            headline ? <span key="headline" className="font-medium">{headline}</span> : null,
            doc.profile.phone ? <span key="phone">{doc.profile.phone}</span> : null,
            doc.profile.email ? <span key="email">{doc.profile.email}</span> : null,
            doc.profile.location ? <span key="loc">{doc.profile.location}</span> : null,
            ...(doc.profile.links || []).map((link, idx) => (
              <a
                key={`lnk-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-gray-400 underline-offset-2 text-gray-950 hover:text-blue-900"
              >
                {link.label || link.url}
              </a>
            )),
          ]
            .filter(Boolean)
            .map((node, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-gray-400">|</span>}
                {node}
              </React.Fragment>
            ))}
        </div>
      </header>

      {showSummary && (
        <section
          onClick={() => handleClick("profile")}
          style={{ marginTop: `${effectiveGapRem * 0.75}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-0.5" : ""}`}
        >
          <h2 className={sectionHeadingClass} style={{ fontSize: "1.02em" }}>
            Summary
          </h2>
          <p className="mt-0.5 text-gray-900" style={{ fontSize: "0.97em" }}>
            {summary}
          </p>
        </section>
      )}

      {normalizedOrder.map((secKey) => renderSection(secKey))}
    </div>
  );
}
