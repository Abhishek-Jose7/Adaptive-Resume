"use client";

import React, { useState } from "react";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import {
  Plus,
  Trash2,
  ShieldCheck,
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit2,
  Award,
  ChevronDown,
  ChevronRight,
  Pin,
  Sliders,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  store: ResumeDocStore;
  editorState: EditorState;
}

export function EditorFormPanel({ store, editorState }: Props) {
  const doc = editorState.doc;
  const [activeTab, setActiveTab] = useState<string>(editorState.activeSection || "profile");
  const [showSectionModal, setShowSectionModal] = useState<boolean>(false);

  const experiences = doc.experience || [];
  const educations = doc.education || [];
  const skills = doc.skills || [];
  const projects = doc.projects || [];
  const certs = doc.certifications || [];

  const defaultOrder = ["profile", "experience", "education", "skills", "projects", "certifications"];
  const currentOrder = doc.template?.theme?.sectionOrder || defaultOrder;

  const moveSection = (idx: number, direction: "up" | "down") => {
    const newOrder = [...currentOrder];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const [item] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, item);
    store.reorderSections(newOrder);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Navigation Tabs */}
      <div className="flex border-b bg-paper overflow-x-auto text-xs font-medium items-center">
        <button
          onClick={() => {
            setActiveTab("profile");
            store.setActiveLocation("profile");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap ${
            activeTab === "profile"
              ? "border-stamp text-stamp bg-white font-bold"
              : "border-transparent text-graphite hover:text-ink"
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
              ? "border-stamp text-stamp bg-white font-bold"
              : "border-transparent text-graphite hover:text-ink"
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
              ? "border-stamp text-stamp bg-white font-bold"
              : "border-transparent text-graphite hover:text-ink"
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
              ? "border-stamp text-stamp bg-white font-bold"
              : "border-transparent text-graphite hover:text-ink"
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
              ? "border-stamp text-stamp bg-white font-bold"
              : "border-transparent text-graphite hover:text-ink"
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" /> Projects ({projects.length})
        </button>

        <button
          onClick={() => setShowSectionModal(!showSectionModal)}
          className="flex items-center gap-1 px-3 py-2 text-stamp hover:text-stamp ml-auto whitespace-nowrap text-xs font-semibold"
          title="Manage section order and visibility (PRD Section 10.6 & E4)"
        >
          <Sliders className="w-3.5 h-3.5" /> Sections
        </button>
      </div>

      {/* Section Order & Visibility Modal */}
      {showSectionModal && (
        <div className="bg-stamp-soft border-b p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center font-bold text-ink">
            <span>Manage Section Order &amp; Visibility</span>
            <button
              onClick={() => setShowSectionModal(false)}
              className="text-graphite hover:text-graphite text-sm font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-[11px] text-graphite">
            Reorder sections or toggle their visibility on the rendered resume:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {currentOrder.map((secName, idx) => {
              const isHidden = (doc.sections || []).find((s) => s.type === secName)?.visible === false;
              return (
                <div
                  key={secName}
                  className="flex items-center justify-between bg-white border rounded p-1.5 shadow-none"
                >
                  <span className={`capitalize font-medium ${isHidden ? "line-through text-graphite" : "text-ink"}`}>
                    {secName}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, "up")}
                      className="p-1 hover:bg-paper disabled:opacity-30 rounded text-graphite"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={idx === currentOrder.length - 1}
                      onClick={() => moveSection(idx, "down")}
                      className="p-1 hover:bg-paper disabled:opacity-30 rounded text-graphite"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => store.toggleSectionVisibility(secName)}
                      className="p-1 hover:bg-paper rounded text-graphite"
                      title={isHidden ? "Show Section" : "Hide Section"}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3 text-alarm" /> : <Eye className="w-3 h-3 text-press" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-ink border-b pb-1">Candidate Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">Full Name</label>
                <input
                  type="text"
                  value={doc.profile.fullName || doc.profile.name || ""}
                  onChange={(e) =>
                    store.updateProfile({ fullName: e.target.value, name: e.target.value })
                  }
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">Headline / Role</label>
                <input
                  type="text"
                  value={doc.profile.headline || ""}
                  onChange={(e) => store.updateProfile({ headline: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp"
                  placeholder="e.g. Staff Infrastructure Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">Email</label>
                <input
                  type="email"
                  value={doc.profile.email || ""}
                  onChange={(e) => store.updateProfile({ email: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp"
                  placeholder="e.g. jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1">Phone</label>
                <input
                  type="text"
                  value={doc.profile.phone || ""}
                  onChange={(e) => store.updateProfile({ phone: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp"
                  placeholder="e.g. +1 (555) 019-2831"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-graphite mb-1">Location</label>
                <input
                  type="text"
                  value={doc.profile.location || ""}
                  onChange={(e) => store.updateProfile({ location: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp"
                  placeholder="e.g. Seattle, WA (or Remote)"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-graphite mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={doc.profile.summary || ""}
                  onChange={(e) => store.updateProfile({ summary: e.target.value })}
                  className="w-full text-xs border rounded-md p-2 focus:ring-1 focus:ring-stamp leading-relaxed"
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
              <h3 className="text-sm font-bold text-ink">Work Experience</h3>
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
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-stamp text-white rounded hover:bg-stamp-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {experiences.map((exp, idx) => (
              <div
                key={exp.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  editorState.activeItemId === exp.id ? "ring-2 ring-stamp bg-stamp-soft" : ""
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
                    className="text-graphite hover:text-alarm p-1"
                    title="Remove Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bullets */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-graphite normal-case">
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
                      className="text-[11px] text-stamp hover:underline flex items-center gap-0.5"
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
                        className={`flex-1 text-xs border rounded p-1.5 leading-snug ${
                          b.pinned ? "border-marker bg-marker-soft" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => store.toggleBulletPin(b.id)}
                        title={b.pinned ? "Pinned: protected from AI tailoring" : "Pin bullet (protect from tailoring)"}
                        className={`p-1.5 rounded transition-colors ${
                          b.pinned
                            ? "text-white-dark bg-marker hover:bg-marker font-bold"
                            : "text-ink hover:text-graphite"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => store.removeExperienceBullet(exp.id, b.id)}
                        className="text-ink hover:text-alarm p-1.5"
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
              <h3 className="text-sm font-bold text-ink">Education</h3>
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
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-stamp text-white rounded hover:bg-stamp-dark"
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
                    className="text-graphite hover:text-alarm p-1"
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
            <h3 className="text-sm font-bold text-ink border-b pb-2">Skills & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 bg-paper border text-ink text-xs px-2.5 py-1 rounded"
                >
                  {skill.name}
                  <button
                    onClick={() => store.removeSkill(skill.name)}
                    className="text-graphite hover:text-alarm font-bold"
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
                className="px-3 py-1.5 bg-stamp text-white rounded text-xs font-semibold hover:bg-stamp-dark"
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
              <h3 className="text-sm font-bold text-ink">Key Projects</h3>
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
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-stamp text-white rounded hover:bg-stamp-dark"
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
                    className="text-graphite hover:text-alarm p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Project Bullets */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-graphite normal-case">
                      Project Bullets ({proj.bullets?.length || 0})
                    </span>
                    <button
                      onClick={() =>
                        store.addProjectBullet(proj.id, {
                          id: `b_${Date.now()}`,
                          text: "Engineered scalable feature with verified metrics.",
                          provenance: "manual",
                          sourceBulletIds: [],
                          sourceFactIds: [],
                          validatorStatus: "not_applicable",
                        })
                      }
                      className="text-[11px] text-stamp hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Bullet
                    </button>
                  </div>

                  {(proj.bullets || []).map((b) => (
                    <div key={b.id} className="flex items-start gap-1.5">
                      <textarea
                        rows={2}
                        value={b.text}
                        onChange={(e) => store.updateProjectBullet(proj.id, b.id, e.target.value)}
                        className={`flex-1 text-xs border rounded p-1.5 leading-snug ${
                          b.pinned ? "border-marker bg-marker-soft" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => store.toggleBulletPin(b.id)}
                        title={b.pinned ? "Pinned: protected from AI tailoring" : "Pin bullet (protect from tailoring)"}
                        className={`p-1.5 rounded transition-colors ${
                          b.pinned
                            ? "text-white-dark bg-marker hover:bg-marker font-bold"
                            : "text-ink hover:text-graphite"
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => store.removeProjectBullet(proj.id, b.id)}
                        className="text-ink hover:text-alarm p-1.5"
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
      </div>
    </div>
  );
}
