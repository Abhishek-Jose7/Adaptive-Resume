"use client";

import React from "react";
import { Show } from "@clerk/nextjs";
import { FigmaLanding } from "@/components/landing/FigmaLanding";
import DashboardLayout from "@/app/(dashboard)/layout";
import { FigmaDashboardView } from "@/components/dashboard/FigmaDashboardView";

export default function Page() {
  return (
    <>
      <Show when="signed-in">
        <DashboardLayout>
          <FigmaDashboardView />
        </DashboardLayout>
      </Show>

      <Show when="signed-out">
        <FigmaLanding />
      </Show>
    </>
  );
}
