"use client";

import React from "react";
import { ResumeDoc } from "@/types/resume";
import { ClassicAtsTemplate, TemplateProps } from "./ClassicAtsTemplate";
import { ModernAtsTemplate } from "./ModernAtsTemplate";
import { MinimalExecutiveTemplate } from "./MinimalExecutiveTemplate";
import { TechnicalScholarTemplate } from "./TechnicalScholarTemplate";

export interface TemplateRendererProps extends TemplateProps {
  templateId?: string;
}

export function TemplateRenderer({
  templateId = "classic-ats",
  ...props
}: TemplateRendererProps) {
  switch (templateId) {
    case "modern-ats":
      return <ModernAtsTemplate {...props} />;
    case "minimal-executive":
      return <MinimalExecutiveTemplate {...props} />;
    case "technical-scholar":
      return <TechnicalScholarTemplate {...props} />;
    case "classic-ats":
    default:
      return <ClassicAtsTemplate {...props} />;
  }
}
