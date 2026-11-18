"use client";

import React, { useState } from "react";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import { Plus, Trash2, ShieldCheck, User, Briefcase, GraduationCap, Code, FolderGit2, Award, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  store: ResumeDocStore;
  editorState: EditorState;
}

export function EditorFormPanel({ store, editorState }: Props) {
  const doc = editorState.doc;
  const [activeTab, setActiveTab] = useState<string>(editorState.activeSection || "profile");

  const experiences = doc.experience || [];
  const educations = doc.education || [];
  const skills = doc.skills || [];
  const projects = doc.projects || [];
  const certs = doc.certifications || [];

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Navigation Tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => {
            setActiveTab("profile");
            store.setActiveLocation("profile");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-700 bg-white font-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <User className="w-3.5 h-3.5" /> Contact & Profile
        </button>
        <button
          onClick={() => {
            setActiveTab("experience");
            store.setActiveLocation("experience");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "experience"
              ? "border-indigo-600 text-indigo-700 bg-white font-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> Experience ({experiences.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("education");
            store.setActiveLocation("education");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "education"
              ? "border-indigo-600 text-indigo-700 bg-white font-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Education ({educations.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("skills");
            store.setActiveLocation("skills");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "skills"
              ? "border-indigo-600 text-indigo-700 bg-white font-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Code className="w-3.5 h-3.5" /> Skills ({skills.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("projects");
            store.setActiveLocation("projects");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "projects"
              ? "border-indigo-600 text-indigo-700 bg-white font-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" /> Projects ({projects.length})
        </button>
      </div>

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-1">Candidate Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={doc.profile.fullName || doc.profile.name || ""}
                  onChange={(e) =>
                    store.updateProfile({ fullName: e.target.value, name: e.target.value })
                  }
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Headline / Role</label>
                <input
                  type="text"
                  value={doc.profile.headline || ""}
                  onChange={(e) => store.updateProfile({ headline: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Staff Infrastructure Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={doc.profile.email || ""}
                  onChange={(e) => store.updateProfile({ email: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={doc.profile.phone || ""}
                  onChange={(e) => store.updateProfile({ phone: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. +1 (555) 019-2831"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                <input
                  type="text"
                  value={doc.profile.location || ""}
                  onChange={(e) => store.updateProfile({ location: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Seattle, WA (or Remote)"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={doc.profile.summary || ""}
                  onChange={(e) => store.updateProfile({ summary: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  placeholder="High-impact 2-3 sentence overview highlighting core domain mastery and quantifiable career impact."
                />
              </div>
            </div>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Work Experience</h3>
              <button
                onClick={() =>
                  store.addExperience({
                    id: `exp_${Date.now()}`,
                    company: "Company Name",
                    position: "Job Title",
                    startDate: "2023",
                    endDate: null,
                    isCurrent: true,
                    bullets: [
                      {
                        id: `b_${Date.now()}`,
                        text: "Engineered core feature reducing latency by 25%.",
                        provenance: "manual",
                        sourceBulletIds: [],
                        sourceFactIds: [],
                        validatorStatus: "not_applicable",
                      },
                    ],
                  })
                }
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {experiences.map((exp, idx) => (
              <div
                key={exp.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  editorState.activeItemId === exp.id ? "ring-2 ring-indigo-500 bg-indigo-50/20" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => store.updateExperience(exp.id, { position: e.target.value })}
                      placeholder="Position / Title"
                      className="text-xs font-bold border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => store.updateExperience(exp.id, { company: e.target.value })}
                      placeholder="Company"
                      className="text-xs border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => store.updateExperience(exp.id, { startDate: e.target.value })}
                      placeholder="Start (e.g. 2021)"
                      className="text-xs border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={exp.endDate || ""}
                      onChange={(e) => store.updateExperience(exp.id, { endDate: e.target.value })}
                      placeholder="End (or leave blank for Present)"
                      className="text-xs border rounded p-1.5"
                    />
                  </div>
                  <button
                    onClick={() => store.removeExperience(exp.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Remove Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bullets */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase">
                      Achievement Bullets ({exp.bullets.length})
                    </span>
                    <button
                      onClick={() =>
                        store.addExperienceBullet(exp.id, {
                          id: `b_${Date.now()}`,
                          text: "Quantified achievement demonstrating measurable impact.",
                          provenance: "manual",
                          sourceBulletIds: [],
                          sourceFactIds: [],
                          validatorStatus: "not_applicable",
                        })
                      }
                      className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Bullet
                    </button>
                  </div>

                  {exp.bullets.map((b) => (
                    <div key={b.id} className="flex items-start gap-1.5">
                      <textarea
                        rows={2}
                        value={b.text}
                        onChange={(e) => store.updateExperienceBullet(exp.id, b.id, e.target.value)}
                        className="flex-1 text-xs border rounded p-1.5 leading-snug"
                      />
                      <button
                        onClick={() => store.removeExperienceBullet(exp.id, b.id)}
                        className="text-gray-300 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Education Tab */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Education</h3>
              <button
                onClick={() =>
                  store.addEducation({
                    id: `edu_${Date.now()}`,
                    institution: "University",
                    degree: "Bachelor of Science",
                    field: "Computer Science",
                    startDate: "2018",
                    endDate: "2022",
                  })
                }
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Education
              </button>
            </div>

            {educations.map((edu) => (
              <div key={edu.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => store.updateEducation(edu.id, { institution: e.target.value })}
                      placeholder="Institution"
                      className="text-xs font-semibold border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={edu.degree || ""}
                      onChange={(e) => store.updateEducation(edu.id, { degree: e.target.value })}
                      placeholder="Degree (e.g. B.S.)"
                      className="text-xs border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={edu.field || ""}
                      onChange={(e) => store.updateEducation(edu.id, { field: e.target.value })}
                      placeholder="Field of Study"
                      className="text-xs border rounded p-1.5"
                    />
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={edu.startDate}
                        onChange={(e) => store.updateEducation(edu.id, { startDate: e.target.value })}
                        placeholder="Start"
                        className="text-xs border rounded p-1.5 w-1/2"
                      />
                      <input
                        type="text"
                        value={edu.endDate || ""}
                        onChange={(e) => store.updateEducation(edu.id, { endDate: e.target.value })}
                        placeholder="End"
                        className="text-xs border rounded p-1.5 w-1/2"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => store.removeEducation(edu.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Skills & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 bg-gray-100 border text-gray-800 text-xs px-2.5 py-1 rounded"
                >
                  {skill.name}
                  <button
                    onClick={() => store.removeSkill(skill.name)}
                    className="text-gray-400 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                id="newSkillInput"
                type="text"
                placeholder="Add skill (e.g. PostgreSQL, React, AWS)"
                className="text-xs border rounded p-2 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      store.addSkill({ name: val });
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("newSkillInput") as HTMLInputElement;
                  if (input && input.value.trim()) {
                    store.addSkill({ name: input.value.trim() });
                    input.value = "";
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Key Projects</h3>
              <button
                onClick={() =>
                  store.addProject({
                    id: `proj_${Date.now()}`,
                    name: "Project Name",
                    role: "Lead Developer",
                    url: "https://github.com/...",
                    description: "High-performance distributed system.",
                    bullets: [
                      {
                        id: `b_${Date.now()}`,
                        text: "Implemented consensus protocol handling 5,000 req/sec.",
                        provenance: "manual",
                        sourceBulletIds: [],
                        sourceFactIds: [],
                        validatorStatus: "not_applicable",
                      },
                    ],
                  })
                }
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {projects.map((proj) => (
              <div key={proj.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => store.updateProject(proj.id, { name: e.target.value })}
                      placeholder="Project Name"
                      className="text-xs font-bold border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={proj.role || ""}
                      onChange={(e) => store.updateProject(proj.id, { role: e.target.value })}
                      placeholder="Role (e.g. Creator)"
                      className="text-xs border rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={proj.url || ""}
                      onChange={(e) => store.updateProject(proj.id, { url: e.target.value })}
                      placeholder="URL"
                      className="col-span-2 text-xs border rounded p-1.5"
                    />
                  </div>
                  <button
                    onClick={() => store.removeProject(proj.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
