"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { TemplateProps } from "./ClassicAtsTemplate";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";

export function CompactEngineerTemplate({
  doc,
  fontSizePt = 9,
  lineHeight = 1.3,
  sectionGapRem = 0.65,
  marginInches = 0.5,
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
      {/* Compact Engineering Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`border-b border-[#10241c] pb-2 cursor-pointer ${
          !readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-black text-[#10241c] tracking-tight">
              {doc.profile.fullName || "Your Full Name"}
            </h1>
            {doc.profile.headline && (
              <span className="text-xs font-semibold text-gray-700">| {doc.profile.headline}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-gray-600 font-mono">
            {doc.profile.email && <span>{doc.profile.email}</span>}
            {doc.profile.phone && <span>• {doc.profile.phone}</span>}
            {doc.profile.location && <span>• {doc.profile.location}</span>}
          </div>
        </div>

        {doc.profile.links && doc.profile.links.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-[#10241c] font-semibold mt-1">
            {doc.profile.links.map((link, idx) => (
              <span key={idx}>
                {idx > 0 && <span className="text-gray-400 mr-2">•</span>}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline font-mono"
                >
                  {link.label || link.url}
                </a>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Summary / Objective (Compact) */}
      {doc.profile.summary && (
        <section
          onClick={() => handleClick("profile")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
        >
          <p className="text-[10.5px] text-gray-800 leading-snug">{doc.profile.summary}</p>
        </section>
      )}

      {/* Skills (High Density Badges at top for Technical Screening) */}
      {doc.skills && doc.skills.length > 0 && (
        <section
          onClick={() => handleClick("skills")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
        >
          <div className="flex items-center gap-2 border-b border-[#10241c] pb-0.5 mb-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#10241c]">
              Technical Skills & Environment
            </h2>
          </div>
          {(() => {
            const grouped = getGroupedSkills(doc.skills);
            const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
            if (hasCategories) {
              return (
                <div className="space-y-1 mt-1 text-[10.5px] text-gray-900">
                  {grouped.map((g, idx) => (
                    <div key={idx}>
                      <span className="font-black text-[#10241c]">{g.category}: </span>
                      <span className="font-mono text-gray-800">{g.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div className="flex flex-wrap gap-1">
                {doc.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-[#becbbf]/20 text-[#10241c] font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border border-[#10241c]/25"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <div className="flex items-center gap-2 border-b border-[#10241c] pb-0.5 mb-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#10241c]">
              Work Experience
            </h2>
          </div>
          <div className="space-y-2 mt-1">
            {doc.experience.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleClick("experience", exp.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-0.5" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-black text-gray-950">{exp.position}</span>
                    <span className="text-[#10241c] font-bold"> — {exp.company}</span>
                    {exp.location && <span className="text-gray-500 text-[10.5px]"> ({exp.location})</span>}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-600 whitespace-nowrap">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>

                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10.5px] text-gray-800 leading-tight">
                  {exp.bullets.map((b) => (
                    <li key={b.id}>{b.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Technical Projects */}
      {doc.projects && doc.projects.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <div className="flex items-center gap-2 border-b border-[#10241c] pb-0.5 mb-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#10241c]">
              Engineering Projects
            </h2>
          </div>
          <div className="space-y-1.5 mt-1">
            {doc.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleClick("projects", proj.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-0.5" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-black text-gray-950">{proj.name}</span>
                    {proj.role && <span className="font-black text-[#10241c] text-[10.5px]"> [{proj.role}]</span>}
                  </div>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-[#10241c] hover:underline"
                    >
                      {proj.url}
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-[10px] text-gray-600 leading-tight">{shortenProjectDescription(proj.description) || proj.description}</p>
                )}
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10.5px] text-gray-800 leading-tight">
                  {proj.bullets.map((b) => (
                    <li key={b.id}>{b.text}</li>
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
          <div className="flex items-center gap-2 border-b border-[#10241c] pb-0.5 mb-1.5">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#10241c]">
              Education
            </h2>
          </div>
          <div className="space-y-1 mt-1">
            {doc.education.map((edu) => (
              <div
                key={edu.id}
                onClick={() => handleClick("education", edu.id)}
                className={`flex justify-between items-baseline text-xs cursor-pointer ${
                  !readOnly ? "hover:bg-[#becbbf]/15 rounded p-0.5" : ""
                }`}
              >
                <div>
                  <span className="font-bold text-gray-900">{edu.degree || "Degree"}</span>
                  {edu.field && <span className="font-bold text-gray-900"> in {edu.field}</span>}
                  <span className="text-[#10241c] font-black"> — {edu.institution}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-600 font-medium">
                  {edu.startDate} – {edu.endDate || "Present"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {doc.certifications && doc.certifications.length > 0 && (
        <section
          onClick={() => handleClick("certifications")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-0.5" : ""}`}
        >
          <div className="flex items-center gap-2 border-b border-[#10241c] pb-0.5 mb-1">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-[#10241c]">
              Certifications & Credentials
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-3 text-[10px] text-gray-800 mt-0.5">
            {doc.certifications.map((c) => (
              <span key={c.id}>
                • <strong className="text-gray-900">{c.name}</strong> ({c.issuer})
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
