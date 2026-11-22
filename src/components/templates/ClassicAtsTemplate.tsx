"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { shortenProjectDescription, getGroupedSkills } from "@/lib/utils/projectUtils";

export interface TemplateProps {
  doc: ResumeDoc;
  fontSizePt?: number;
  lineHeight?: number;
  sectionGapRem?: number;
  marginInches?: number;
  onElementClick?: (section: string, itemId?: string) => void;
  readOnly?: boolean;
}

export function ClassicAtsTemplate({
  doc,
  fontSizePt = 10.5,
  lineHeight = 1.35,
  sectionGapRem = 1.0,
  marginInches = 0.75,
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
      className="bg-white text-gray-900 font-serif shadow-md print:shadow-none mx-auto w-full max-w-[816px] min-h-[1056px] transition-all"
      style={{
        padding: `${marginInches}in`,
        fontSize: `${fontSizePt}pt`,
        lineHeight: lineHeight,
      }}
    >
      {/* Header */}
      <header
        onClick={() => handleClick("profile")}
        className={`text-center border-b pb-3 cursor-pointer ${
          !readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""
        }`}
      >
        <h1 className="text-2xl font-bold tracking-wide uppercase text-gray-900">
          {doc.profile.fullName || "Your Full Name"}
        </h1>
        {doc.profile.headline && (
          <p className="text-sm font-semibold text-gray-700 mt-0.5">{doc.profile.headline}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-gray-600 mt-1">
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
                  className="hover:underline text-blue-900"
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
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Professional Summary
          </h2>
          <p className="mt-1 text-xs text-gray-800 text-justify leading-relaxed">
            {doc.profile.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {doc.experience && doc.experience.length > 0 && (
        <section style={{ marginTop: `${sectionGapRem}rem` }}>
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Professional Experience
          </h2>
          <div className="space-y-3 mt-1.5">
            {doc.experience.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleClick("experience", exp.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs font-bold text-gray-900">
                  <span>
                    {exp.position}{" "}
                    <span className="font-normal text-gray-700">| {exp.company}</span>
                  </span>
                  <span className="text-[11px] font-normal text-gray-600">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                    {exp.location && ` • ${exp.location}`}
                  </span>
                </div>

                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-800">
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
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Education
          </h2>
          <div className="space-y-2 mt-1.5">
            {doc.education.map((edu) => (
              <div
                key={edu.id}
                onClick={() => handleClick("education", edu.id)}
                className={`flex justify-between items-baseline text-xs cursor-pointer ${
                  !readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""
                }`}
              >
                <div>
                  <span className="font-bold text-gray-900">{edu.degree || "Degree"}</span>
                  {edu.field && <span className="font-bold text-gray-900"> in {edu.field}</span>}
                  <div className="font-bold text-gray-800">{edu.institution}</div>
                </div>
                <span className="text-[11px] text-gray-600 font-medium">
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
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Key Projects
          </h2>
          <div className="space-y-2.5 mt-1.5">
            {doc.projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleClick("projects", proj.id)}
                className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""}`}
              >
                <div className="flex justify-between items-baseline text-xs font-bold text-gray-900">
                  <span>
                    <span className="font-bold text-gray-900">{proj.name}</span>
                    {proj.role && <span className="font-bold text-gray-800"> ({proj.role})</span>}
                  </span>
                  {proj.url && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-normal text-blue-800 hover:underline"
                    >
                      {proj.url}
                    </a>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-gray-700 mt-0.5">{shortenProjectDescription(proj.description) || proj.description}</p>
                )}
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-800">
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
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Technical & Professional Skills
          </h2>
          {(() => {
            const grouped = getGroupedSkills(doc.skills);
            const hasCategories = grouped.length > 1 || (grouped.length === 1 && Boolean(grouped[0].category));
            if (hasCategories) {
              return (
                <div className="space-y-1 mt-1.5 text-xs text-gray-800 leading-relaxed">
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
              <p className="mt-1 text-xs text-gray-800 leading-relaxed">
                {doc.skills.map((s) => s.name).join(" • ")}
              </p>
            );
          })()}
        </section>
      )}

      {/* Certifications */}
      {doc.certifications && doc.certifications.length > 0 && (
        <section
          onClick={() => handleClick("certifications")}
          style={{ marginTop: `${sectionGapRem}rem` }}
          className={`cursor-pointer ${!readOnly ? "hover:bg-blue-50/40 rounded p-1" : ""}`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-0.5 text-gray-900">
            Certifications & Credentials
          </h2>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs text-gray-800">
            {doc.certifications.map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{c.name}</span> – {c.issuer}{" "}
                {c.issueDate && <span className="text-gray-600">({c.issueDate})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
