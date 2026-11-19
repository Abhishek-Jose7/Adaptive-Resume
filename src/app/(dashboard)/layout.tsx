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

const primaryItems = [
  { label: "Data Bank", short: "Bank", href: "/bank", icon: Database },
  { label: "Tailor a resume", short: "Tailor", href: "/jobs", icon: BriefcaseBusiness },
  { label: "My resumes", short: "Resumes", href: "/resumes", icon: FileText },
  { label: "Applications", short: "Applications", href: "/applications", icon: KanbanSquare },
];

const moreItems = [
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

function MoreMenu({ pathname }: { pathname: string | null }) {
  const active = moreItems.some((item) => isActive(pathname, item.href));
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={`proof-more-trigger ${active ? "is-active" : ""}`} aria-label="More sections">
        More <ChevronDown aria-hidden="true" size={14} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="proof-more-menu" sideOffset={8} align="end">
        {moreItems.map(({ label, href, icon: Icon }) => (
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

          <nav className="proof-nav proof-nav-desktop" aria-label="Main navigation">
            {primaryItems.map(({ label, href }) => (
              <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
                {label}
              </Link>
            ))}
            <MoreMenu pathname={pathname} />
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

        <nav className="proof-nav proof-nav-mobile" aria-label="Main navigation">
          {primaryItems.map(({ label, short, href, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={16} strokeWidth={1.8} /><span>{short}</span>
            </Link>
          ))}
          <MoreMenu pathname={pathname} />
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
