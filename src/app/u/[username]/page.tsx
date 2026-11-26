"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface PublicProfileData {
  user: {
    id: string;
    username: string;
    fullName?: string;
    headline?: string;
    bio?: string;
    location?: string;
    createdAt: string;
  };
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

export default function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/public/u/${username}`)
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
  }, [username]);

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

  const { user, portfolio } = data;
  const experienceEntries = portfolio.filter((p) => p.entryType === "experience");
  const educationEntries = portfolio.filter((p) => p.entryType === "education");
  const projectEntries = portfolio.filter(
    (p) => p.entryType === "project" || p.entryType === "publication"
  );

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="border-b border-ink pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h1 className="font-display text-[clamp(2rem,5vw,2.9rem)] font-semibold leading-none tracking-tightest">
              {user.fullName || `@${user.username}`}
            </h1>
            <p className="font-mono text-[10.5px] text-graphite">public record · facts only</p>
          </div>

          {user.headline && (
            <p className="mt-3 text-[15px] leading-relaxed text-graphite">{user.headline}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-graphite">
            {user.location && <span>{user.location}</span>}
            <span className="font-mono text-[11px]">@{user.username}</span>
          </div>

          {user.bio && (
            <p className="mt-5 max-w-[68ch] text-[13.5px] leading-relaxed text-ink">{user.bio}</p>
          )}
        </header>

        <div className="mt-10 space-y-10">
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
