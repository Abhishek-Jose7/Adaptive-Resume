"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ResumeDoc } from "@/types/resume";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { AutoFitLadder } from "@/lib/editor/autoFitLadder";
import { downloadResumePdf, buildResumePdfFilename } from "@/lib/export/pdfGenerator";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

export default function ResumePrintPage() {
  const params = useParams();
  const resumeId = params?.id as string;
  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  const [resumeTitle, setResumeTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState("classic-ats");

  useEffect(() => {
    async function loadResume() {
      try {
        const res = await fetch(`/api/v1/resumes/${resumeId}`);
        if (res.ok) {
          const json = await res.json();
          const resumeData = json.data || json;
          const currentDoc = resumeData.latestVersion?.resumeDocJson || resumeData.documentJson || resumeData;
          setDoc(currentDoc);
          if (resumeData.document?.title) {
            setResumeTitle(resumeData.document.title);
          }
          if (currentDoc.template?.id) {
            setTemplateId(currentDoc.template.id);
          }
        }
      } catch (err) {
        console.error("Failed to load resume for printing", err);
      } finally {
        setLoading(false);
      }
    }

    if (resumeId) {
      loadResume();
    }
  }, [resumeId]);

  useEffect(() => {
    if (!doc) return;
    document.title = buildResumePdfFilename(doc, { resumeTitle }).replace(/\.pdf$/i, "");
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("download") === "1") {
      const timer = setTimeout(() => downloadResumePdf(doc, { resumeTitle }), 250);
      return () => clearTimeout(timer);
    }
  }, [doc, resumeTitle]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Preparing print document...</div>;
  }

  if (!doc) {
    return (
      <div className="p-8 text-center text-sm text-red-600">
        Resume document not found.{" "}
        <Link href="/resumes" className="underline">
          Return to resumes
        </Link>
      </div>
    );
  }

  const printDoc = {
    ...doc,
    page: {
      size: doc.page?.size || ("A4" as const),
      targetPages: doc.page?.targetPages || 1,
    },
  };
  const recommendedFit = AutoFitLadder.evaluateFit(
    printDoc,
    Math.max(5, AutoFitLadder.recommendedStepForOnePage(printDoc))
  );

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white p-4 print:p-0">
      {/* Print Controls - Hidden on print */}
      <div className="max-w-[794px] mx-auto mb-4 flex items-center justify-between print:hidden bg-white p-3 rounded-lg border shadow-xs">
        <Link
          href={`/resumes/${resumeId}/edit`}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Editor
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadResumePdf(printDoc, { resumeTitle })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10241c] hover:bg-[#1f382e] text-white font-medium text-xs rounded-md shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium text-xs rounded-md shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Actual Printable Resume Document */}
      <div className="print:m-0 print:p-0">
        <TemplateRenderer
          doc={printDoc}
          templateId={templateId}
          fontSizePt={recommendedFit.fontSizePt}
          lineHeight={recommendedFit.lineHeight}
          sectionGapRem={recommendedFit.sectionGapRem}
          marginInches={recommendedFit.marginInches}
          readOnly={true}
        />
      </div>

      <style jsx global>{`
        @page {
          size: ${printDoc.page.size === "LETTER" ? "letter" : "A4"} portrait;
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
