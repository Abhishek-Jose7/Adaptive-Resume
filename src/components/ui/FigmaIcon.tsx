"use client";

import React from "react";

export type FigmaIconName =
  | "arrow"
  | "bank"
  | "briefcase"
  | "check"
  | "chevron"
  | "download"
  | "file"
  | "grid"
  | "lock"
  | "menu"
  | "plus"
  | "search"
  | "shield"
  | "spark"
  | "target"
  | "user";

const paths: Record<FigmaIconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  bank: (
    <>
      <path d="M4 10h16M6 10v8m4-8v8m4-8v8m4-8v8M3 21h18M12 3l9 4H3l9-4Z" />
    </>
  ),
  briefcase: (
    <>
      <path d="M9 6V4h6v2m-8 0h10a2 2 0 0 1 2 2v10H5V8a2 2 0 0 1 2-2Zm-3 6h16M10 12v2h4v-2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6V2Z" />
      <path d="M14 2v5h5M9 12h6m-6 4h6" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="m15 9 5-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-5 3.4-7 8-7s7.2 2 8 7" />
    </>
  ),
};

export function FigmaIcon({
  name,
  size = 20,
  className = "",
}: {
  name: FigmaIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export function FigmaLogo({
  inverse = false,
  onClick,
}: {
  inverse?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`logo ${inverse ? "logo-inverse" : ""}`}
      onClick={onClick || (() => window.scrollTo({ top: 0, behavior: "smooth" }))}
      aria-label="Adaptive Resume home"
    >
      <span className="logo-mark">A</span>
      <span>
        Adaptive
        <br />
        Resume
      </span>
    </button>
  );
}
