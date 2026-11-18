"use client";

import React, { useEffect, useState, use } from "react";
import { User, Briefcase, GraduationCap, Award, ShieldCheck, MapPin, AlertCircle } from "lucide-react";

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
          throw new Error("This candidate profile does not exist or has not published public records.");
        }
        return res.json();
      })
      .then((res) => {
        setData(res.data);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Loading public career portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {error || "The requested profile is not public."}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Resume Maker
          </a>
        </div>
      </div>
    );
  }

  const { user, portfolio } = data;
  const experienceEntries = portfolio.filter((p) => p.entryType === "experience");
  const educationEntries = portfolio.filter((p) => p.entryType === "education");
  const projectEntries = portfolio.filter((p) => p.entryType === "project" || p.entryType === "publication");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {user.fullName || `@${user.username}`}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Career Facts
                  </span>
                </div>
                {user.headline && (
                  <p className="text-base text-gray-600 font-medium mt-1">{user.headline}</p>
                )}
                {user.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {user.bio && (
            <p className="mt-6 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
              {user.bio}
            </p>
          )}
        </div>

        {/* Experience Timeline */}
        {experienceEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Verified Work Experience
            </h2>

            <div className="space-y-8">
              {experienceEntries.map((exp) => (
                <div key={exp.id} className="relative pl-6 border-l-2 border-blue-200">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-600" />
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{exp.title}</h3>
                    <span className="text-xs font-medium text-gray-500">
                      {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {exp.organization} {exp.location ? `• ${exp.location}` : ""}
                  </div>

                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1.5 text-xs text-gray-700 leading-relaxed">
                      {exp.bullets.map((b) => (
                        <li key={b.id}>{b.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {educationEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Education & Credentials
            </h2>

            <div className="space-y-6">
              {educationEntries.map((edu) => (
                <div key={edu.id}>
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{edu.title}</h3>
                    <span className="text-xs text-gray-500">{edu.startDate} – {edu.endDate}</span>
                  </div>
                  <div className="text-sm text-gray-600">{edu.organization}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Projects */}
        {projectEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-emerald-600" />
              Key Projects & Technical Works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectEntries.map((proj) => (
                <div key={proj.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-900">{proj.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{proj.organization}</p>
                  {proj.bullets && proj.bullets.length > 0 && (
                    <p className="text-xs text-gray-700 leading-relaxed">{proj.bullets[0].text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
