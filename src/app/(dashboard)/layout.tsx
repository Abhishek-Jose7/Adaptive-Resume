"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  BriefcaseBusiness,
  FileText,
  KanbanSquare,
  Mail,
  UserRound,
  Upload,
  ShieldCheck,
  Gauge,
  SlidersHorizontal,
  ChevronDown,
  FilePlus2,
} from "lucide-react";
import { UserButton, Show, SignInButton } from "@clerk/nextjs";
import { DropdownMenu } from "radix-ui";

const allNavItems = [
  { label: "Data Bank", href: "/bank", icon: Database },
  { label: "Add experience", href: "/bank/intake", icon: Upload },
  { label: "Tailor a resume", href: "/jobs", icon: BriefcaseBusiness },
  { label: "My resumes", href: "/resumes", icon: FileText },
  { label: "Applications", href: "/applications", icon: KanbanSquare },
  { label: "Cover letters", href: "/cover-letters", icon: Mail },
  { label: "AI settings", href: "/settings/providers", icon: SlidersHorizontal },
  { label: "Profile", href: "/profile", icon: UserRound },
];

const mobilePrimary = [
  { label: "Data Bank", short: "Bank", href: "/bank", icon: Database },
  { label: "Tailor", short: "Tailor", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Resumes", short: "Resumes", href: "/resumes", icon: FileText },
  { label: "Applications", short: "Apps", href: "/applications", icon: KanbanSquare },
];

const mobileMore = [
  { label: "Add experience", href: "/bank/intake", icon: Upload },
  { label: "Cover letters", href: "/cover-letters", icon: Mail },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Usage", href: "/settings/usage", icon: Gauge },
  { label: "AI settings", href: "/settings/providers", icon: SlidersHorizontal },
  { label: "Privacy & data", href: "/settings/privacy", icon: ShieldCheck },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/bank") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileMoreMenu({ pathname }: { pathname: string | null }) {
  const active = mobileMore.some((item) => isActive(pathname, item.href));
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={`proof-more-trigger ${active ? "is-active" : ""}`} aria-label="More sections">
        More <ChevronDown aria-hidden="true" size={14} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="proof-more-menu" sideOffset={8} align="end">
        {mobileMore.map(({ label, href, icon: Icon }) => (
          <DropdownMenu.Item key={href} asChild>
            <Link href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          </DropdownMenu.Item>
        ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="proof-shell min-h-screen">
      <header className="proof-header">
        <div className="proof-header-main">
          <Link href="/" className="proof-brand" aria-label="Adaptive Resume home">
            <span className="proof-brand-mark" aria-hidden="true"><span /></span>
            <span>Adaptive <strong>Resume</strong></span>
          </Link>

          {/* Desktop Navigation: All links displayed directly with white text, no More dropdown */}
          <nav className="proof-nav proof-nav-desktop flex items-center gap-1.5 flex-wrap" aria-label="Main navigation">
            {allNavItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={`text-white font-bold hover:text-white hover:bg-white/15 px-2.5 py-1.5 rounded-lg transition-colors text-xs xl:text-sm ${
                  isActive(pathname, href) ? "bg-white/20 text-white shadow-sm" : ""
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="proof-header-actions">
            <Link href="/jobs" className="proof-new-resume"><FilePlus2 size={15} /> New resume</Link>
            <Show when="signed-in">
              <UserButton appearance={{ elements: { avatarBox: "h-9 w-9 rounded-full ring-1 ring-white/35" } }} />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal"><button className="proof-sign-in">Sign in</button></SignInButton>
            </Show>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="proof-nav proof-nav-mobile" aria-label="Mobile navigation">
          {mobilePrimary.map(({ short, href, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={16} strokeWidth={1.8} /><span>{short}</span>
            </Link>
          ))}
          <MobileMoreMenu pathname={pathname} />
        </nav>
      </header>

      <main className="proof-main">{children}</main>

      <footer className="proof-footer">
        <span>Built around the work you’ve actually done.</span>
        <Link href="/privacy">Privacy policy</Link>
      </footer>
    </div>
  );
}
