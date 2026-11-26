import {
  ResumeDoc,
  ResumeProfile,
  ResumeExperience,
  ResumeEducation,
  ResumeSkill,
  ResumeProject,
  ResumeCertification,
  ResumeBullet,
} from "@/types/resume";

export interface EditorState {
  doc: ResumeDoc;
  past: ResumeDoc[];
  future: ResumeDoc[];
  isDirty: boolean;
  activeSection: string | null;
  activeItemId: string | null;
}

export type EditorListener = (state: EditorState) => void;

export class ResumeDocStore {
  private state: EditorState;
  private listeners: Set<EditorListener> = new Set();
  private maxHistory: number = 50;

  constructor(initialDoc: ResumeDoc) {
    this.state = {
      doc: initialDoc,
      past: [],
      future: [],
      isDirty: false,
      activeSection: "profile",
      activeItemId: null,
    };
  }

  getState(): EditorState {
    return this.state;
  }

  subscribe(listener: EditorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private pushState(newDoc: ResumeDoc) {
    this.state = {
      ...this.state,
      past: [...this.state.past.slice(-this.maxHistory), this.state.doc],
      future: [],
      doc: newDoc,
      isDirty: true,
    };
    this.notify();
  }

  setDocument(doc: ResumeDoc) {
    this.state = {
      ...this.state,
      doc,
      past: [],
      future: [],
      isDirty: false,
    };
    this.notify();
  }

  setActiveLocation(section: string, itemId: string | null = null) {
    this.state = {
      ...this.state,
      activeSection: section,
      activeItemId: itemId,
    };
    this.notify();
  }

  undo() {
    if (this.state.past.length === 0) return;
    const previous = this.state.past[this.state.past.length - 1];
    const newPast = this.state.past.slice(0, -1);

    this.state = {
      ...this.state,
      past: newPast,
      future: [this.state.doc, ...this.state.future],
      doc: previous,
      isDirty: true,
    };
    this.notify();
  }

  redo() {
    if (this.state.future.length === 0) return;
    const next = this.state.future[0];
    const newFuture = this.state.future.slice(1);

    this.state = {
      ...this.state,
      past: [...this.state.past, this.state.doc],
      future: newFuture,
      doc: next,
      isDirty: true,
    };
    this.notify();
  }

  markSaved() {
    this.state = {
      ...this.state,
      isDirty: false,
    };
    this.notify();
  }

  // Profile Actions
  updateProfile(profile: Partial<ResumeProfile>) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      profile: {
        ...this.state.doc.profile,
        ...profile,
      },
    };
    this.pushState(newDoc);
  }

  setTemplateId(templateId: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      template: {
        ...this.state.doc.template,
        id: templateId,
      },
    };
    this.pushState(newDoc);
  }

  // Experience Actions
  addExperience(exp: ResumeExperience) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: [exp, ...(this.state.doc.experience || [])],
    };
    this.pushState(newDoc);
  }

  updateExperience(id: string, updates: Partial<ResumeExperience>) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: (this.state.doc.experience || []).map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    };
    this.pushState(newDoc);
  }

  removeExperience(id: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: (this.state.doc.experience || []).filter((e) => e.id !== id),
    };
    this.pushState(newDoc);
  }

  addExperienceBullet(expId: string, bullet: ResumeBullet) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: (this.state.doc.experience || []).map((e) => {
        if (e.id === expId) {
          return {
            ...e,
            bullets: [...e.bullets, bullet],
          };
        }
        return e;
      }),
    };
    this.pushState(newDoc);
  }

  updateExperienceBullet(expId: string, bulletId: string, newText: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: (this.state.doc.experience || []).map((e) => {
        if (e.id === expId) {
          return {
            ...e,
            bullets: e.bullets.map((b) =>
              b.id === bulletId ? { ...b, text: newText } : b
            ),
          };
        }
        return e;
      }),
    };
    this.pushState(newDoc);
  }

  removeExperienceBullet(expId: string, bulletId: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: (this.state.doc.experience || []).map((e) => {
        if (e.id === expId) {
          return {
            ...e,
            bullets: e.bullets.filter((b) => b.id !== bulletId),
          };
        }
        return e;
      }),
    };
    this.pushState(newDoc);
  }

  // Education Actions
  addEducation(edu: ResumeEducation) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      education: [...(this.state.doc.education || []), edu],
    };
    this.pushState(newDoc);
  }

  updateEducation(id: string, updates: Partial<ResumeEducation>) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      education: (this.state.doc.education || []).map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    };
    this.pushState(newDoc);
  }

  removeEducation(id: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      education: (this.state.doc.education || []).filter((e) => e.id !== id),
    };
    this.pushState(newDoc);
  }

  // Skills Actions
  addSkill(skill: ResumeSkill) {
    const currentSkills = this.state.doc.skills || [];
    if (currentSkills.some((s) => s.name.toLowerCase() === skill.name.toLowerCase())) {
      return;
    }
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      skills: [...currentSkills, skill],
    };
    this.pushState(newDoc);
  }

  removeSkill(skillName: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      skills: (this.state.doc.skills || []).filter(
        (s) => s.name.toLowerCase() !== skillName.toLowerCase()
      ),
    };
    this.pushState(newDoc);
  }

  // Project Actions
  addProject(proj: ResumeProject) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: [...(this.state.doc.projects || []), proj],
    };
    this.pushState(newDoc);
  }

  updateProject(id: string, updates: Partial<ResumeProject>) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: (this.state.doc.projects || []).map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    };
    this.pushState(newDoc);
  }

  removeProject(id: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: (this.state.doc.projects || []).filter((p) => p.id !== id),
    };
    this.pushState(newDoc);
  }

  // Project Bullet Actions
  addProjectBullet(projId: string, bullet: ResumeBullet) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: (this.state.doc.projects || []).map((p) => {
        if (p.id === projId) {
          return {
            ...p,
            bullets: [...p.bullets, bullet],
          };
        }
        return p;
      }),
    };
    this.pushState(newDoc);
  }

  updateProjectBullet(projId: string, bulletId: string, newText: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: (this.state.doc.projects || []).map((p) => {
        if (p.id === projId) {
          return {
            ...p,
            bullets: p.bullets.map((b) =>
              b.id === bulletId ? { ...b, text: newText } : b
            ),
          };
        }
        return p;
      }),
    };
    this.pushState(newDoc);
  }

  removeProjectBullet(projId: string, bulletId: string) {
    const newDoc: ResumeDoc = {
      ...this.state.doc,
      projects: (this.state.doc.projects || []).map((p) => {
        if (p.id === projId) {
          return {
            ...p,
            bullets: p.bullets.filter((b) => b.id !== bulletId),
          };
        }
        return p;
      }),
    };
    this.pushState(newDoc);
  }

  // Pinning Helpers (PRD Section 10.4 & T9)
  toggleBulletPin(bulletId: string) {
    let updated = false;

    // Check experiences
    const newExp = (this.state.doc.experience || []).map((exp) => {
      const bulletExists = exp.bullets.some((b) => b.id === bulletId);
      if (!bulletExists) return exp;
      updated = true;
      return {
        ...exp,
        bullets: exp.bullets.map((b) =>
          b.id === bulletId ? { ...b, pinned: !b.pinned } : b
        ),
      };
    });

    // Check projects
    const newProj = (this.state.doc.projects || []).map((proj) => {
      const bulletExists = proj.bullets.some((b) => b.id === bulletId);
      if (!bulletExists) return proj;
      updated = true;
      return {
        ...proj,
        bullets: proj.bullets.map((b) =>
          b.id === bulletId ? { ...b, pinned: !b.pinned } : b
        ),
      };
    });

    if (updated) {
      this.pushState({
        ...this.state.doc,
        experience: newExp,
        projects: newProj,
      });
    }
  }

  // Section Visibility & Ordering (PRD Section 10.6 & E4)
  toggleSectionVisibility(sectionType: string) {
    const sections = this.state.doc.sections || [];
    const existingIndex = sections.findIndex((s) => s.type === sectionType);

    let newSections = [...sections];
    if (existingIndex >= 0) {
      newSections[existingIndex] = {
        ...newSections[existingIndex],
        visible: !newSections[existingIndex].visible,
      };
    } else {
      newSections.push({
        id: `sec_${sectionType}`,
        type: sectionType,
        heading: sectionType.charAt(0).toUpperCase() + sectionType.slice(1),
        visible: false,
        items: [],
      });
    }

    this.pushState({
      ...this.state.doc,
      sections: newSections,
    });
  }

  reorderSections(sectionOrder: string[]) {
    this.pushState({
      ...this.state.doc,
      template: {
        ...this.state.doc.template,
        theme: {
          ...this.state.doc.template?.theme,
          sectionOrder,
        },
      },
    });
  }

  updateTemplateTheme(theme: Record<string, unknown>) {
    this.pushState({
      ...this.state.doc,
      template: {
        ...this.state.doc.template,
        theme: {
          ...this.state.doc.template?.theme,
          ...theme,
        },
      },
    });
  }

  // Reordering helpers
  reorderExperience(startIndex: number, endIndex: number) {
    const result = Array.from(this.state.doc.experience || []);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    const newDoc: ResumeDoc = {
      ...this.state.doc,
      experience: result,
    };
    this.pushState(newDoc);
  }
}
