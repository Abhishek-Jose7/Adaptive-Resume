import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "var(--paper)", deep: "var(--paper-deep)", alt: "var(--paper-alt)" },
        sheet: "var(--sheet)",
        ink: "var(--ink)",
        graphite: "var(--graphite)",
        rule: { DEFAULT: "var(--rule)", strong: "var(--rule-strong)" },
        stamp: { DEFAULT: "var(--stamp)", dark: "var(--stamp-dark)", soft: "var(--stamp-soft)" },
        marker: { DEFAULT: "var(--marker)", dark: "var(--marker-dark)", soft: "var(--marker-soft)" },
        press: { DEFAULT: "var(--press)", dark: "var(--press)", soft: "var(--press-soft)" },
        alarm: { DEFAULT: "var(--alarm)", soft: "var(--alarm-soft)" },
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: { DEFAULT: "var(--stamp)", foreground: "var(--color-accent-ink)" },
        secondary: { DEFAULT: "var(--paper-deep)", foreground: "var(--ink)" },
        muted: { DEFAULT: "var(--paper-deep)", foreground: "var(--graphite)" },
        accent: { DEFAULT: "var(--color-blue-soft)", foreground: "var(--ink)" },
        card: { DEFAULT: "var(--sheet)", foreground: "var(--ink)" },
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-outlier)"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "8px",
        "3xl": "10px",
        full: "9999px",
      },
      boxShadow: {
        plate: "0 2px 5px rgba(25,40,61,0.05), 0 18px 32px -28px rgba(25,40,61,0.26)",
        lift: "0 3px 8px -3px rgba(25,40,61,0.12), 0 20px 36px -28px rgba(25,40,61,0.34)",
        sheet: "0 2px 5px rgba(25,40,61,0.06), 0 24px 48px -36px rgba(25,40,61,0.3)",
        none: "none",
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        "3xs": ["9px", { lineHeight: "12px" }],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      maxWidth: {
        measure: "68ch",
        shell: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
