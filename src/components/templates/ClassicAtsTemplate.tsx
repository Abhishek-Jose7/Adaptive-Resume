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

  const DEFAULT_SECTION_ORDER = ["skills", "experience", "projects", "education", "certifications"];
  const rawThemeOrder = (doc.template?.theme?.sectionOrder || []).filter((s) => s !== "profile");
  const normalizedOrder = Array.from(
    new Set([
      ...rawThemeOrder.map((s) => (s === "awards" ? "certifications" : s)),
      ...DEFAULT_SECTION_ORDER,
    ])
  );

  const renderSectionBlock = (secKey: string): React.ReactNode => {
    switch (secKey) {
      case "skills":
        if (!doc.skills || doc.skills.length === 0) return null;
        return (
          <section
            key="skills"
            onClick={() => handleClick("skills")}
            style={{ marginTop: `${sectionGapRem * 0.85}rem` }}
            className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
          >
            <h2 className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900" style={{ fontSize: "1em" }}>
              Technical Skills
            </h2>
            {(() => {
              const grouped = getGroupedSkills(doc.skills);
              const hasCategories =
                grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
              if (hasCategories) {
                return (
                  <div className="space-y-0.5 mt-1 text-gray-800" style={{ fontSize: "0.94em" }}>
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
                <p className="mt-1 text-gray-800" style={{ fontSize: "0.94em" }}>
                  {doc.skills.map((s) => s.name).join(", ")}
                </p>
              );
            })()}
          </section>
        );

      case "experience":
        if (!doc.experience || doc.experience.length === 0) return null;
        return (
          <section key="experience" style={{ marginTop: `${sectionGapRem}rem` }}>
            <h2 className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900" style={{ fontSize: "1em" }}>
              Experience
            </h2>
            <div className="space-y-1.5 mt-1">
              {doc.experience.map((exp) => {
                const start = formatResumeDate(exp.startDate);
                const end = exp.isCurrent ? "Present" : formatResumeDate(exp.endDate) || "Present";
                return (
                  <div
                    key={exp.id}
                    onClick={() => handleClick("experience", exp.id)}
                    className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
                  >
                    <div className="flex justify-between items-baseline text-gray-900" style={{ fontSize: "1em" }}>
                      <span className="font-bold">{exp.position}</span>
                      <span className="font-normal text-gray-800 shrink-0 ml-2" style={{ fontSize: "0.94em" }}>
                        {start ? `${start} – ${end}` : end}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline italic text-gray-700" style={{ fontSize: "0.95em" }}>
                      <span>{exp.company}</span>
                      {exp.location && <span className="shrink-0 ml-2">{exp.location}</span>}
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-gray-800" style={{ fontSize: "0.94em" }}>
                        {exp.bullets.map((b) => (
                          <li key={b.id}>
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
        );

      case "projects":
        if (!doc.projects || doc.projects.length === 0) return null;
        return (
          <section key="projects" style={{ marginTop: `${sectionGapRem}rem` }}>
            <h2 className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900" style={{ fontSize: "1em" }}>
              Projects
            </h2>
            <div className="space-y-1 mt-1">
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
                    <div className="flex justify-between items-baseline text-gray-900" style={{ fontSize: "0.98em" }}>
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
                          className="font-normal text-blue-900 hover:underline shrink-0 ml-2"
                          style={{ fontSize: "0.88em" }}
                        >
                          {proj.url}
                        </a>
                      )}
                    </div>
                    {displayBullets.length > 0 && (
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-gray-800" style={{ fontSize: "0.94em" }}>
                        {displayBullets.map((b) => (
                          <li key={b.id}>
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
        );

      case "education":
        if (!doc.education || doc.education.length === 0) return null;
        return (
          <section key="education" style={{ marginTop: `${sectionGapRem}rem` }}>
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
        );

      case "certifications":
        if (!hasAchievementsOrCerts) return null;
        return (
          <section
            key="certifications"
            onClick={() => handleClick("certifications")}
            style={{ marginTop: `${sectionGapRem}rem` }}
            className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded px-1" : ""}`}
          >
            <h2 className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900" style={{ fontSize: "1em" }}>
              Achievements &amp; Certifications
            </h2>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-gray-800" style={{ fontSize: "0.94em" }}>
              {awards.map((a) => {
                const showIssuer =
                  a.issuer && a.issuer.trim().toLowerCase() !== a.name.trim().toLowerCase();
                return (
                  <li key={a.id}>
                    <span className="font-bold text-gray-900">{a.name}</span>
                    {showIssuer ? `: ${a.issuer}` : ""}
                    {a.issueDate ? ` (${formatResumeDate(a.issueDate)})` : ""}
                  </li>
                );
              })}
              {certifications.map((c) => (
                <li key={c.id}>
                  <span className="font-bold text-gray-900">{c.name}</span>
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
          <h2 className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 text-gray-900" style={{ fontSize: "1em" }}>
            Summary
          </h2>
          <p className="mt-1 text-gray-800" style={{ fontSize: "0.95em" }}>{summary}</p>
        </section>
      )}

      {normalizedOrder.map((secKey) => renderSectionBlock(secKey))}
    </div>
  );
}
