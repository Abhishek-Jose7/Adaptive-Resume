"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, ShieldCheck, ExternalLink } from "lucide-react";

interface DomainSkillGroup {
  domain: string;
  skills: Array<{
    name: string;
    evidenceCount: number;
    source: "career_graph" | "skill_group";
  }>;
}

interface PublicProfileData {
  user: {
    id: string;
    username: string;
    fullName?: string;
    headline?: string;
    bio?: string;
    location?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    portfolioViews?: number;
    createdAt: string;
  };
  theme?: "editorial" | "modern" | "minimal";
  showViewCounters?: boolean;
  domainSkillBadges?: DomainSkillGroup[];
  portfolio: Array<{
    id: string;
    entryType: string;
    title?: string;
    organization?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    descriptionContext?: string;
    bullets: Array<{ id: string; text: string }>;
  }>;
}

const THEME_STYLES: Record<
  "editorial" | "modern" | "minimal",
  {
    wrapper: string;
    headerBorder: string;
    headingFont: string;
    badge: string;
    card: string;
  }
> = {
  editorial: {
    wrapper: "min-h-screen bg-paper text-ink",
    headerBorder: "border-b border-ink pb-6",
    headingFont: "font-display",
    badge: "border border-press/30 bg-press-soft text-press",
    card: "border-t border-rule pt-4",
  },
  modern: {
    wrapper: "min-h-screen bg-[#f4f7f5] text-[#0f241d]",
    headerBorder: "border-b-2 border-[#315849] pb-6",
    headingFont: "font-sans",
    badge: "border border-[#315849]/30 bg-white text-[#1e3a2f]",
    card: "rounded-lg border border-[#becbbf] bg-white p-4",
  },
  minimal: {
    wrapper: "min-h-screen bg-white text-black",
    headerBorder: "border-b border-black pb-6",
    headingFont: "font-mono",
    badge: "border border-black bg-white text-black",
    card: "border-b border-gray-200 pb-4",
  },
};

export default function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const themeQuery = searchParams.get("theme");

  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (isPreview) query.set("preview", "1");
    if (themeQuery) query.set("theme", themeQuery);
    const qs = query.toString();

    fetch(`/api/v1/public/u/${username}${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("This profile does not exist or has not published public records.");
        }
        return res.json();
      })
      .then((res) => {
        setData(res?.data ?? res);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username, isPreview, themeQuery]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <p className="text-[13px] text-graphite">Opening the record</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <div className="plate w-full max-w-md p-6">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-alarm" strokeWidth={1.8} />
            <h2 className="font-display text-[18px] font-semibold tracking-tight">Profile not found</h2>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-graphite">
            {error || "The requested profile is not public."}
          </p>
          <Link href="/" className="btn mt-4">
            Go to Adaptive Resume
          </Link>
        </div>
      </div>
    );
  }

  const { user, portfolio, domainSkillBadges = [] } = data;
  const activeTheme = data.theme && THEME_STYLES[data.theme] ? data.theme : "editorial";
  const themeStyle = THEME_STYLES[activeTheme];

  const experienceEntries = portfolio.filter((p) => p.entryType === "experience");
  const educationEntries = portfolio.filter((p) => p.entryType === "education");
  const projectEntries = portfolio.filter(
    (p) => p.entryType === "project" || p.entryType === "publication"
  );

  return (
    <div className={themeStyle.wrapper}>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {isPreview && (
          <div className="mb-4 flex items-center justify-between border border-stamp/40 bg-stamp-soft px-3 py-2 text-[11.5px] text-ink">
            <span>Owner Preview Mode · Theme: <strong>{activeTheme}</strong> (views not counted)</span>
            <Link href="/profile" className="font-medium text-stamp hover:underline">
              Back to Profile
            </Link>
          </div>
        )}

        <header className={themeStyle.headerBorder}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h1 className={`${themeStyle.headingFont} text-[clamp(2rem,5vw,2.9rem)] font-semibold leading-none tracking-tightest`}>
              {user.fullName || `@${user.username}`}
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10.5px] text-graphite">
              <span>public record · facts only</span>
              {data.showViewCounters && typeof user.portfolioViews === "number" && (
                <span className="inline-flex items-center gap-1 rounded border border-rule bg-sheet px-2 py-0.5 text-ink">
                  <Eye className="h-3 w-3" />
                  {user.portfolioViews} views
                </span>
              )}
            </div>
          </div>

          {user.headline && (
            <p className="mt-3 text-[15px] leading-relaxed text-graphite">{user.headline}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-graphite">
            {user.location && <span>{user.location}</span>}
            <span className="font-mono text-[11px]">@{user.username}</span>
            {user.githubUrl && (
              <a href={user.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stamp hover:underline">
                GitHub <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {user.linkedinUrl && (
              <a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stamp hover:underline">
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {user.portfolioUrl && (
              <a href={user.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stamp hover:underline">
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {user.bio && (
            <p className="mt-5 max-w-[68ch] text-[13.5px] leading-relaxed text-ink">{user.bio}</p>
          )}
        </header>

        <div className="mt-10 space-y-10">
          {domainSkillBadges.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="rule-label text-[12px]">verified skills by domain</h2>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-graphite">
                  <ShieldCheck className="h-3 w-3 text-press" /> derived from career graph
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {domainSkillBadges.map((group) => (
                  <div key={group.domain} className={themeStyle.card}>
                    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-graphite mb-2">
                      {group.domain}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => (
                        <span
                          key={skill.name}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11.5px] font-medium ${themeStyle.badge}`}
                        >
                          {skill.name}
                          {skill.evidenceCount > 1 && (
                            <span className="font-mono text-[10px] opacity-75">
                              ×{skill.evidenceCount}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {experienceEntries.length > 0 && (
            <section>
              <h2 className="rule-label mb-4 text-[12px]">experience</h2>
              <div className="space-y-7">
                {experienceEntries.map((exp) => (
                  <article key={exp.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr] sm:gap-6">
                    <p className="font-mono text-[11px] text-graphite">
                      {exp.startDate} — {exp.isCurrent ? "present" : exp.endDate || "present"}
                    </p>
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">{exp.title}</h3>
                      <p className="mt-0.5 text-[12.5px] text-graphite">
                        {exp.organization}
                        {exp.location ? ` · ${exp.location}` : ""}
                      </p>

                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {exp.bullets.map((b) => (
                            <li key={b.id} className="flex gap-2.5 text-[13px] leading-relaxed">
                              <span className="mt-2 h-px w-2.5 shrink-0 bg-rule-strong" />
                              <span>{b.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {projectEntries.length > 0 && (
            <section>
              <h2 className="rule-label mb-4 text-[12px]">projects and publications</h2>
              <ul className="divide-y divide-rule">
                {projectEntries.map((proj) => (
                  <li key={proj.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[14px] font-semibold tracking-tight">{proj.title}</h3>
                      {proj.organization && (
                        <span className="text-[12px] text-graphite">{proj.organization}</span>
                      )}
                    </div>
                    {proj.bullets && proj.bullets.length > 0 && (
                      <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-graphite">
                        {proj.bullets[0].text}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {educationEntries.length > 0 && (
            <section>
              <h2 className="rule-label mb-4 text-[12px]">education</h2>
              <ul className="divide-y divide-rule">
                {educationEntries.map((edu) => (
                  <li key={edu.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <div>
                      <h3 className="text-[14px] font-semibold tracking-tight">{edu.title}</h3>
                      <p className="text-[12.5px] text-graphite">{edu.organization}</p>
                    </div>
                    <span className="font-mono text-[11px] text-graphite">
                      {edu.startDate} — {edu.endDate}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="mt-12 border-t border-rule pt-4">
          <Link href="/" className="text-[11.5px] text-graphite hover:text-ink">
            Built with Adaptive Resume
          </Link>
        </footer>
      </div>
    </div>
  );
}
