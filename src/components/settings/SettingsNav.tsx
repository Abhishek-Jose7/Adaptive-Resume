"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Key, Gauge, ShieldCheck } from "lucide-react";

const ITEMS = [
  { href: "/settings", label: "Workspace", icon: SlidersHorizontal },
  { href: "/settings/providers", label: "AI Keys", icon: Key },
  { href: "/settings/usage", label: "Usage", icon: Gauge },
  { href: "/settings/privacy", label: "Privacy & Data", icon: ShieldCheck },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="no-scrollbar mb-6 flex items-center gap-1.5 overflow-x-auto border-b border-rule pb-3"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              active
                ? "border-ink bg-ink text-cream"
                : "border-rule bg-sheet text-ink hover:bg-paper-deep"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
