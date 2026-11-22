"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { TemplateProps } from "./ClassicAtsTemplate";
import { shortenProjectDescription } from "@/lib/utils/projectUtils";

export function LuxuriousGridTemplate({
  doc,
  fontSizePt = 9.5,
  lineHeight = 1.35,
  sectionGapRem = 0.85,
  marginInches = 0.55,
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
      {/* Top Banner Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`border-b-2 border-[#10241c] pb-3 mb-4 cursor-pointer ${
          !readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#10241c] uppercase">
              {doc.profile.fullName || "Your Full Name"}
            </h1>
            {doc.profile.headline && (
              <p className="text-xs font-bold text-gray-700 tracking-wide mt-0.5 uppercase">
                {doc.profile.headline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-col sm:items-end gap-x-3 text-[11px] text-gray-600 font-medium">
            {doc.profile.email && <span>{doc.profile.email}</span>}
            {doc.profile.phone && <span>{doc.profile.phone}</span>}
            {doc.profile.location && <span>{doc.profile.location}</span>}
          </div>
        </div>

        {doc.profile.links && doc.profile.links.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#10241c] font-semibold mt-1.5 pt-1.5 border-t border-[#becbbf]/40">
            {doc.profile.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                {link.label || link.url}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Sidebar (4 columns / 33%) */}
        <aside className="col-span-4 border-r border-[#becbbf]/40 pr-4 space-y-4">
          {/* Skills Section */}
          {doc.skills && doc.skills.length > 0 && (
            <section
              onClick={() => handleClick("skills")}
              className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Competencies
              </h2>
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-[#becbbf]/20 text-[#10241c] text-[10.5px] font-semibold px-2 py-0.5 rounded border border-[#10241c]/20"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education Section */}
          {doc.education && doc.education.length > 0 && (
            <section style={{ marginTop: `${sectionGapRem}rem` }}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Education
              </h2>
              <div className="space-y-2 mt-2">
                {doc.education.map((edu) => (
                  <div
                    key={edu.id}
                    onClick={() => handleClick("education", edu.id)}
                    className={`text-xs cursor-pointer ${
                      !readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""
                    }`}
                  >
                    <div className="font-bold text-gray-900 leading-tight">
                      {edu.degree || "Degree"}
                    </div>
                    {edu.field && <div className="text-[11px] text-gray-700 font-medium">{edu.field}</div>}
                    <div className="text-[11px] text-gray-600">{edu.institution}</div>
                    <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                      {edu.startDate} – {edu.endDate || "Present"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications Section */}
          {doc.certifications && doc.certifications.length > 0 && (
            <section
              onClick={() => handleClick("certifications")}
              style={{ marginTop: `${sectionGapRem}rem` }}
              className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Certifications
              </h2>
              <div className="space-y-1.5 mt-2">
                {doc.certifications.map((c) => (
                  <div key={c.id} className="text-xs">
                    <div className="font-bold text-gray-900 leading-tight">{c.name}</div>
                    <div className="text-[10.5px] text-gray-600">
                      {c.issuer} {c.issueDate && `(${c.issueDate})`}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Right Main Column (8 columns / 67%) */}
        <main className="col-span-8 space-y-4">
          {/* Summary */}
          {doc.profile.summary && (
            <section
              onClick={() => handleClick("profile")}
              className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Executive Profile
              </h2>
              <p className="mt-1.5 text-xs text-gray-800 leading-relaxed font-normal">
                {doc.profile.summary}
              </p>
            </section>
          )}

          {/* Work Experience */}
          {doc.experience && doc.experience.length > 0 && (
            <section style={{ marginTop: `${sectionGapRem}rem` }}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Professional Experience
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
                      <span className="text-[10.5px] font-semibold text-gray-500 whitespace-nowrap">
                        {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                      </span>
                    </div>

                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-800 leading-normal">
                      {exp.bullets.map((b) => (
                        <li key={b.id}>{b.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Key Projects */}
          {doc.projects && doc.projects.length > 0 && (
            <section style={{ marginTop: `${sectionGapRem}rem` }}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#10241c] border-b border-[#10241c] pb-0.5">
                Key Initiatives & Projects
              </h2>
              <div className="space-y-2.5 mt-2">
                {doc.projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleClick("projects", proj.id)}
                    className={`cursor-pointer ${!readOnly ? "hover:bg-[#becbbf]/15 rounded p-1" : ""}`}
                  >
                    <div className="flex justify-between items-baseline text-xs font-bold text-gray-900">
                      <span>
                        {proj.name}
                        {proj.role && <span className="font-normal text-gray-600"> ({proj.role})</span>}
                      </span>
                      {proj.url && (
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] font-medium text-[#10241c] hover:underline"
                        >
                          {proj.url}
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-gray-600 mt-0.5">{shortenProjectDescription(proj.description) || proj.description}</p>
                    )}
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-gray-800 leading-normal">
                      {proj.bullets.map((b) => (
                        <li key={b.id}>{b.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
