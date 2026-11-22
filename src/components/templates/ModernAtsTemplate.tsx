"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { TemplateProps } from "./ClassicAtsTemplate";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";

export function ModernAtsTemplate({
  doc,
  fontSizePt = 10,
  lineHeight = 1.35,
  sectionGapRem = 0.9,
  marginInches = 0.65,
  onElementClick,
  readOnly = false,
}: TemplateProps) {
  const handleClick = (section: string, id?: string) => {
    if (!readOnly && onElementClick) {
      onElementClick(section, id);
    }
  };

  return (
    <div
      className="bg-white text-gray-900 font-sans shadow-md print:shadow-none mx-auto w-full max-w-[816px] min-h-[1056px] transition-all"
      style={{
        padding: `${marginInches}in`,
        fontSize: `${fontSizePt}pt`,
        lineHeight: lineHeight,
      }}
    >
      {/* Modern Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`border-b-2 border-[#10241c] pb-3 cursor-pointer ${
          !readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            {doc.profile.fullName || "Your Full Name"}
          </h1>
          {doc.profile.headline && (
            <span className="text-sm font-semibold text-[#10241c]">{doc.profile.headline}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-600 mt-1.5 font-medium">
          {doc.profile.email && <span>{doc.profile.email}</span>}
          {doc.profile.phone && <span>• {doc.profile.phone}</span>}
          {doc.profile.location && <span>• {doc.profile.location}</span>}
          {doc.profile.links &&
            doc.profile.links.map((link, idx) => (
              <span key={idx}>
                •{" "}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-[#10241c] font-semibold"
                >
                  {link.label || link.url}
                </a>
              </span>
            ))}
        </div>
      </header>

      {/* Summary */}
      {doc.profile.summary && (
        <section
          onClick={() => handleClick("profile")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Summary</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          <p className="mt-1 text-xs text-gray-700 leading-relaxed">{doc.profile.summary}</p>
        </section>
      )}

      {/* Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Experience</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          <div className="space-y-3 mt-2">
            {doc.experience.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleClick("experience", exp.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{exp.position}</span>
                    <span className="text-[#10241c] font-semibold"> • {exp.company}</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                    {exp.location && ` | ${exp.location}`}
                  </span>
                </div>

                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-700">
                  {exp.bullets.map((b) => (
                    <li key={b.id} className="leading-snug">
                      {b.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {doc.education && doc.education.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Education</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          <div className="space-y-2 mt-2">
            {doc.education.map((edu) => (
              <div
                key={edu.id}
                onClick={() => handleClick("education", edu.id)}
                className={`flex justify-between items-baseline text-xs cursor-pointer ${
                  !readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""
                }`}
              >
                <div>
                  <span className="font-bold text-gray-900">{edu.degree || "Degree"}</span>
                  {edu.field && <span className="font-bold text-gray-900"> in {edu.field}</span>}
                  <div className="font-bold text-[#10241c]">{edu.institution}</div>
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  {edu.startDate} – {edu.endDate || "Present"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {doc.projects && doc.projects.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Key Projects</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          <div className="space-y-2 mt-2">
            {doc.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleClick("projects", proj.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs font-bold text-gray-900">
                  <span>
                    <span className="font-bold text-gray-900">{proj.name}</span>
                    {proj.role && <span className="font-bold text-[#10241c]"> ({proj.role})</span>}
                  </span>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-normal text-[#10241c] hover:underline"
                    >
                      {proj.url}
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-gray-600 mt-0.5">{shortenProjectDescription(proj.description) || proj.description}</p>
                )}
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-700">
                  {proj.bullets.map((b) => (
                    <li key={b.id}>{b.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {doc.skills && doc.skills.length > 0 && (
        <section
          onClick={() => handleClick("skills")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Core Competencies & Skills</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          {(() => {
            const grouped = getGroupedSkills(doc.skills);
            const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
            if (hasCategories) {
              return (
                <div className="space-y-1.5 mt-2 text-xs text-[#10241c]">
                  {grouped.map((g, idx) => (
                    <div key={idx} className="flex flex-wrap items-baseline gap-1">
                      <span className="font-bold text-[#10241c]">{g.category}:</span>
                      <span className="text-gray-800">{g.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {doc.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-[#becbbf]/20 text-[#10241c] text-[11px] font-semibold px-2 py-0.5 rounded border border-[#10241c]/20"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* Certifications */}
      {doc.certifications && doc.certifications.length > 0 && (
        <section
          onClick={() => handleClick("certifications")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] flex items-center gap-2">
            <span>Certifications</span>
            <span className="flex-1 border-b border-[#becbbf]" />
          </h2>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-700">
            {doc.certifications.map((c) => (
              <li key={c.id}>
                <span className="font-semibold text-gray-900">{c.name}</span> – {c.issuer}{" "}
                {c.issueDate && <span className="text-gray-500">({c.issueDate})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
