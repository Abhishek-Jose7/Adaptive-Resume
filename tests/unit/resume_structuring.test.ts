import { describe, it, expect, vi } from "vitest";
import { ResumeStructuringService, classifySkills } from "@/lib/parsers/resumeStructuringService";
import { LocalDeterministicAdapter } from "@/lib/ai/adapters/localDeterministicAdapter";
import { GitHubImportService } from "@/lib/services/githubImportService";
import { ResumeDocStore } from "@/lib/editor/resumeDocStore";
import { ResumeDoc } from "@/types/resume";
import { validateFileBuffer } from "@/lib/parsers/fileValidator";
import { parseDocxBuffer } from "@/lib/parsers/browserDocxParser";
import JSZip from "jszip";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";

describe("Resume Structuring, Intake & Editor Enhancements Suite", () => {
  const sampleResumeText = `
ALEXANDER WANG
San Francisco, CA | alex@example.com | 555-0199

PROFESSIONAL SUMMARY
Principal distributed systems engineer with 10+ years architecting high-throughput financial infrastructure and fault-tolerant streaming pipelines.

WORK EXPERIENCE
Staff Systems Architect at Acme Corp
Jan 2021 - Present
• Engineered distributed consensus pipeline handling 250,000 requests/sec with 99.999% uptime.
• Reduced p99 database latency by 45% by deploying Redis read-through clustering.
• Spearheaded migration of 14 monolithic services into Kubernetes microservices.

Senior Backend Engineer at Beta Tech
2018 - 2020
• Developed real-time event streaming pipeline using Apache Kafka and Go.
• Mentored 6 junior engineers and established zero-downtime deployment pipelines.

EDUCATION
B.S. in Computer Science
University of California, Berkeley
2014 - 2018

TECHNICAL SKILLS
Languages & Frameworks: Go, TypeScript, Python, Rust, React, Node.js
Cloud & Infrastructure: AWS, Docker, Kubernetes, Terraform, PostgreSQL, Kafka

PROJECTS
VectorDB Core
• Implemented SIMD-accelerated HNSW vector indexing engine in Rust achieving 10x query throughput.
• Published open-source crate with 1,200 GitHub stars and 50,000 monthly downloads.

CERTIFICATIONS
AWS Certified Solutions Architect - Professional (2023)
  `.trim();

  describe("1. Deterministic Resume Text Structuring (PRD I2, I3)", () => {
    it("should segment unstructured text into distinct typed sections", () => {
      const sections = ResumeStructuringService.structureResumeText(sampleResumeText, "Test Resume");

      expect(sections.length).toBeGreaterThanOrEqual(6);

      const sectionTypes = sections.map((s) => s.entryType);
      expect(sectionTypes).toContain("profile");
      expect(sectionTypes).toContain("experience");
      expect(sectionTypes).toContain("education");
      expect(sectionTypes).toContain("skill_group");
      expect(sectionTypes).toContain("project");
      expect(sectionTypes).toContain("certification");
    });

    it("should parse experience roles, dates, and atomic bullets", () => {
      const sections = ResumeStructuringService.structureResumeText(sampleResumeText, "Test Resume");
      const experiences = sections.filter((s) => s.entryType === "experience");
      expect(experiences.length).toBe(2);
      expect(experiences[0].title).toContain("Staff Systems Architect");
      expect(experiences[0].bullets.length).toBe(3);
      expect(experiences[0].bullets[0]).toContain("250,000 requests/sec");

      expect(experiences[1].title).toContain("Senior Backend Engineer");
      expect(experiences[1].bullets.length).toBe(2);
    });

    it("should parse education degree and institution", () => {
      const sections = ResumeStructuringService.structureResumeText(sampleResumeText, "Test Resume");
      const educations = sections.filter((s) => s.entryType === "education");

      expect(educations).toHaveLength(1);
      expect(educations[0].title.toLowerCase()).toContain("b.s.");
      expect(educations[0].organization).toContain("University of California");
      expect(educations[0].startDate).toBe("2014");
      expect(educations[0].endDate).toBe("2018");
    });

    it("recognizes professional summary headings as section headings", () => {
      const sections = ResumeStructuringService.structureResumeText(
        "ALEX RIVERA\nalex@example.com\n\nPROFESSIONAL SUMMARY\nProduct designer with ten years of experience.\n\nEXPERIENCE\nDesigner at Studio\n• Led product research.",
      );
      const profiles = sections.filter((section) => section.entryType === "profile");
      expect(profiles.some((section) => section.descriptionContext?.includes("ten years"))).toBe(true);
    });

    it("validates a typed-array view using only its visible PDF bytes", () => {
      const backing = new Uint8Array([0, 0, 0x25, 0x50, 0x44, 0x46, 0, 0]);
      const pdfSlice = backing.subarray(2, 6);
      expect(validateFileBuffer(pdfSlice, "resume.pdf")).toMatchObject({ isValid: true, fileType: "pdf" });
    });

    it("extracts selectable text from a real DOCX container", async () => {
      const docx = new JSZip();
      docx.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      );
      docx.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      );
      docx.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Principal Engineer</w:t></w:r></w:p><w:p><w:r><w:t>Led a team of twelve engineers.</w:t></w:r></w:p></w:body></w:document>`,
      );

      const bytes = await docx.generateAsync({ type: "uint8array" });
      const parsed = await parseDocxBuffer(bytes, "resume.docx");

      expect(parsed.text).toContain("Principal Engineer");
      expect(parsed.text).toContain("Led a team of twelve engineers.");
    });

    it("extracts selectable text from a PDF", async () => {
      const stream = "BT /F1 18 Tf 72 720 Td (Resume for Ada Lovelace: software engineer with experience in analytics.) Tj ET";
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      ];
      let pdf = "%PDF-1.4\n";
      const offsets = [0];
      for (let i = 0; i < objects.length; i++) {
        offsets.push(new TextEncoder().encode(pdf).length);
        pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      }
      const xrefOffset = new TextEncoder().encode(pdf).length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

      const parsed = await parsePdfBuffer(new TextEncoder().encode(pdf), "resume.pdf");

      expect(parsed.pageCount).toBe(1);
      expect(parsed.text).toContain("Ada Lovelace");
      expect(parsed.isScanned).toBe(false);
    }, 30000);

    it("should parse skill groups into categories and skill lists", () => {
      const sections = ResumeStructuringService.structureResumeText(sampleResumeText, "Test Resume");
      const skillGroups = sections.filter((s) => s.entryType === "skill_group");
      expect(skillGroups.length).toBeGreaterThanOrEqual(2);
      const languages = skillGroups.find((g) => g.title.toLowerCase().includes("languages"));
      expect(languages).toBeDefined();
      expect(languages!.bullets).toContain("TypeScript");
      expect(languages!.bullets).toContain("Rust");
    });

    it("should convert structured sections into StagedItemInputs", () => {
      const sections = ResumeStructuringService.structureResumeText(sampleResumeText, "Test Resume");
      const stagedInputs = ResumeStructuringService.toStagedItemInputs(sections);

      expect(stagedInputs.length).toBe(sections.length);
      expect(stagedInputs[0].entryType).toBe(sections[0].entryType);
      expect(stagedInputs[0].parsedDataJson.title).toBe(sections[0].title);
    });
  });

  describe("2. LocalDeterministicAdapter parse_resume (PRD Section 7.5 & 10.7)", () => {
    it("should handle parse_resume task without external LLM call", async () => {
      const adapter = new LocalDeterministicAdapter();
      const result = await adapter.generateStructured<any>({
        task: "parse_resume",
        systemPrompt: "Parse resume into sections",
        userPayload: { rawText: sampleResumeText },
        schema: {},
        maxOutputTokens: 2048,
        temperature: 0.1,
      });

      expect(result.model).toBe("deterministic-v1");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("3. GitHub Repository Import (PRD I5)", () => {
    it("should transform GitHub repository metadata into structured project items with metrics", () => {
      const mockRepos = [
        {
          name: "antigravity-core",
          fullName: "org/antigravity-core",
          description: "High-performance distributed state machine",
          language: "Rust",
          topics: ["distributed-systems", "raft", "database"],
          stars: 450,
          forks: 38,
          url: "https://github.com/org/antigravity-core",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const staged = GitHubImportService.convertReposToStagedItems(mockRepos);

      expect(staged.length).toBe(1);
      expect(staged[0].entryType).toBe("project");
      expect(staged[0].parsedDataJson.title).toBe("antigravity-core");
      expect(staged[0].parsedDataJson.organization).toBe("Open Source / GitHub");

      const bullets = staged[0].parsedDataJson.bullets || [];
      expect(bullets.length).toBe(3);
      expect(bullets[0]).toContain("Rust");
      expect(bullets[1]).toContain("distributed-systems");
      expect(bullets[2]).toContain("450 stars");
    });
  });

  describe("4. Resume Editor: Pinning, Section Management & Theming (PRD E4, T9)", () => {
    const mockDoc: ResumeDoc = {
      schemaVersion: 1,
      documentId: "doc_1",
      versionId: "ver_1",
      profile: { name: "Test User", links: [] },
      sections: [],
      template: {
        id: "classic-ats",
        version: "1.0",
        theme: {
          sectionOrder: ["profile", "experience", "education", "skills", "projects"],
        },
      },
      page: { size: "LETTER", targetPages: 1 },
      metadata: { createdAt: new Date().toISOString() },
      experience: [
        {
          id: "exp_1",
          company: "Acme",
          position: "Lead",
          startDate: "2020",
          bullets: [
            {
              id: "b_1",
              text: "Engineered scalable pipeline.",
              provenance: "manual",
              sourceBulletIds: [],
              sourceFactIds: [],
              validatorStatus: "passed",
              pinned: false,
            },
          ],
        },
      ],
      projects: [
        {
          id: "proj_1",
          name: "Open Source Tool",
          bullets: [
            {
              id: "b_proj_1",
              text: "Developed CLI utility.",
              provenance: "manual",
              sourceBulletIds: [],
              sourceFactIds: [],
              validatorStatus: "passed",
              pinned: false,
            },
          ],
        },
      ],
    };

    it("should toggle bullet pin on experience bullets", () => {
      const store = new ResumeDocStore(mockDoc);
      expect(store.getState().doc.experience![0].bullets[0].pinned).toBeFalsy();

      store.toggleBulletPin("b_1");
      expect(store.getState().doc.experience![0].bullets[0].pinned).toBe(true);

      store.toggleBulletPin("b_1");
      expect(store.getState().doc.experience![0].bullets[0].pinned).toBe(false);
    });

    it("should toggle bullet pin on project bullets", () => {
      const store = new ResumeDocStore(mockDoc);
      expect(store.getState().doc.projects![0].bullets[0].pinned).toBeFalsy();

      store.toggleBulletPin("b_proj_1");
      expect(store.getState().doc.projects![0].bullets[0].pinned).toBe(true);
    });

    it("should reorder sections and update theme sectionOrder", () => {
      const store = new ResumeDocStore(mockDoc);
      const newOrder = ["profile", "skills", "experience", "projects", "education"];
      store.reorderSections(newOrder);

      expect(store.getState().doc.template.theme.sectionOrder).toEqual(newOrder);
    });

    it("should toggle section visibility in resume sections", () => {
      const store = new ResumeDocStore(mockDoc);
      store.toggleSectionVisibility("skills");

      const skillsSec = store.getState().doc.sections.find((s) => s.type === "skills");
      expect(skillsSec).toBeDefined();
      expect(skillsSec!.visible).toBe(false);

      store.toggleSectionVisibility("skills");
      const updatedSec = store.getState().doc.sections.find((s) => s.type === "skills");
      expect(updatedSec!.visible).toBe(true);
    });

    it("should successfully structure continuous/unstructured resume with inline headings and embedded projects", () => {
      const messyResumeText = `Professional Summary
profile
95% match
SUMMARY I am a third - year Computer Engineering student who likes building things that actually get used . I ’ ve worked across full - stack development , AI / ML , GenAI , and backend systems , from building products independently to developing technology for college events and hackathons . I enjoy figuring out problems from scratch , picking up new tools quickly , and turning ideas into working products . TECHNICAL SKILLS Cloud & Deployment Cloudflare Workers | Cloudflare D1 | Vercel | Firebase | Wrangler Databases & Tools PostgreSQL | SQLite | Git | GitHub | Playwright | Selenium Languages Python | JavaScript | TypeScript | C | Dart | SQL | HTML / CSS AI & GenAI Generative AI | LLMs | RAG | AI Agents | Embeddings | Prompt Engineering | NLP | OCR | AI Automation ML & Computer Vision TensorFlow | Scikit - learn | Pandas | NumPy | OpenCV | MediaPipe | Object Detection Web & Backend React | Next . js | Flask | Django | Tailwind CSS | REST APIs | Prisma ORM Technical Associate , GDSC CRCE June 2025 - May 2026 Organised Bit n Build , coordinating teams , college outreach , judging panels , and 1000 + participants across multiple colleges . O rganised Unplug , a 3 - day residential startup launchpad , handling logistics and event operations for the club . Built event infrastructure using Next . js + Prisma , including the council website , hackathon platform , and startup launchpad portal . PROFESSIONAL EXPERIENCE Technical Lead , GDG CRCE May 2026 - Present Serving as a core council member , managing technical initiatives and event execution across GDG activities . Coordinating registration , team management , communication , and event operations for Bit n Build across colleges , supporting 1 , 500 + participants and 680 + teams Building and maintaining the GDG CRCE council website and Bit n Build hackathon website , including development and deployment . D eveloping technical infrastructure for events , including QR - based verification , registration workflows , leaderboards , and participant management tools . Technical Intern , FRCRCE Bandra Engineered an edge - native curriculum management platform for authoring , reviewing , versioning , and automated PDF generation . Built a serverless platform using Next . js , Cloudflare Workers , D1 , R2 , Queues , and headless Chromium . July 2026 - Present ABHISHEK JOSE 7738969557 | abhishekjose780 @ gmail . com | github . com / Abhishek - Jose7 | https : // www . linkedin . com / in / abhishek - jose - 906398339 PROJECTS Hangout — Group Itinerary Planner Next . js | Cloudfare D1 | Groq | Python • Built a collaborative itinerary planner that uses group preferences , budgets , locations , and travel constraints to generate personalized outings . • Implemented itinerary optimization and constraint - based recommendation logic to generate feasible multi - location plans while respecting user budgets and travel constraints , with resource - efficient architecture optimized to operate reliably within free - tier infrastructure limits . Languages : English , Hindi , Malayalam , Marathi . Certifications : Supervised ML : Regression & Classification , Advanced LearningAlgorithms / Coursera Awards / Activities : 2x Hackathon Winner [ PKP Hacks ] | [ Pixels Sies ] ADDITIONAL INFORMATION Nyaaya AI — Legal Awareness Platform Next . js | Groq | RAG | Embeddin gs | NLP | Supabase • Built an AI - powered platform that converts complex legal information into plain - language guidance through scenario - based interactions . • Implemented LLM - powered retrieval and NLP workflows to provide contextual answers and make legal information easier to understand . Sponzy — Sponsorship Marketplace Flask | PostgreSQL | JavaScript • Co - built an sponsorship marketplace connecting event organisers with relevant potential sponsors through intelligent matching . • Developed real - time chat , event management , and analytics features end - to - end ; the product attracted investor interest during its early development . KrishiMitra AI — Farmer Decision Support System Flutter | Railway | PostgreSQL | Python | ML • Built a full - stack AI platform for farmers with a Flutter mobile app , Flask API , and ML pipeline supporting yield estimation , price forecasting , pest identification , and loan - risk simulation . • Developed ranking and advisory modules that transform model outputs into actionable recommendations , with fallback mechanisms for unreliable or unavailable inputs . EDUCATION Fr . Conceicao Rodrigues College of Engineering , Mumbai B . E . in Computer Engineering | Expected May 2028`;

      const sections = ResumeStructuringService.structureResumeText(messyResumeText, "Messy Paste");
      expect(sections.length).toBeGreaterThanOrEqual(8);

      const personalDetails = sections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personalDetails).toBeDefined();
      expect(personalDetails!.bullets.some((b) => b.includes("abhishekjose780@gmail.com"))).toBe(true);

      const profile = sections.find((s) => s.entryType === "profile" && s.title === "Professional Summary");
      expect(profile).toBeDefined();
      expect(profile!.bullets[0]).toContain("Computer Engineering student");

      const experiences = sections.filter((s) => s.entryType === "experience");
      expect(experiences.length).toBeGreaterThanOrEqual(1);
      // Ensure Cloud & Deployment was not swallowed into an experience role
      expect(experiences.some((e) => e.title.includes("Cloud & Deployment"))).toBe(false);
      expect(experiences.some((e) => e.title.includes("Technical Associate"))).toBe(true);

      const skillGroups = sections.filter((s) => s.entryType === "skill_group");
      expect(skillGroups.length).toBeGreaterThanOrEqual(4);
      expect(skillGroups.some((g) => g.title === "Cloud & Deployment")).toBe(true);
      expect(skillGroups.some((g) => g.title === "Databases & Tools")).toBe(true);
      expect(skillGroups.some((g) => g.title === "Languages")).toBe(true);
      expect(skillGroups.some((g) => g.title === "AI & GenAI")).toBe(true);
      expect(skillGroups.some((g) => g.title === "ML & Computer Vision")).toBe(true);
      expect(skillGroups.some((g) => g.title === "Web & Backend")).toBe(true);

      // Verify that glued skills were decoupled cleanly
      const langGroup = skillGroups.find((g) => g.title === "Languages");
      expect(langGroup).toBeDefined();
      expect(langGroup!.bullets).toContain("Python");
      expect(langGroup!.bullets).toContain("HTML / CSS");
      // Must not contain glued categories or glued skills
      expect(langGroup!.bullets.some((b) => b.includes("AI & GenAI"))).toBe(false);

      const aiGroup = skillGroups.find((g) => g.title === "AI & GenAI");
      expect(aiGroup).toBeDefined();
      expect(aiGroup!.bullets).toContain("Generative AI");
      expect(aiGroup!.bullets).toContain("AI Automation");
      expect(aiGroup!.bullets.some((b) => b.includes("ML & Computer Vision"))).toBe(false);

      const mlGroup = skillGroups.find((g) => g.title === "ML & Computer Vision");
      expect(mlGroup).toBeDefined();
      expect(mlGroup!.bullets).toContain("TensorFlow");
      expect(mlGroup!.bullets).toContain("Object Detection");
      expect(mlGroup!.bullets.some((b) => b.includes("Web & Backend"))).toBe(false);

      const webGroup = skillGroups.find((g) => g.title === "Web & Backend");
      expect(webGroup).toBeDefined();
      expect(webGroup!.bullets).toContain("React");
      expect(webGroup!.bullets).toContain("Next.js");
      expect(webGroup!.bullets).toContain("Tailwind CSS");

      const projects = sections.filter((s) => s.entryType === "project");
      expect(projects.length).toBeGreaterThanOrEqual(3);
      expect(projects.some((p) => p.title.includes("Hangout"))).toBe(true);
      expect(projects.some((p) => p.title.includes("Nyaaya AI"))).toBe(true);
      expect(projects.some((p) => p.title.includes("Sponzy"))).toBe(true);
      expect(projects.some((p) => p.title.includes("KrishiMitra AI"))).toBe(true);

      const education = sections.find((s) => s.entryType === "education");
      expect(education).toBeDefined();
      expect(education!.organization).toContain("Fr. Conceicao Rodrigues");
    });

    it("should strip trailing contact info leakage from experience bullets", () => {
      const resumeWithContactLeak = `
WORK EXPERIENCE
Software Engineer at Acme Corp
Jan 2022 - Present
• Built high-performance microservices serving 10M requests daily. ABHISHEK JOSE 7738969557 | abhishekjose780@gmail.com
• Optimized database queries by 30%. github.com/test-user | linkedin.com/in/test
`;
      const sections = ResumeStructuringService.structureResumeText(resumeWithContactLeak, "Leak Test");
      const exp = sections.find((s) => s.entryType === "experience");
      expect(exp).toBeDefined();
      expect(exp!.bullets[0]).toBe("Built high-performance microservices serving 10M requests daily.");
      expect(exp!.bullets[1]).toBe("Optimized database queries by 30%.");
    });

    it("should auto-balance unclosed brackets in awards and hackathons", () => {
      const text = `
AWARDS & ACTIVITIES
• 2x Hackathon Winner [ PKP Hacks ] | [ Pixels Sies
• Winner of National Coding Challenge [ TechFest 2024
`;
      const sections = ResumeStructuringService.structureResumeText(text, "Awards Test");
      const awards = sections.filter((s) => s.entryType === "award");
      expect(awards.length).toBeGreaterThanOrEqual(1);
      const combined = awards.map((a) => a.title).join(" ");
      expect(combined).toContain("[ Pixels Sies ]");
      expect(combined).toContain("[ TechFest 2024 ]");
    });

    it("should classify a flat list of skills into canonical categories", () => {
      const rawSkills = [
        "Python", "TypeScript", "React", "Next.js", "Docker", "AWS", "PostgreSQL",
        "Generative AI", "RAG", "TensorFlow", "Pandas", "Git", "Playwright"
      ];
      const classified = classifySkills(rawSkills);
      expect(classified.length).toBeGreaterThanOrEqual(5);

      const languages = classified.find((c) => c.category === "Languages");
      expect(languages?.skills).toContain("Python");
      expect(languages?.skills).toContain("TypeScript");

      const ai = classified.find((c) => c.category === "AI & GenAI");
      expect(ai?.skills).toContain("Generative AI");
      expect(ai?.skills).toContain("RAG");

      const ml = classified.find((c) => c.category === "Machine Learning & CV");
      expect(ml?.skills).toContain("TensorFlow");
      expect(ml?.skills).toContain("Pandas");

      const web = classified.find((c) => c.category === "Web & Backend");
      expect(web?.skills).toContain("React");
      expect(web?.skills).toContain("Next.js");

      const cloud = classified.find((c) => c.category === "Cloud & DevOps");
      expect(cloud?.skills).toContain("Docker");
      expect(cloud?.skills).toContain("AWS");

      const db = classified.find((c) => c.category === "Databases & Tools");
      expect(db?.skills).toContain("PostgreSQL");
      expect(db?.skills).toContain("Git");
      expect(db?.skills).toContain("Playwright");
    });

    it("should accurately segment complex scanned resumes like Johann Joseph into distinct experiences, educations, projects, and certifications", () => {
      const resume = `
JOHANN JOSEPH Cloud Security | Cybersecurity Analyst | Frontend Developer Mumbai, India 400103 | 9969394238 | johannjoseph232006@gmail.com | linkedin.com/in/johann - joseph - 852253330 | github.com/johann - jos

Professional Summary
Computer Engineering student in progress, pursuing cloud security, AWS - and Google Cloud - certified, with hands - on experience in OSINT, network/web security, vulnerability assessment, and CTF competitions. Hackathon winner and Senior Marketing Head at GDG On Ca mpus (FRCRCE), le ading technical teams and driving event outreach, branding, and sponsor acquisition

Work Experience
Cybersecurity Intern
Strike Engine Team Lead — CyArt Tech LLP (Remote)
2026 — 2026
Served as Team Lead for Strike Engine, an AI - powered security platform, coordinating development and testing across the project team. Built an automated threat - analysis engine to streamline identification of potential cybersecurity vulnerabilities. Applied OSINT, vulnerability assessment, SIEM, Linux, network securit y, and web security concepts throughout the development and testing of security workflows. Senior Marketing Head — Google Developer Group On Campus, FRCRCE
Lead marketing and promotional strategy for technical events, hackathons, and com munity initiatives for an 800+ member, 40+ event community. Manage social media campaigns, content strategy, and event promotions that drive registrations and engagement. Drive outreach, branding, and sponsorship initiatives for Bit N Build 2026, an intern ational hackathon spanning 200+ colleges across ~15 Indian states and universities in the UK, Germany, Canada, USA, and other countries. Public Relations, Documentation & Marketing Head — Game Developers Association
Promote GDA event s through public speaking, announcements, and community outreach. Manage social media content, including reels, posts, and stories, for events and club updates. Secure sponsorships and oversee overall marketing activities for the club

Projects & Production Builds
Strike Engi ne — AI - Powered Cybersecurity Platform Team Lead
Built an AI - powered cybersecurity platform integrating OSINT, automated reconnaissance, vulnerability assessment, SIEM, and web security modules to streamline threat detection and analysis. Led the project team across development, testing, and implementation.

Real - Time Bot Detection Engine (BotShield)
Designed and deployed a full - stack ML system in Python that analyzes session behavior to detect automated traffic in real time, including a synthetic traffic generator and an XGBoost classification model. Implemented a SAFE / CHALLENGED / BLOCKED verdict system with a FastAPI REST backend and a Vanilla JS, Chart.js - powered analytics dashboard.

NyaayaAI — AI Legal Assistant
Built an AI assistant that explains I ndian laws in plain language and gives citizens instant legal guidance, while helping lawyers with research, document drafting, and case summaries. Hangout App Developed a location - based hangout application using the Google Maps API to process real - time u ser locations, calculate optimal meetup points, and recommend nearby restaurants and entertainment venues. Focused on geospatial data handling and a responsive user interface

Technical & Core Skills
Tools: Soft
Languages: English, Hindi, Malayalam, German (Basic), Japanese (Basic)

CERTIFICATIONS & ACHIEVEMENTS
AWS Certified Cloud Practitioner
Google Associate Cloud Engineer
Google Cybersecurity Certificate
IBM AI Developer Certification
Introduction to Retrieval - Augmented Generation
Winner
PKP Mumbai Hackathon

Education
Fr. Conceicao Rodrigues College of Engineering (FRCRCE) — Computer Eng ineering 2024 — Present Nirmala Memorial Foundation College — Higher Secondary (Science) St. Francis School — ICSE (10th Grade)
      `.trim();

      const sections = ResumeStructuringService.structureResumeText(resume, "Johann Resume");

      // 1. Profile: Contact info is parsed as Personal Details; summary is parsed cleanly
      const personalDetails = sections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personalDetails).toBeDefined();
      expect(personalDetails!.bullets.some((b) => b.includes("9969394238"))).toBe(true);

      const summaryProfile = sections.find((s) => s.entryType === "profile" && s.title === "Professional Summary");
      expect(summaryProfile).toBeDefined();
      expect(summaryProfile!.bullets[0]).not.toContain("9969394238");
      expect(summaryProfile!.bullets[0]).toContain("Computer Engineering student in progress");
      expect(summaryProfile!.bullets[0]).toContain("Campus");
      expect(summaryProfile!.bullets[0]).toContain("leading");

      // 2. Experience: Exactly 3 separate roles
      const experiences = sections.filter((s) => s.entryType === "experience");
      expect(experiences.length).toBe(3);
      expect(experiences[0].title).toContain("Cybersecurity Intern");
      expect(experiences[0].organization).toContain("CyArt Tech LLP");
      expect(experiences[1].title).toContain("Senior Marketing Head");
      expect(experiences[1].organization).toContain("Google Developer Group On Campus");
      expect(experiences[2].title).toContain("Public Relations, Documentation & Marketing Head");
      expect(experiences[2].organization).toContain("Game Developers Association");

      // 3. Education: Exactly 3 distinct education entries
      const educations = sections.filter((s) => s.entryType === "education");
      expect(educations.length).toBe(3);
      expect(educations[0].organization).toContain("Fr. Conceicao Rodrigues College of Engineering");
      expect(educations[0].title).toContain("Computer Engineering");
      expect(educations[0].startDate).toBe("2024");
      expect(educations[0].isCurrent).toBe(true);

      expect(educations[1].organization).toContain("Nirmala Memorial Foundation College");
      expect(educations[1].title).toContain("Higher Secondary (Science)");

      expect(educations[2].organization).toContain("St. Francis School");
      expect(educations[2].title).toContain("ICSE (10th Grade)");

      // 4. Projects: Hangout App is separated from NyaayaAI
      const projects = sections.filter((s) => s.entryType === "project");
      expect(projects.length).toBeGreaterThanOrEqual(4);
      const projectTitles = projects.map((p) => p.title);
      expect(projectTitles.some((t) => t.includes("Hangout App"))).toBe(true);
      expect(projectTitles.some((t) => t.includes("NyaayaAI"))).toBe(true);
      expect(projectTitles.some((t) => t.includes("BotShield") || t.includes("Bot Detection"))).toBe(true);
      expect(projectTitles.some((t) => t.includes("Strike Engine"))).toBe(true);

      // 5. Certifications & Achievements: parsed as certifications and award
      const certs = sections.filter((s) => s.entryType === "certification");
      expect(certs.length).toBeGreaterThanOrEqual(4);
      expect(certs.some((c) => c.title.includes("AWS Certified"))).toBe(true);
      expect(certs.some((c) => c.title.includes("Google Associate Cloud Engineer"))).toBe(true);

      const awards = sections.filter((s) => s.entryType === "award");
      expect(awards.length).toBeGreaterThanOrEqual(1);
      expect(awards.some((a) => a.title.includes("PKP Mumbai Hackathon"))).toBe(true);
    });

    it("should accurately segment Scarlett Menezes's resume with clean personal details, distinct skills, separated experience/education, and decoupled achievements", () => {
      const scarlettResume = `
SCARLETT MENEZES • Third Year Computer Science and Engineering Student • Mumbai, India • +91 9921758998 • scarlettmenezes29@gmail.com • github.com/scarlettmenezes • linkedin.com/in/scarlett- menezes777 ABOUT ME  Passionate about building practical technology solutions for real-world problems.  Full-stack developer with experience in mobile apps, backend development, and AI / ML integration.  Quick learner, continuously exploring new technologies and frameworks

Projects & Production Builds
VyaparGuard — AI-Powered GST Assistant for Indian MSMEs  Built a voice-first GST assistant enabling MSMEs to ask tax queries in Hinglish, automate invoice filing via WhatsApp (image/PDF extraction), find correct HSN codes, and detect invalid bills to avoid wrongful ITC claims.

Aqua Setu — Offline-Capable Fish Identification & Quality App  Engineered an offline Android app for fishermen and inspectors to identify Indian fish species using on- device AI, assess freshness (Excellent/Good/Fair), estimate weight via image analysis, and maintain geotagged catch records with export support.

NourishNet — SaaS Platform for Urban Tiffin Services  Designed a dual-sided SaaS platform with a vendor dashboard and customer mobile app, featuring real- time delivery tracking, AI-powered route optimization (OR-Tools + Mapbox), predictive delay forecasting, and analytics for operations and customer feedback. ACHIEVEMENTS  Smart India Hackathon (SIH) 2025 — National Finalist out of 50,000+ registered teams.  Participated in 4+ hackathons early on, building full-stack & AI-based solutions under 24 — 36 hours constraints.  Won an 8-Hour hackathon conducted as a part of Pixels 2026, at SIES Nerul.

Technical & Core Skills
Languages
Python
JavaScript
TypeScript
Java
C / C++ Frontend / Mobile: React Native (Expo)
Flutter
HTML5
CSS3
Tailwind CSS
Next.js Backend / APIs: NestJS
FastAPI
Node.js
REST APIs
WebSockets
BullMQ + Redis Databases & Cloud: PostgreSQL
Firebase / Firestore
Prisma ORM
Google Cloud Run
Vercel Tools & Others: Git
GitHub
Figma
Twilio / WhatsApp Business API

Education
Fr. Conceicao Rodrigues College of Engineering (Fr. CRCE) B.Tech. in Computer Science & Engineering | 3 r d Y e a r | 2024 — Present EXPERIENCE PR & Media Lead - GDG CRCE May 2026 - Present  Creating and managing reels, promotional content, and social media campaigns for GDG CRCE events and initiatives.  Planning and executing event PR campaigns, including announcements, registration promotions, reminders, and post-event content.  Producing sponsor-focused reels and promotional creatives to highlight sponsors, partnerships, and event collaborations.  Coordinating with the technical, marketing, and organising teams to maintain consistent event branding and communication across platforms.  Managing event coverage and creating real-time content around workshops, hackathons, and chapter activities.
      `.trim();

      const sections = ResumeStructuringService.structureResumeText(scarlettResume, "Scarlett Resume");

      // 1. Personal Details: Extracted with phone, email, links, headline, and name
      const personalDetails = sections.find((s) => s.entryType === "profile" && s.title === "Personal Details");
      expect(personalDetails).toBeDefined();
      expect(personalDetails!.organization).toBe("SCARLETT MENEZES");
      expect(personalDetails!.location).toBe("Mumbai, India");
      expect(personalDetails!.bullets.some((b) => b.includes("scarlettmenezes29@gmail.com"))).toBe(true);
      expect(personalDetails!.bullets.some((b) => b.includes("9921758998"))).toBe(true);
      expect(personalDetails!.bullets.some((b) => b.includes("github.com/scarlettmenezes"))).toBe(true);
      expect(personalDetails!.bullets.some((b) => b.includes("linkedin.com/in/scarlett-menezes777"))).toBe(true);

      // 2. Professional Summary: Clean summary bullets WITHOUT candidate contact details
      const summaryProfile = sections.find((s) => s.entryType === "profile" && s.title === "Professional Summary");
      expect(summaryProfile).toBeDefined();
      expect(summaryProfile!.bullets.some((b) => b.includes("Passionate about building"))).toBe(true);
      expect(summaryProfile!.bullets.some((b) => b.includes("Full-stack developer"))).toBe(true);
      expect(summaryProfile!.bullets.some((b) => b.includes("Quick learner"))).toBe(true);
      for (const bullet of summaryProfile!.bullets) {
        expect(bullet).not.toContain("scarlettmenezes29@gmail.com");
        expect(bullet).not.toContain("9921758998");
        expect(bullet).not.toContain("github.com");
        expect(bullet).not.toContain("linkedin.com");
      }

      // 3. Work Experience: GDG CRCE role decoupled from Education
      const experiences = sections.filter((s) => s.entryType === "experience");
      expect(experiences.length).toBeGreaterThanOrEqual(1);
      const gdgRole = experiences.find((e) => e.organization?.includes("GDG CRCE") || e.title.includes("PR & Media Lead"));
      expect(gdgRole).toBeDefined();
      expect(gdgRole!.title).toContain("PR & Media Lead");
      expect(gdgRole!.bullets.length).toBeGreaterThanOrEqual(3);
      expect(gdgRole!.bullets.some((b) => b.includes("Creating and managing reels"))).toBe(true);

      // 4. Education: Fr. CRCE degree decoupled from Experience
      const educations = sections.filter((s) => s.entryType === "education");
      expect(educations.length).toBeGreaterThanOrEqual(1);
      const frcrce = educations.find((e) => e.organization?.includes("Fr. Conceicao Rodrigues") || e.title.includes("B.Tech"));
      expect(frcrce).toBeDefined();
      expect(frcrce!.title).toContain("B.Tech");
      expect(frcrce!.startDate).toBe("2024");
      expect(frcrce!.isCurrent).toBe(true);

      // 5. Technical & Core Skills: Separated into distinct skill groups instead of lumping into Languages
      const skillGroups = sections.filter((s) => s.entryType === "skill_group");
      expect(skillGroups.length).toBeGreaterThanOrEqual(4);
      const skillTitles = skillGroups.map((g) => g.title.toLowerCase());
      expect(skillTitles.some((t) => t.includes("languages"))).toBe(true);
      expect(skillTitles.some((t) => t.includes("frontend") || t.includes("mobile"))).toBe(true);
      expect(skillTitles.some((t) => t.includes("backend") || t.includes("api"))).toBe(true);
      expect(skillTitles.some((t) => t.includes("database") || t.includes("cloud"))).toBe(true);

      const langGroup = skillGroups.find((g) => g.title.toLowerCase().includes("languages"));
      expect(langGroup!.bullets).toContain("Python");
      expect(langGroup!.bullets).not.toContain("React Native (Expo)");

      const feGroup = skillGroups.find((g) => g.title.toLowerCase().includes("frontend"));
      expect(feGroup!.bullets.some((b) => b.includes("React Native"))).toBe(true);

      // 6. Projects & Production Builds: Exactly 3 projects with clean titles
      const projects = sections.filter((s) => s.entryType === "project");
      expect(projects.length).toBe(3);
      const projTitles = projects.map((p) => p.title);
      expect(projTitles.some((t) => t.includes("VyaparGuard"))).toBe(true);
      expect(projTitles.some((t) => t.includes("Aqua Setu"))).toBe(true);
      expect(projTitles.some((t) => t.includes("NourishNet"))).toBe(true);

      // NourishNet project does NOT swallow ACHIEVEMENTS
      const nourishNet = projects.find((p) => p.title.includes("NourishNet"));
      expect(nourishNet).toBeDefined();
      expect(nourishNet!.title).not.toContain("ACHIEVEMENTS");
      expect(nourishNet!.bullets.every((b) => !b.includes("Smart India Hackathon"))).toBe(true);

      // 7. Achievements & Awards: Decoupled into distinct award items
      const awards = sections.filter((s) => s.entryType === "award");
      expect(awards.length).toBeGreaterThanOrEqual(2);
      expect(awards.some((a) => a.title.includes("Smart India Hackathon"))).toBe(true);
      expect(awards.some((a) => a.title.includes("Pixels 2026") || a.title.includes("8-Hour hackathon"))).toBe(true);
    });
  });
});

