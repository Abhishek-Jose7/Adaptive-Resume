"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { FigmaIcon, FigmaIconName, FigmaLogo } from "@/components/ui/FigmaIcon";

const navItems: Array<{
  label: string;
  href: string;
  icon: FigmaIconName;
  badge?: boolean;
}> = [
  { label: "Overview", href: "/", icon: "grid" },
  { label: "Career Vault", href: "/bank", icon: "bank", badge: true },
  { label: "Add experience", href: "/bank/intake", icon: "plus" },
  { label: "Target a job", href: "/jobs", icon: "target" },
  { label: "My resumes", href: "/resumes", icon: "file" },
  { label: "Applications", href: "/applications", icon: "briefcase" },
  { label: "Cover letters", href: "/cover-letters", icon: "file" },
  { label: "AI settings", href: "/settings/providers", icon: "spark" },
  { label: "Profile", href: "/profile", icon: "user" },
];

function isRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/bank") return pathname === "/bank";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const [factCount, setFactCount] = useState<number>(14);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/v1/bank/entries?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          const total = data.items.reduce(
            (acc: number, entry: { bullets?: Array<unknown> }) =>
              acc + (entry.bullets?.length || 1),
            0,
          );
          if (total > 0) setFactCount(total);
        }
      })
      .catch(() => {});
  }, []);

  const now = new Date();
  const dateStr = mounted
    ? now
        .toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })
        .toUpperCase()
    : "TODAY";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  return (
    <div className="dashboard">
      {/* Figma Sidebar */}
      <aside className="sidebar">
        <FigmaLogo inverse onClick={() => {}} />

        <nav aria-label="Sidebar navigation">
          {navItems.map(({ label, href, icon, badge }) => {
            const active = isRouteActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <FigmaIcon name={icon} size={18} />
                <span>{label}</span>
                {badge && <small>{factCount}</small>}
              </Link>
            );
          })}
        </nav>

        <div className="side-bottom">
          <div className="vault-health">
            <div>
              <span>VAULT HEALTH</span>
              <b>82%</b>
            </div>
            <i>
              <em style={{ width: "82%" }} />
            </i>
            <p>Add 2 project metrics to improve your matches.</p>
          </div>

          <Link href="/">
            <FigmaIcon name="chevron" size={17} />
            <span>View landing page</span>
          </Link>
          <Link href="/profile">
            <FigmaIcon name="user" size={17} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="dash-main">
        {/* Top Header */}
        <header className="dash-top">
          <div>
            <span>{dateStr}</span>
            <h1>
              {greeting}, {firstName}.
            </h1>
          </div>
          <div className="dash-actions">
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                const el = document.getElementById("job-input");
                el?.focus();
              }}
            >
              <FigmaIcon name="search" size={18} />
            </button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-[39px] h-[39px] rounded-full border border-[rgba(16,36,28,0.17)]",
                },
              }}
            />
          </div>
        </header>

        {/* Content View */}
        <main className="dash-inner-content">{children}</main>
      </div>
    </div>
  );
}
