"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleAlert, ContactRound, Github, Globe2, Linkedin, MapPin, Phone, Save } from "lucide-react";

type ProfileFields = {
  displayName: string;
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
  displayName: "", headline: "", contactEmail: "", phone: "", location: "",
  githubUrl: "", linkedinUrl: "", portfolioUrl: "", accountEmail: "",
};

const fields: Array<{ key: keyof Omit<ProfileFields, "accountEmail">; label: string; placeholder: string; type?: string; icon?: typeof Phone }> = [
  { key: "displayName", label: "Name", placeholder: "How your name should appear" },
  { key: "headline", label: "Professional headline", placeholder: "Product designer with a focus on research and systems" },
  { key: "contactEmail", label: "Resume email", placeholder: "name@example.com", type: "email", icon: ContactRound },
  { key: "phone", label: "Phone", placeholder: "+1 555 012 3456", type: "tel", icon: Phone },
  { key: "location", label: "Location", placeholder: "Portland, OR", icon: MapPin },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/yourname", type: "url", icon: Github },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname", type: "url", icon: Linkedin },
  { key: "portfolioUrl", label: "Portfolio or website", placeholder: "https://yourwebsite.com", type: "url", icon: Globe2 },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
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
        setProfile({
          displayName: body.displayName || "", headline: body.headline || "",
          contactEmail: body.contactEmail || "", phone: body.phone || "",
          location: body.location || "", githubUrl: body.githubUrl || "",
          linkedinUrl: body.linkedinUrl || "", portfolioUrl: body.portfolioUrl || "",
          accountEmail: body.accountEmail || "",
        });
      })
      .catch((error) => { if (active) setMessage({ type: "error", text: error.message }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key: keyof ProfileFields, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fields.map(({ key }) => [key, profile[key]]))),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Couldn’t save your profile.");
      setProfile((current) => ({ ...current, accountEmail: body.accountEmail || current.accountEmail }));
      setMessage({ type: "success", text: "Your resume details are saved." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Couldn’t save your profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="proof-page profile-page">
      <div className="proof-page-heading">
        <div>
          <h1>Profile</h1>
          <p className="proof-page-intro">Add the details you want ready when you make a resume.</p>
        </div>
        <Link href="/bank/intake" className="proof-text-link">Add a resume to your Data Bank <ArrowUpRight size={16} /></Link>
      </div>

      <div className="profile-layout">
        <form className="proof-form profile-form" onSubmit={save}>
          <div className="proof-form-heading">
            <div><h2>Resume details</h2><p>These details can appear on the resumes you create.</p></div>
            <span className="profile-section-icon"><ContactRound size={19} /></span>
          </div>

          {loading ? (
            <p className="proof-loading" role="status">Loading your details…</p>
          ) : (
            <>
              <div className="proof-field-grid">
                {fields.map(({ key, label, placeholder, type = "text", icon: Icon }) => (
                  <label className={`proof-field ${key === "headline" ? "proof-field-wide" : ""}`} key={key}>
                    <span>{label}</span>
                    <div className="proof-input-wrap">
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      <input
                        type={type}
                        value={profile[key]}
                        onChange={(event) => update(key, event.target.value)}
                        placeholder={placeholder}
                        maxLength={key === "headline" ? 160 : key === "phone" ? 50 : 500}
                        autoComplete={key === "contactEmail" ? "email" : key === "phone" ? "tel" : "off"}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="profile-account-note">
                <span>Sign-in email</span>
                <strong>{profile.accountEmail || "Loading account email…"}</strong>
                <p>This is used to sign in. Change the email shown on resumes above.</p>
              </div>

              <div className="proof-form-actions">
                {message && <p className={`proof-form-message ${message.type}`} role="status">
                  {message.type === "success" ? <CircleCheck size={16} /> : <CircleAlert size={16} />}{message.text}
                </p>}
                <button className="proof-primary-button" type="submit" disabled={loading || saving}>
                  <Save size={16} /> {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </>
          )}
        </form>

        <aside className="profile-side-note">
          <span className="profile-note-mark" aria-hidden="true" />
          <h2>Your details stay yours.</h2>
          <p>Your contact information is private to your account. It’s included only in resumes you choose to create and share.</p>
          <Link href="/settings/privacy">Review privacy settings <ArrowUpRight size={15} /></Link>
        </aside>
      </div>
    </div>
  );
}
