"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";
import { formatResumeDate } from "@/lib/editor/onePageA4Budgeter";

export interface TemplateProps {
  doc: ResumeDoc;
  fontSizePt?: number;
  lineHeight?: number;
  sectionGapRem?: number;
  marginInches?: number;
  onElementClick?: (section: string, itemId?: string) => void;
  readOnly?: boolean;
}

function isPipeTechLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return trimmed.includes("|") && trimmed.length <= 120 && !/[.!?]\s+[A-Z]/.test(trimmed);
}

export function ClassicAtsTemplate({
  doc,
  fontSizePt = 10,
  lineHeight = 1.28,
  sectionGapRem = 0.65,
  marginInches = 0.48,
  onElementClick,
  readOnly = false,
}: TemplateProps) {
  const isA4 = (doc.page?.size || "A4") === "A4";
  const pageWidthPx = isA4 ? 794 : 816;
  const pageHeightPx = isA4 ? 1123 : 1056;

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

  return (
    <div
      className="bg-white text-gray-900 font-serif shadow-md print:shadow-none mx-auto w-full transition-all box-border"
      style={{
        maxWidth: `${pageWidthPx}px`,
        minHeight: `${pageHeightPx}px`,
        padding: `${marginInches}in`,
        fontSize: `${fontSizePt}pt`,
        lineHeight,
      }}
    >
      {/* Centered Classic Header (Single-column ATS reference style) */}
      <header
        onClick={() => handleClick("profile")}
        className={`text-center pb-1.5 cursor-pointer ${
          !readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""
        }`}
      >
        <h1 className="text-[20pt] font-bold tracking-tight text-gray-900 leading-tight">
          {doc.profile.fullName || doc.profile.name || "Your Full Name"}
        </h1>
        {headline && (
          <p className="text-[9.5pt] font-medium text-gray-700 mt-0.5">{headline}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[8.8pt] text-gray-800 mt-1">
          {[
            doc.profile.phone ? <span key="phone">{doc.profile.phone}</span> : null,
            doc.profile.email ? <span key="email">{doc.profile.email}</span> : null,
            doc.profile.location ? <span key="loc">{doc.profile.location}</span> : null,
            ...(doc.profile.links || []).map((link, idx) => (
              <a
                key={`lnk-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-gray-400 underline-offset-2 text-gray-900 hover:text-blue-900"
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

      {/* Summary (only when distinct from headline) */}
      {showSummary && (
        <section
          onClick={() => handleClick("profile")}
          style={{ marginTop: `${sectionGapRem * 0.75}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
        >
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Summary
          </h2>
          <p className="mt-1 text-[9.2pt] text-gray-800 leading-snug">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Experience
          </h2>
          <div className="space-y-2 mt-1">
            {doc.experience.map((exp) => {
              const start = formatResumeDate(exp.startDate);
              const end = exp.isCurrent ? "Present" : formatResumeDate(exp.endDate) || "Present";
              return (
                <div
                  key={exp.id}
                  onClick={() => handleClick("experience", exp.id)}
                  className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
                >
                  <div className="flex justify-between items-baseline text-[9.5pt] text-gray-900">
                    <span className="font-bold">{exp.position}</span>
                    <span className="text-[9pt] font-normal text-gray-800 shrink-0 ml-2">
                      {start ? `${start} – ${end}` : end}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[9pt] italic text-gray-700">
                    <span>{exp.company}</span>
                    {exp.location && <span className="shrink-0 ml-2">{exp.location}</span>}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[9pt] text-gray-800">
                      {exp.bullets.map((b) => (
                        <li key={b.id} className="leading-snug">
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Projects */}
      {doc.projects && doc.projects.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Projects
          </h2>
          <div className="space-y-1.5 mt-1">
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
                  className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
                >
                  <div className="flex justify-between items-baseline text-[9.4pt] text-gray-900">
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
                        className="text-[8.5pt] font-normal text-blue-900 hover:underline shrink-0 ml-2"
                      >
                        {proj.url}
                      </a>
                    )}
                  </div>
                  {displayBullets.length > 0 && (
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[9pt] text-gray-800">
                      {displayBullets.map((b) => (
                        <li key={b.id} className="leading-snug">
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Education */}
      {doc.education && doc.education.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Education
          </h2>
          <div className="space-y-1 mt-1">
            {doc.education.map((edu) => {
              const start = formatResumeDate(edu.startDate);
              const end = formatResumeDate(edu.endDate) || "Present";
              const dateRange = start ? `${start} – ${end}` : end;
              return (
                <div
                  key={edu.id}
                  onClick={() => handleClick("education", edu.id)}
                  className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
                >
                  <div className="flex justify-between items-baseline text-[9.4pt] text-gray-900">
                    <span className="font-bold">{edu.institution}</span>
                    <span className="text-[9pt] font-normal text-gray-800 shrink-0 ml-2">
                      {dateRange}
                    </span>
                  </div>
                  <div className="text-[9pt] italic text-gray-800">
                    {edu.degree || "Degree"}
                    {edu.field ? ` — ${edu.field}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Achievements & Certifications (includes Hackathon wins from Vault awards + Certifications) */}
      {hasAchievementsOrCerts && (
        <section
          onClick={() => handleClick("certifications")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
        >
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Achievements &amp; Certifications
          </h2>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[9pt] text-gray-800">
            {awards.map((a) => {
              const showIssuer =
                a.issuer && a.issuer.trim().toLowerCase() !== a.name.trim().toLowerCase();
              return (
                <li key={a.id} className="leading-snug">
                  <span className="font-bold text-gray-900">{a.name}</span>
                  {showIssuer ? `: ${a.issuer}` : ""}
                  {a.issueDate ? ` (${formatResumeDate(a.issueDate)})` : ""}
                </li>
              );
            })}
            {certifications.map((c) => (
              <li key={c.id} className="leading-snug">
                <span className="font-bold text-gray-900">{c.name}</span>
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.issueDate ? ` (${formatResumeDate(c.issueDate)})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Technical Skills */}
      {doc.skills && doc.skills.length > 0 && (
        <section
          onClick={() => handleClick("skills")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
        >
          <h2 className="text-[9.5pt] font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900">
            Technical Skills
          </h2>
          {(() => {
            const grouped = getGroupedSkills(doc.skills);
            const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
            if (hasCategories) {
              return (
                <div className="space-y-0.5 mt-1 text-[9pt] text-gray-800 leading-snug">
                  {grouped.map((g, idx) => (
                    <div key={idx}>
                      <span className="font-bold text-gray-900">{g.category}: </span>
                      <span>{g.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <p className="mt-1 text-[9pt] text-gray-800 leading-snug">
                {doc.skills.map((s) => s.name).join(", ")}
              </p>
            );
          })()}
        </section>
      )}
    </div>
  );
}
