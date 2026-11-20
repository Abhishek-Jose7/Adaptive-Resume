"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { TemplateProps } from "./ClassicAtsTemplate";

export function TechnicalScholarTemplate({
  doc,
  fontSizePt = 9.8,
  lineHeight = 1.35,
  sectionGapRem = 0.85,
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
      className="bg-white text-gray-900 font-mono shadow-md print:shadow-none mx-auto w-full max-w-[816px] min-h-[1056px] transition-all"
      style={{
        padding: `${marginInches}in`,
        fontSize: `${fontSizePt}pt`,
        lineHeight: lineHeight,
      }}
    >
      {/* Technical Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`border-b-2 border-[#10241c] pb-3 cursor-pointer ${
          !readOnly ? "hover:bg-[#becbbf]/20 rounded p-1" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-baseline">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 font-sans">
            {doc.profile.fullName || "Candidate Name"}
          </h1>
          {doc.profile.headline && (
            <span className="text-xs font-semibold text-[#10241c] font-sans">
              {"// "}{doc.profile.headline}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-600 mt-1">
          {doc.profile.email && <span>{doc.profile.email}</span>}
          {doc.profile.phone && <span>:: {doc.profile.phone}</span>}
          {doc.profile.location && <span>:: {doc.profile.location}</span>}
          {doc.profile.links &&
            doc.profile.links.map((link, idx) => (
              <span key={idx}>
                ::{" "}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-[#10241c]"
                >
                  {link.label || link.url}
                </a>
              </span>
            ))}
        </div>
      </header>

      {/* Technical Skills Taxonomy */}
      {doc.skills && doc.skills.length > 0 && (
        <section
          onClick={() => handleClick("skills")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/20 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] font-sans border-b border-gray-200 pb-0.5">
            01. Technical Skills & Architecture
          </h2>
          <div className="mt-1 text-xs text-gray-800">
            <span className="font-semibold text-gray-600">Stack: </span>
            {doc.skills.map((s) => s.name).join(", ")}
          </div>
        </section>
      )}

      {/* Engineering Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] font-sans border-b border-gray-200 pb-0.5">
            02. Engineering & Research Experience
          </h2>
          <div className="space-y-3 mt-2">
            {doc.experience.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleClick("experience", exp.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/20 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-bold text-gray-900 font-sans">{exp.position}</span>
                    <span className="text-gray-600"> @ {exp.company}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    [{exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || "Present"}]
                  </span>
                </div>

                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-800 font-sans">
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

      {/* Projects & Systems */}
      {doc.projects && doc.projects.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] font-sans border-b border-gray-200 pb-0.5">
            03. Systems & Open-Source Projects
          </h2>
          <div className="space-y-2 mt-2">
            {doc.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleClick("projects", proj.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/20 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs font-bold text-gray-900 font-sans">
                  <span>{proj.name}</span>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-normal text-[#10241c] hover:underline font-mono"
                    >
                      {proj.url}
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-gray-700 mt-0.5 font-sans">{proj.description}</p>
                )}
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-gray-800 font-sans">
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10241c] font-sans border-b border-gray-200 pb-0.5">
            04. Education & Research Foundations
          </h2>
          <div className="space-y-1.5 mt-1.5 font-sans">
            {doc.education.map((edu) => (
              <div
                key={edu.id}
                onClick={() => handleClick("education", edu.id)}
                className={`flex justify-between items-baseline text-xs cursor-pointer ${
                  !readOnly ? "hover:bg-[#becbbf]/20 rounded p-1" : ""
                }`}
              >
                <div>
                  <span className="font-bold text-gray-900">{edu.degree}</span>
                  {edu.field && <span> in {edu.field}</span>} —{" "}
                  <span className="text-gray-600">{edu.institution}</span>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {edu.startDate} - {edu.endDate || "Present"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
