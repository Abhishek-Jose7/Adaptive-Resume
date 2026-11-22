"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { TemplateProps } from "./ClassicAtsTemplate";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";

export function MinimalExecutiveTemplate({
  doc,
  fontSizePt = 10,
  lineHeight = 1.3,
  sectionGapRem = 0.8,
  marginInches = 0.6,
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
      {/* Executive Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`border-b pb-2.5 cursor-pointer ${
          !readOnly ? "hover:bg-slate-50 rounded p-1" : ""
        }`}
      >
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {doc.profile.fullName || "Executive Name"}
            </h1>
            {doc.profile.headline && (
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                {doc.profile.headline}
              </p>
            )}
          </div>
          <div className="text-right text-[11px] text-slate-500 font-medium space-y-0.5">
            {doc.profile.email && <div>{doc.profile.email}</div>}
            {doc.profile.phone && <div>{doc.profile.phone}</div>}
            {doc.profile.location && <div>{doc.profile.location}</div>}
          </div>
        </div>
      </header>

      {/* Executive Summary */}
      {doc.profile.summary && (
        <section
          onClick={() => handleClick("profile")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-slate-50 rounded p-1" : ""}`}
        >
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5">
            Executive Profile & Scope
          </h2>
          <p className="mt-1 text-xs text-slate-800 leading-relaxed font-normal">
            {doc.profile.summary}
          </p>
        </section>
      )}

      {/* Leadership & Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5">
            Career History & Leadership Track Record
          </h2>
          <div className="space-y-2.5 mt-1.5">
            {doc.experience.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleClick("experience", exp.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-slate-50 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{exp.position}</span>
                    <span className="text-slate-600 font-semibold"> — {exp.company}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>

                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-slate-800">
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

      {/* Key Projects / Directorships */}
      {doc.projects && doc.projects.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5">
            Strategic Initiatives
          </h2>
          <div className="space-y-2 mt-1.5">
            {doc.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleClick("projects", proj.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-slate-50 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs font-bold text-slate-900">
                  <span>
                    <span className="font-bold text-slate-900">{proj.name}</span>
                    {proj.role && <span className="font-bold text-slate-800"> ({proj.role})</span>}
                  </span>
                  {proj.url && <span className="text-[10px] font-normal text-slate-500">{proj.url}</span>}
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-600 mt-0.5">{shortenProjectDescription(proj.description) || proj.description}</p>
                )}
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-slate-800">
                  {proj.bullets.map((b) => (
                    <li key={b.id}>{b.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education & Credentials */}
      {doc.education && doc.education.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5">
            Education & Board Credentials
          </h2>
          <div className="space-y-1.5 mt-1.5">
            {doc.education.map((edu) => (
              <div
                key={edu.id}
                onClick={() => handleClick("education", edu.id)}
                className={`flex justify-between items-baseline text-xs cursor-pointer ${
                  !readOnly ? "hover:bg-slate-50 rounded p-1" : ""
                }`}
              >
                <div>
                  <span className="font-bold text-slate-900">{edu.degree}</span>
                  {edu.field && <span className="font-bold text-slate-900"> in {edu.field}</span>} •{" "}
                  <span className="text-slate-900 font-bold">{edu.institution}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {edu.startDate} – {edu.endDate || "Present"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Core Competencies */}
      {doc.skills && doc.skills.length > 0 && (
        <section
          onClick={() => handleClick("skills")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-slate-50 rounded p-1" : ""}`}
        >
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5">
            Executive Competencies & Governance
          </h2>
          {(() => {
            const grouped = getGroupedSkills(doc.skills);
            const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
            if (hasCategories) {
              return (
                <div className="space-y-1 mt-1 text-xs text-slate-800 leading-relaxed font-medium">
                  {grouped.map((g, idx) => (
                    <div key={idx}>
                      <span className="font-bold text-slate-950">{g.category}: </span>
                      <span>{g.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <p className="mt-1 text-xs text-slate-800 leading-relaxed font-medium">
                {doc.skills.map((s) => s.name).join(" • ")}
              </p>
            );
          })()}
        </section>
      )}
    </div>
  );
}
