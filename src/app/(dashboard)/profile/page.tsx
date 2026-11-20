"use client";

import React, { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleAlert,
  ContactRound,
  Github,
  Globe2,
  Linkedin,
  MapPin,
  Phone,
  Save,
  Briefcase,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

type ProfileFields = {
  displayName: string;
  field: string;
  headline: string;
  contactEmail: string;
  phone: string;
  location: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  accountEmail: string;
};

const emptyProfile: ProfileFields = {
  displayName: "",
  field: "Software Engineering & Systems",
  headline: "",
  contactEmail: "",
  phone: "",
  location: "",
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  accountEmail: "",
};

const targetFields = [
  "Software Engineering & Systems",
  "Full Stack Web Development",
  "Frontend & UI/UX Engineering",
  "Backend & Cloud Infrastructure",
  "AI / Machine Learning & Data Science",
  "Mobile App Development (iOS / Android)",
  "Cybersecurity & DevSecOps",
  "Product Management & Strategy",
  "Data Analytics & Business Intelligence",
  "Other / Custom Field",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFields>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/me", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Couldn’t load your profile.");
        if (!active) return;

        // Extract field from headline or default
        let detectedField = "Software Engineering & Systems";
        let pureHeadline = body.headline || "";
        if (pureHeadline.includes("·")) {
          const parts = pureHeadline.split("·");
          const candidate = parts[0].trim();
          if (targetFields.includes(candidate)) {
            detectedField = candidate;
            pureHeadline = parts.slice(1).join("·").trim();
          }
        }

        setProfile({
          displayName: body.displayName || "",
          field: detectedField,
          headline: pureHeadline || body.headline || "",
          contactEmail: body.contactEmail || "",
          phone: body.phone || "",
          location: body.location || "",
          githubUrl: body.githubUrl || "",
          linkedinUrl: body.linkedinUrl || "",
          portfolioUrl: body.portfolioUrl || "",
          accountEmail: body.accountEmail || "",
        });
      })
      .catch((error) => {
        if (active) setMessage({ type: "error", text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (key: keyof ProfileFields, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    // Save field prefixed to headline so parser & tailoring services see it
    const combinedHeadline = profile.field
      ? `${profile.field}${profile.headline ? ` · ${profile.headline}` : ""}`
      : profile.headline;

    try {
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName.trim() || undefined,
          headline: combinedHeadline.slice(0, 160) || undefined,
          contactEmail: profile.contactEmail.trim() || undefined,
          phone: profile.phone.trim() || undefined,
          location: profile.location.trim() || undefined,
          githubUrl: profile.githubUrl.trim() || undefined,
          linkedinUrl: profile.linkedinUrl.trim() || undefined,
          portfolioUrl: profile.portfolioUrl.trim() || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Couldn’t save your profile.");

      setMessage({ type: "success", text: "Profile and career field saved successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Couldn’t save your profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[rgba(16,36,28,0.17)] pb-5">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#a98452]">
          CANDIDATE IDENTITY · PROFILE &amp; FOCUS
        </span>
        <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#10241c]">
          Your Profile &amp; Career Field
        </h2>
        <p className="mt-1.5 max-w-[65ch] text-[13.5px] leading-relaxed text-[#536259]">
          Fill in your contact information and primary specialization. When you tailor a resume, these details format your document headers automatically and align keywords with your discipline.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2.5 rounded border p-3.5 text-[13px] ${
            message.type === "success"
              ? "border-[#315849]/40 bg-[#dce5df] text-[#315849]"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {message.type === "success" ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Form */}
        <section className="target-panel lg:col-span-8">
          <form onSubmit={save} className="space-y-5">
            {/* Identity & Field */}
            <div>
              <div className="panel-title mb-4">
                <div>
                  <span>CORE DETAILS</span>
                  <h3>Identity &amp; Target Discipline</h3>
                </div>
                <Briefcase className="h-4 w-4 text-[#a98452]" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => update("displayName", e.target.value)}
                    placeholder="e.g. Abhishek K."
                    required
                    className="w-full h-10 px-3.5 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13.5px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Target Field / Industry
                  </label>
                  <select
                    value={profile.field}
                    onChange={(e) => update("field", e.target.value)}
                    className="w-full h-10 px-3 text-[13px] rounded border border-[rgba(16,36,28,0.2)] bg-white text-[#10241c] focus:outline-none focus:border-[#a98452]"
                  >
                    {targetFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Professional Headline or Focus
                  </label>
                  <input
                    type="text"
                    value={profile.headline}
                    onChange={(e) => update("headline", e.target.value)}
                    placeholder="e.g. Computer Engineering Student · Full Stack & AI Systems"
                    maxLength={120}
                    className="w-full h-10 px-3.5 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13.5px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="pt-4 border-t border-[rgba(16,36,28,0.12)]">
              <div className="panel-title mb-4">
                <div>
                  <span>CONTACT HEADERS</span>
                  <h3>Resume Contact Information</h3>
                </div>
                <ContactRound className="h-4 w-4 text-[#a98452]" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Resume Email
                  </label>
                  <input
                    type="email"
                    value={profile.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-10 px-3.5 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13.5px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#7d847f]" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 pl-9 pr-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13.5px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[#7d847f]" />
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder="Pune, India"
                      className="w-full h-10 pl-9 pr-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13.5px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Links & Profiles */}
            <div className="pt-4 border-t border-[rgba(16,36,28,0.12)]">
              <div className="panel-title mb-4">
                <div>
                  <span>PUBLIC PROFILES</span>
                  <h3>Online Presence &amp; Portfolio</h3>
                </div>
                <Globe2 className="h-4 w-4 text-[#a98452]" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    LinkedIn URL
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-[#7d847f]" />
                    <input
                      type="url"
                      value={profile.linkedinUrl}
                      onChange={(e) => update("linkedinUrl", e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full h-10 pl-9 pr-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    GitHub URL
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3 top-2.5 h-4 w-4 text-[#7d847f]" />
                    <input
                      type="url"
                      value={profile.githubUrl}
                      onChange={(e) => update("githubUrl", e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full h-10 pl-9 pr-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wide text-[#10241c] mb-1.5">
                    Portfolio / Website
                  </label>
                  <div className="relative">
                    <Globe2 className="absolute left-3 top-2.5 h-4 w-4 text-[#7d847f]" />
                    <input
                      type="url"
                      value={profile.portfolioUrl}
                      onChange={(e) => update("portfolioUrl", e.target.value)}
                      placeholder="https://yourdomain.com"
                      className="w-full h-10 pl-9 pr-3 rounded border border-[rgba(16,36,28,0.2)] bg-white text-[13px] text-[#10241c] focus:outline-none focus:border-[#a98452]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-between border-t border-[rgba(16,36,28,0.12)]">
              <span className="font-mono text-[11px] text-[#7d847f]">
                Account sign-in: <strong>{profile.accountEmail || "signed in"}</strong>
              </span>

              <button
                type="submit"
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded bg-[#10241c] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#eee9df] hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-[3px_3px_0_#d8c49b] transition-all"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving profile..." : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Info Sidebar */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="vault-panel">
            <div className="panel-title">
              <div>
                <span>DISCIPLINE ALIGNMENT</span>
                <h3>Why select your field?</h3>
              </div>
              <Sparkles className="h-4 w-4 text-[#a98452]" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#536259]">
              Choosing your target discipline helps the tailoring engine prioritize the right signals when analyzing job descriptions:
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[11.5px] text-[#384d43]">
              <li className="flex items-start gap-2">
                <span className="text-[#a98452]">✦</span>
                Prioritizes technical skills and tools matched to your domain.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#a98452]">✦</span>
                Structures bullet point emphasis (e.g. latency vs UI vs model accuracy).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#a98452]">✦</span>
                Suggests missing high-value project metrics for your field.
              </li>
            </ul>
          </div>

          <div className="vault-panel">
            <div className="panel-title">
              <div>
                <span>DATA INTEGRITY</span>
                <h3>Your details stay private</h3>
              </div>
              <ShieldCheck className="h-4 w-4 text-[#315849]" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#536259]">
              Your contact details are encrypted and private to your account. They are only included when you export or share a resume.
            </p>
            <Link
              href="/privacy"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#10241c] hover:text-[#a98452] transition-colors"
            >
              Read our Privacy Policy <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
