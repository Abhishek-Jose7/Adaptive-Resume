"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { ResumeDoc } from "@/types/resume";
import { FileDown, AlertCircle, Eye, Clock } from "lucide-react";

interface ShareViewData {
  id: string;
  resumeDoc: ResumeDoc;
  templateId: string;
  themeJson?: any;
  pageSize?: string;
  allowDownload: boolean;
  expiresAt: string;
  daysRemaining?: number;
  isExpiringSoon?: boolean;
  isOwner?: boolean;
  viewCount?: number;
  authorName?: string;
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const [data, setData] = useState<ShareViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/public/s/${token}${isPreview ? "?preview=1" : ""}`)
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
  }, [token, isPreview]);

  useEffect(() => {
    if (!data) return;
    const candidate = (data.authorName || data.resumeDoc?.profile?.fullName || "Resume").trim();
    document.title = `${candidate} - Resume`;
  }, [data]);

  const handleDownloadPdf = () => {
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

  const shareDoc: ResumeDoc = {
    ...data.resumeDoc,
    page: {
      size: (data.pageSize as "A4" | "LETTER") || data.resumeDoc?.page?.size || "A4",
      targetPages: data.resumeDoc?.page?.targetPages || 1,
    },
  };
  const fit = AutoFitLadder.evaluateFit(
    shareDoc,
    Math.max(5, AutoFitLadder.recommendedStepForOnePage(shareDoc))
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper print:bg-white">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-ink font-display text-[14px] font-semibold leading-none">
              R
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {data.authorName ? `${data.authorName} — resume` : "Candidate resume"}
              </p>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-graphite">
                <span>link open until {expiryDate}</span>
                {data.isExpiringSoon && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-marker-soft px-1.5 py-0.5 text-marker-dark">
                    <Clock className="h-2.5 w-2.5" />
                    expires in {data.daysRemaining ?? 0}d
                  </span>
                )}
                {data.isOwner && typeof data.viewCount === "number" && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded border border-rule bg-sheet px-1.5 py-0.5 text-ink"
                    title="Only visible to you as the resume owner"
                  >
                    <Eye className="h-2.5 w-2.5" />
                    {data.viewCount} views (only you)
                  </span>
                )}
              </div>
            </div>
          </div>

          {data.allowDownload !== false && (
            <button onClick={handleDownloadPdf} className="btn btn-primary btn-sm shrink-0">
              <FileDown className="h-3.5 w-3.5" strokeWidth={1.8} />
              Download PDF
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 print:p-0">
        <div className="w-full" style={{ maxWidth: shareDoc.page.size === "LETTER" ? "816px" : "794px" }}>
          <div className="plate overflow-hidden print:border-0 print:shadow-none">
            <TemplateRenderer
              doc={shareDoc}
              templateId={data.templateId || "classic-ats"}
              fontSizePt={fit.fontSizePt}
              lineHeight={fit.lineHeight}
              sectionGapRem={fit.sectionGapRem}
              marginInches={fit.marginInches}
              readOnly
            />
          </div>
          <p className="mt-3 text-center font-mono text-[10.5px] text-graphite print:hidden">
            shared as a snapshot — it does not change when the owner edits
          </p>
        </div>
      </main>

      <style jsx global>{`
        @page {
          size: ${shareDoc.page.size === "LETTER" ? "letter" : "A4"} portrait;
          margin: 0mm;
        }
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, footer, button, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
