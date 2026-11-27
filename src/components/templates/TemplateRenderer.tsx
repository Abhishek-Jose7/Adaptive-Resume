"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ClassicAtsTemplate, TemplateProps } from "./ClassicAtsTemplate";

const ModernAtsTemplate = dynamic(
  () => import("./ModernAtsTemplate").then((m) => m.ModernAtsTemplate),
  { ssr: true }
);
const MinimalExecutiveTemplate = dynamic(
  () => import("./MinimalExecutiveTemplate").then((m) => m.MinimalExecutiveTemplate),
  { ssr: true }
);
const TechnicalScholarTemplate = dynamic(
  () => import("./TechnicalScholarTemplate").then((m) => m.TechnicalScholarTemplate),
  { ssr: true }
);
const LuxuriousGridTemplate = dynamic(
  () => import("./LuxuriousGridTemplate").then((m) => m.LuxuriousGridTemplate),
  { ssr: true }
);
const CompactEngineerTemplate = dynamic(
  () => import("./CompactEngineerTemplate").then((m) => m.CompactEngineerTemplate),
  { ssr: true }
);
const DenseSinglePageTemplate = dynamic(
  () => import("./DenseSinglePageTemplate").then((m) => m.DenseSinglePageTemplate),
  { ssr: true }
);

export interface TemplateRendererProps extends TemplateProps {
  templateId?: string;
}

export function TemplateRenderer({
  templateId = "classic-ats",
  ...props
}: TemplateRendererProps) {
  switch (templateId) {
    case "dense-single-page":
      return <DenseSinglePageTemplate {...props} />;
    case "modern-ats":
      return <ModernAtsTemplate {...props} />;
    case "minimal-executive":
      return <MinimalExecutiveTemplate {...props} />;
    case "technical-scholar":
      return <TechnicalScholarTemplate {...props} />;
    case "luxurious-grid":
      return <LuxuriousGridTemplate {...props} />;
    case "compact-engineer":
      return <CompactEngineerTemplate {...props} />;
    case "classic-ats":
    default:
      return <ClassicAtsTemplate {...props} />;
  }
}
