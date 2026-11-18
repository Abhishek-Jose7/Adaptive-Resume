"use client";

import React, { useEffect, useState, use } from "react";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { ResumeDoc } from "@/types/resume";
import { Printer, ShieldCheck, AlertCircle, Clock } from "lucide-react";

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
        setData(res.data);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Loading verified resume snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Resume Not Available</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {error || "This shared resume link is either expired, revoked, or does not exist."}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Resume Maker
          </a>
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
    <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white print:p-0">
      {/* Top Banner (Hidden during print) */}
      <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-8 print:hidden sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {data.authorName ? `${data.authorName}'s Resume` : "Candidate Resume"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Grounded Truth Snapshot
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Expiring link active until {expiryDate}</span>
              </div>
            </div>
          </div>

          {data.allowDownload && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          )}
        </div>
      </header>

      {/* Main Resume Canvas */}
      <main className="flex-1 py-8 px-4 flex justify-center print:p-0 print:m-0">
        <div className="w-full max-w-[850px] shadow-lg rounded-sm overflow-hidden bg-white print:shadow-none print:max-w-none">
          <TemplateRenderer
            doc={data.resumeDoc}
            templateId={data.templateId || "classic_ats"}
          />
        </div>
      </main>
    </div>
  );
}
