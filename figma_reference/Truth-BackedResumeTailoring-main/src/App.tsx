import { useEffect, useRef, useState } from "react";

type IconName =
  | "arrow"
  | "bank"
  | "briefcase"
  | "check"
  | "chevron"
  | "download"
  | "file"
  | "grid"
  | "lock"
  | "menu"
  | "plus"
  | "search"
  | "shield"
  | "spark"
  | "target"
  | "user";

const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  bank: (
    <>
      <path d="M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z" />
    </>
  ),
  briefcase: (
    <>
      <path d="M9 6V4h6v2m-8 0h10a2 2 0 0 1 2 2v10H5V8a2 2 0 0 1 2-2Zm-3 6h16M10 12v2h4v-2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6V2Z" />
      <path d="M14 2v5h5M9 12h6m-6 4h6" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="m15 9 5-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-5 3.4-7 8-7s7.2 2 8 7" />
    </>
  ),
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <button
      className={`logo ${inverse ? "logo-inverse" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Adaptive Resume home"
    >
      <span className="logo-mark">A</span>
      <span>
        Adaptive
        <br />
        Resume
      </span>
    </button>
  );
}

const roles = [
  {
    label: "Frontend Intern",
    company: "Razorpay",
    match: 92,
    color: "#a98452",
    skills: ["React", "TypeScript", "REST APIs"],
  },
  {
    label: "SDE I",
    company: "CRED",
    match: 84,
    color: "#6f8377",
    skills: ["JavaScript", "System design", "Git"],
  },
  {
    label: "Product Engineer",
    company: "Postman",
    match: 78,
    color: "#315849",
    skills: ["Node.js", "Analytics", "Ownership"],
  },
];

function ResumeSheet({
  roleIndex = 0,
  compact = false,
}: {
  roleIndex?: number;
  compact?: boolean;
}) {
  const role = roles[roleIndex];
  return (
    <div className={`resume-sheet ${compact ? "compact" : ""}`}>
      <div className="resume-top">
        <div>
          <strong>ARJUN MEHTA</strong>
          <span>B.Tech CSE · Pune, India</span>
        </div>
        <span className="match-pill" style={{ background: role.color }}>
          {role.match}% match
        </span>
      </div>
      <div className="resume-rule" />
      <p className="resume-role">
        TARGET · {role.label.toUpperCase()} @ {role.company.toUpperCase()}
      </p>
      <section>
        <b>EXPERIENCE & PROJECTS</b>
        <h4>
          Campus Marketplace <span>Full-stack project</span>
        </h4>
        <p>
          Built a student marketplace used by <mark>420+ students</mark>, improving listing
          discovery through a responsive React interface.
        </p>
        <p>
          Designed <mark>REST APIs</mark> and reduced average response time by 34% through query
          optimisation.
        </p>
      </section>
      <section>
        <b>SKILLS</b>
        <div className="sheet-skills">
          {role.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </section>
      <div className="evidence-note">
        <Icon name="shield" size={14} /> Every claim links to approved evidence
      </div>
    </div>
  );
}

function Landing({ openApp }: { openApp: () => void }) {
  const [role, setRole] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    let displayedProgress = 0;
    let targetProgress = 0;
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      const distance = targetProgress - displayedProgress;
      displayedProgress += distance * 0.105;
      gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));

      if (Math.abs(distance) > 0.0005) {
        frame = requestAnimationFrame(render);
      } else {
        displayedProgress = targetProgress;
        gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));
        frame = 0;
      }
    };

    const measure = () => {
      const rect = gallery.getBoundingClientRect();
      targetProgress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));

      if (reducedMotion) {
        displayedProgress = targetProgress;
        gallery.style.setProperty("--scroll-progress", displayedProgress.toFixed(4));
      } else if (!frame) {
        frame = requestAnimationFrame(render);
      }
    };

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    measure();

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="landing">
      <nav className="top-nav">
        <Logo />
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#how">How it works</a>
          <a href="#proof">Why truth-bound?</a>
          <a href="#privacy">Privacy</a>
        </div>
        <div className="nav-actions">
          <button className="text-button" onClick={openApp}>
            Log in
          </button>
          <button className="nav-cta" onClick={openApp}>
            Build my resume <Icon name="arrow" size={17} />
          </button>
        </div>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <Icon name="menu" />
        </button>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>Built for the job hunt</span>
            <span>Not the hype cycle</span>
          </div>
          <h1>
            One honest career.
            <br />
            <em>Every right version.</em>
          </h1>
          <p className="hero-lede">
            Turn your real projects, internships and skills into a resume that speaks directly to
            every job—without inventing a single thing.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={openApp}>
              Create my Career Vault <Icon name="arrow" />
            </button>
            <button className="secondary-button" onClick={openApp}>
              <Icon name="download" /> Import existing resume
            </button>
          </div>
          <p className="micro-trust">
            <Icon name="shield" size={15} /> Private by design · No credit card · Your facts stay
            yours
          </p>
        </div>
        <div className="hero-visual" aria-label="Resume tailoring example for an Indian graduate">
          <div className="visual-label">
            <span>LIVE EXAMPLE</span> ARJUN, 2025 GRAD · PUNE
          </div>
          <div className="job-card">
            <div className="company-mark">R</div>
            <div>
              <strong>Frontend Engineer Intern</strong>
              <span>Razorpay · Bengaluru</span>
            </div>
            <div className="job-match">
              92%<span>fit</span>
            </div>
          </div>
          <ResumeSheet />
          <div className="proof-tag proof-one">
            <Icon name="check" size={16} /> Verified project metric
          </div>
          <div className="proof-tag proof-two">
            <Icon name="spark" size={16} /> 6 keywords matched
          </div>
          <div className="orange-orbit" />
        </div>
        <div className="scroll-note">
          Scroll to see it adapt <span>↓</span>
        </div>
      </header>

      <section className="ticker" aria-label="Key benefits">
        <div>
          NO FAKE CLAIMS <span>✦</span> ATS-READY <span>✦</span> MADE FOR FRESHERS <span>✦</span>{" "}
          EVERY BULLET HAS PROOF <span>✦</span> YOUR DATA, NEVER SOLD <span>✦</span> NO FAKE CLAIMS
        </div>
      </section>

      <section className="gallery-section" ref={galleryRef} id="proof">
        <div className="gallery-sticky">
          <div className="gallery-copy">
            <span className="section-index">01 — ADAPT, DON'T INVENT</span>
            <h2>
              Your story stays true.
              <br />
              <em>The emphasis moves.</em>
            </h2>
            <p>
              One verified candidate profile becomes a precise resume for each role. Scroll to watch
              the same real experience change focus.
            </p>
          </div>
          <div className="scroll-gallery">
            {roles.map((item, index) => (
              <div className={`gallery-card card-${index}`} key={item.label}>
                <div className="gallery-role">
                  <span style={{ background: item.color }}>{index + 1}</span>
                  <div>
                    <b>{item.label}</b>
                    <small>{item.company} · Bengaluru</small>
                  </div>
                </div>
                <ResumeSheet roleIndex={index} compact />
              </div>
            ))}
          </div>
          <div className="scroll-meter">
            <span />
            <small>SCROLL TO TAILOR</small>
          </div>
        </div>
      </section>

      <div className="section-bridge" aria-hidden="true">
        <span>ONE VERIFIED FOUNDATION</span>
        <i />
        <b>THE THREE-STEP METHOD</b>
        <i />
        <span>THREE PRECISE APPLICATIONS</span>
      </div>

      <section className="steps-section" id="how">
        <div className="section-heading">
          <span className="section-index">02 — THE CORE LOOP</span>
          <h2>
            From scattered history
            <br />
            to a sharper application.
          </h2>
          <p>Three calm steps. No prompt engineering required.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card step-dark">
            <span className="step-num">01</span>
            <div className="icon-box">
              <Icon name="bank" />
            </div>
            <h3>
              Build your
              <br />
              Career Data Bank
            </h3>
            <p>
              Import an old resume or add projects, coursework and internships. You approve every
              fact we keep.
            </p>
            <div className="mini-vault">
              {["Zepto clone · Project", "TCS iON · Internship", "React · Skill"].map((x, i) => (
                <div key={x}>
                  <span className={`vault-dot d${i}`} />
                  {x}
                  <Icon name="check" size={15} />
                </div>
              ))}
            </div>
          </article>
          <article className="step-card step-yellow">
            <span className="step-num">02</span>
            <div className="icon-box">
              <Icon name="target" />
            </div>
            <h3>
              Target any
              <br />
              job listing
            </h3>
            <p>
              Paste a job description. See matched skills, missing keywords and your strongest
              evidence in seconds.
            </p>
            <div className="job-analysis">
              <div>
                <span>MATCH</span>
                <b>92%</b>
              </div>
              <div className="bars">
                <i />
                <i />
                <i />
                <i />
              </div>
              <small>Strong fit for Frontend Intern</small>
            </div>
          </article>
          <article className="step-card step-light">
            <span className="step-num">03</span>
            <div className="icon-box">
              <Icon name="file" />
            </div>
            <h3>
              Review, approve
              <br />& export
            </h3>
            <p>
              Trace every bullet back to a real fact. Edit the wording, approve, then export a clean
              ATS-ready PDF.
            </p>
            <div className="approved-bullet">
              <Icon name="shield" />
              <div>
                <span>EVIDENCE-LINKED</span>
                <p>Built React interface used by 420+ students.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="tailor-section">
        <div className="tailor-heading">
          <span className="section-index">03 — TRY THE SHIFT</span>
          <h2>
            Same candidate.
            <br />
            Different spotlight.
          </h2>
          <p>Choose a role to see which verified facts rise to the top.</p>
          <div className="role-tabs">
            {roles.map((item, i) => (
              <button
                key={item.label}
                onClick={() => setRole(i)}
                className={role === i ? "active" : ""}
              >
                {item.label}
                <span>{item.match}%</span>
              </button>
            ))}
          </div>
        </div>
        <div className="tailor-preview">
          <div className="analysis-rail">
            <span>ROLE SIGNALS</span>
            {roles[role].skills.map((skill, i) => (
              <div key={skill}>
                <b>{skill}</b>
                <div>
                  <i style={{ width: `${92 - i * 13}%`, background: roles[role].color }} />
                </div>
                <small>{92 - i * 8}%</small>
              </div>
            ))}
            <div className="truth-box">
              <Icon name="shield" />
              <p>
                <b>Truth-bound</b>
                <br />0 unsupported claims
              </p>
            </div>
          </div>
          <ResumeSheet roleIndex={role} />
        </div>
      </section>

      <section className="trust-section" id="privacy">
        <div className="trust-stamp">
          <Icon name="lock" size={32} />
          <span>
            PRIVATE
            <br />
            BY DEFAULT
          </span>
        </div>
        <div>
          <span className="section-index">04 — YOUR CAREER IS NOT OUR PRODUCT</span>
          <h2>
            Private career data.
            <br />
            Period.
          </h2>
        </div>
        <div className="trust-copy">
          <p>
            Your work history is deeply personal. We use it only to build the resumes you
            request—never to train public models, never to sell ads, never to hand off to
            recruiters.
          </p>
          <div>
            <span>
              <Icon name="check" size={16} /> Encrypted
            </span>
            <span>
              <Icon name="check" size={16} /> Export anytime
            </span>
            <span>
              <Icon name="check" size={16} /> Delete in one click
            </span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="cta-star">✦</div>
        <span>YOUR NEXT APPLICATION DESERVES BETTER</span>
        <h2>
          Stop rewriting.
          <br />
          <em>Start applying.</em>
        </h2>
        <p>
          Build your Career Vault once. Walk into every application with the right story—and the
          proof to back it.
        </p>
        <button className="primary-button light" onClick={openApp}>
          Create my Career Vault <Icon name="arrow" />
        </button>
      </section>

      <footer>
        <Logo inverse />
        <p>
          Made for ambitious starts.
          <br />
          Built in India, for everywhere.
        </p>
        <div>
          <a href="#how">Product</a>
          <a href="#privacy">Privacy</a>
          <button onClick={openApp}>Log in</button>
        </div>
        <span>© 2025 Adaptive Resume</span>
      </footer>
    </main>
  );
}

function Dashboard({ goHome }: { goHome: () => void }) {
  const [jobText, setJobText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const fileRef = useRef<HTMLInputElement>(null);

  function analyze() {
    if (jobText.trim().length > 20) setAnalyzed(true);
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Logo inverse />
        <nav>
          {[
            ["Overview", "grid"],
            ["Career Vault", "bank"],
            ["Target a job", "target"],
            ["My resumes", "file"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={activeNav === label ? "active" : ""}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon as IconName} />
              {label}
              {label === "Career Vault" && <small>14</small>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="vault-health">
            <div>
              <span>VAULT HEALTH</span>
              <b>82%</b>
            </div>
            <i>
              <em />
            </i>
            <p>Add 2 project metrics to improve your matches.</p>
          </div>
          <button onClick={goHome}>
            <Icon name="chevron" size={17} /> View landing page
          </button>
          <button>
            <Icon name="user" size={17} /> Settings
          </button>
        </div>
      </aside>
      <section className="dash-main">
        <header className="dash-top">
          <div>
            <span>MONDAY, 12 MAY</span>
            <h1>Good morning, Arjun.</h1>
          </div>
          <div className="dash-actions">
            <button aria-label="Search">
              <Icon name="search" />
            </button>
            <button className="avatar">AM</button>
          </div>
        </header>

        <div className="dash-content">
          <div className="welcome-card">
            <div>
              <span>CAREER VAULT · 14 VERIFIED FACTS</span>
              <h2>
                Your experience is ready.
                <br />
                <em>Where are we applying?</em>
              </h2>
              <p>Paste a job description and we’ll find your strongest, most relevant evidence.</p>
            </div>
            <button onClick={() => document.getElementById("job-input")?.focus()}>
              Tailor a new resume <Icon name="arrow" />
            </button>
            <div className="welcome-graphic">
              <span>14</span>
              <small>TRUTHS</small>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="target-panel">
              <div className="panel-title">
                <div>
                  <span>QUICK START</span>
                  <h3>Target a job</h3>
                </div>
                <Icon name="target" />
              </div>
              {!analyzed ? (
                <>
                  <textarea
                    id="job-input"
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    placeholder="Paste the job description here…&#10;&#10;Tip: include responsibilities and requirements for a more precise match."
                  />
                  <div className="input-footer">
                    <span>{jobText.length} characters</span>
                    <button className={jobText.trim().length > 20 ? "ready" : ""} onClick={analyze}>
                      Analyse role <Icon name="spark" size={17} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="analysis-result">
                  <div className="result-score">
                    <span>92</span>
                    <small>
                      %<br />
                      MATCH
                    </small>
                  </div>
                  <div>
                    <span>STRONG MATCH</span>
                    <h3>Frontend Engineer Intern</h3>
                    <p>6 skills matched · 3 strong evidence points found</p>
                  </div>
                  <button
                    onClick={() => {
                      setAnalyzed(false);
                      setJobText("");
                    }}
                  >
                    Start over
                  </button>
                  <button className="create-resume">
                    Create tailored resume <Icon name="arrow" size={17} />
                  </button>
                </div>
              )}
            </section>

            <section className="vault-panel">
              <div className="panel-title">
                <div>
                  <span>YOUR FOUNDATION</span>
                  <h3>Career Vault</h3>
                </div>
                <button onClick={() => fileRef.current?.click()}>
                  <Icon name="plus" size={17} /> Add fact
                </button>
              </div>
              <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx" />
              <div className="vault-stats">
                <div>
                  <b>5</b>
                  <span>Skills</span>
                </div>
                <div>
                  <b>3</b>
                  <span>Projects</span>
                </div>
                <div>
                  <b>2</b>
                  <span>Roles</span>
                </div>
                <div>
                  <b>4</b>
                  <span>Metrics</span>
                </div>
              </div>
              <div className="fact-row">
                <span className="fact-icon orange">
                  <Icon name="briefcase" size={17} />
                </span>
                <div>
                  <b>Campus Marketplace</b>
                  <small>Project · 4 verified facts</small>
                </div>
                <span className="verified">
                  <Icon name="check" size={13} /> Verified
                </span>
              </div>
              <div className="fact-row">
                <span className="fact-icon purple">
                  <Icon name="briefcase" size={17} />
                </span>
                <div>
                  <b>TCS iON Internship</b>
                  <small>Experience · 3 verified facts</small>
                </div>
                <span className="verified">
                  <Icon name="check" size={13} /> Verified
                </span>
              </div>
              <button className="view-all" onClick={() => setActiveNav("Career Vault")}>
                Open Career Vault <Icon name="arrow" size={17} />
              </button>
            </section>
          </div>

          <section className="recent-section">
            <div className="recent-head">
              <div>
                <span>RECENT WORK</span>
                <h3>Your resumes</h3>
              </div>
              <button>
                View all <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="resume-list">
              <div className="resume-item">
                <div className="mini-doc">
                  <span />
                </div>
                <div>
                  <b>Frontend Intern · Razorpay</b>
                  <small>Edited 2 hours ago · Bengaluru</small>
                </div>
                <span className="score high">92% match</span>
                <span className="status draft">Draft</span>
                <button aria-label="Open resume">
                  <Icon name="chevron" />
                </button>
              </div>
              <div className="resume-item">
                <div className="mini-doc lilac">
                  <span />
                </div>
                <div>
                  <b>SDE I · CRED</b>
                  <small>Exported yesterday · Bengaluru</small>
                </div>
                <span className="score">84% match</span>
                <span className="status exported">Exported</span>
                <button aria-label="Open resume">
                  <Icon name="chevron" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"landing" | "app">(() =>
    window.location.hash === "#app" ? "app" : "landing",
  );

  function changeView(next: "landing" | "app") {
    setView(next);
    window.location.hash = next === "app" ? "app" : "";
    window.scrollTo(0, 0);
  }

  return view === "landing" ? (
    <Landing openApp={() => changeView("app")} />
  ) : (
    <Dashboard goHome={() => changeView("landing")} />
  );
}
