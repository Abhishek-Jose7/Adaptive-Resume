"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { FigmaIcon, FigmaIconName, FigmaLogo } from "@/components/ui/FigmaIcon";
import { fetchBankEntriesCached, getCachedVaultSnapshot } from "@/lib/cache/vaultClientCache";

const navItems: Array<{
  label: string;
  href: string;
  icon: FigmaIconName;
  badge?: boolean;
}> = [
  { label: "Overview", href: "/", icon: "grid" },
  { label: "Career Vault", href: "/bank", icon: "bank", badge: true },
  { label: "Target a job", href: "/jobs", icon: "target" },
  { label: "My resumes", href: "/resumes", icon: "file" },
  { label: "Profile", href: "/profile", icon: "user" },
];

function isRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/bank") return pathname === "/bank" || pathname.startsWith("/bank/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const [factCount, setFactCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const computeCount = (items: Array<{ bullets?: Array<unknown> }>) =>
      items.reduce(
        (acc, entry) => acc + Math.max(1, entry.bullets?.length || 1),
        0,
      );

    const cached = getCachedVaultSnapshot();
    if (cached?.items) {
      setFactCount(computeCount(cached.items));
    }

    fetchBankEntriesCached()
      .then((snapshot) => {
        setFactCount(computeCount(snapshot.items));
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
  const greeting = !mounted
    ? "Welcome"
    : hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
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
                {badge && factCount > 0 && <small>{factCount}</small>}
              </Link>
            );
          })}
        </nav>

        <div className="side-bottom">
          <div className="vault-health">
            <div>
              <span>VAULT HEALTH</span>
              <b>{factCount > 0 ? "82%" : "READY"}</b>
            </div>
            <i>
              <em style={{ width: factCount > 0 ? "82%" : "15%" }} />
            </i>
            <p>
              {factCount > 0
                ? "Add 2 project metrics to improve your matches."
                : "Add your first real project or experience to start matching."}
            </p>
          </div>

          <Link href="/settings">
            <FigmaIcon name="lock" size={17} />
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
            <Link href="/bank" className="dash-search-btn" aria-label="Search Vault">
              <FigmaIcon name="search" size={17} />
            </Link>
            <UserButton />
          </div>
        </header>

        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
