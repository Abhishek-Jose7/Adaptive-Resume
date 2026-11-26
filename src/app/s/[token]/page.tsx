"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { ResumeDoc } from "@/types/resume";
import { Printer, AlertCircle } from "lucide-react";

interface ShareViewData {
  id: string;
  resumeDoc: ResumeDoc;
  templateId: string;
  themeJson?: any;
  pageSize?: string;
  allowDownload: boolean;
  expiresAt: string;
  authorName?: string;
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<ShareViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/public/s/${token}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("This shared resume link is invalid, expired, or has been revoked.");
        }
        return res.json();
      })
      .then((res) => {
        setData(res?.data ?? res);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <p className="text-[13px] text-graphite">Opening the snapshot</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <div className="plate w-full max-w-md p-6">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-alarm" strokeWidth={1.8} />
            <h2 className="font-display text-[18px] font-semibold tracking-tight">
              This link no longer opens
            </h2>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-graphite">
            {error || "The share either expired or was revoked by its owner."}
          </p>
          <Link href="/" className="btn mt-4">
            Go to Adaptive Resume
          </Link>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(data.expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-paper print:bg-white">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center border border-ink font-display text-[14px] font-semibold leading-none">
              R
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {data.authorName ? `${data.authorName} — resume` : "Candidate resume"}
              </p>
              <p className="font-mono text-[10.5px] text-graphite">link open until {expiryDate}</p>
            </div>
          </div>

          {data.allowDownload && (
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />
              Print or save PDF
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 print:p-0">
        <div className="w-full max-w-[850px]">
          <div className="plate overflow-hidden print:border-0 print:shadow-none">
            <TemplateRenderer doc={data.resumeDoc} templateId={data.templateId || "classic_ats"} />
          </div>
          <p className="mt-3 text-center font-mono text-[10.5px] text-graphite print:hidden">
            shared as a snapshot — it does not change when the owner edits
          </p>
        </div>
      </main>
    </div>
  );
}
