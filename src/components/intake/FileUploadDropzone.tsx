"use client";

import React, { useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, X } from "lucide-react";
import { parseDocxBuffer } from "@/lib/parsers/browserDocxParser";
import { parseLinkedInZip } from "@/lib/parsers/browserZipParser";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";
import { ResumeStructuringService } from "@/lib/parsers/resumeStructuringService";

interface FileUploadDropzoneProps {
  onParsedItemsReady: (sourceType: string, sourceLabel: string, items: any[]) => Promise<void>;
}

export function FileUploadDropzone({ onParsedItemsReady }: FileUploadDropzoneProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingOcr, setPendingOcr] = useState<{ file: File; isPdf: boolean } | null>(null);

  const executeOcr = async (file: File, isPdf: boolean) => {
    setLoading(true);
    setError(null);
    setStatus(`Sending ${file.name} to OCR.space with your consent`);

    try {
      const consentRes = await fetch("/api/v1/ocr/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant" }),
      });
      if (!consentRes.ok) {
        const err = await consentRes.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to record OCR processing consent.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const ocrRes = await fetch("/api/v1/ocr", {
        method: "POST",
        body: formData,
      });

      if (!ocrRes.ok) {
        const err = await ocrRes.json().catch(() => ({}));
        throw new Error(err.error?.message || "OCR.space document extraction failed");
      }

      const ocrData = await ocrRes.json();
      const items = ocrData.data?.items || [];
      setStatus(`Read ${ocrData.data?.lineCount || 0} lines from ${file.name}`);
      await onParsedItemsReady("resume_upload", file.name, items);
      setStatus("Parsed and staged for review");
    } catch (err: any) {
      setError(err.message || "Failed to process OCR document.");
    } finally {
      setLoading(false);
      setPendingOcr(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.currentTarget.value = "";

    if (file.size > 10 * 1024 * 1024) {
      setError("That file is over the 10 MB limit.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(`Reading ${file.name} in the browser`);

    try {
      const buffer = await file.arrayBuffer();
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith(".docx")) {
        const result = await parseDocxBuffer(buffer, file.name);
        const rawDocxText = result.lines.join("\n");
        const structuredSections = ResumeStructuringService.structureResumeText(rawDocxText, file.name);
        const items = ResumeStructuringService.toStagedItemInputs(structuredSections);

        await onParsedItemsReady("resume_upload", file.name, items);
        setStatus("Parsed and staged for review");
        setLoading(false);
      } else if (fileNameLower.endsWith(".zip")) {
        const zipResult = await parseLinkedInZip(buffer);
        setStatus(`Extracted ${zipResult.items.length} items from the LinkedIn export`);

        const stagedCandidates = zipResult.items.map((item) => ({
          entryType: item.entryType,
          rawSnippet: `LinkedIn export: ${item.title} @ ${item.organization || ""}`,
          parsedDataJson: {
            title: item.title,
            organization: item.organization || null,
            location: item.location || null,
            startDate: item.startDate || null,
            endDate: item.endDate || null,
            isCurrent: item.isCurrent || false,
            descriptionContext: item.descriptionContext || null,
            bullets: item.bullets,
          },
          confidence: 0.95,
        }));

        await onParsedItemsReady("linkedin_export", file.name, stagedCandidates);
        setStatus("Parsed and staged for review");
        setLoading(false);
      } else if (fileNameLower.endsWith(".pdf")) {
        setStatus("Checking whether the PDF has selectable text");
        const pdfResult = await parsePdfBuffer(buffer, file.name);

        if (pdfResult.isScanned) {
          setLoading(false);
          setStatus(null);
          setPendingOcr({ file, isPdf: true });
        } else {
          const rawPdfText = pdfResult.pages.join("\n");
          const structuredSections = ResumeStructuringService.structureResumeText(rawPdfText, file.name);
          const items = ResumeStructuringService.toStagedItemInputs(structuredSections);

          await onParsedItemsReady("resume_upload", file.name, items);
          setStatus("Parsed and staged for review");
          setLoading(false);
        }
      } else if (
        fileNameLower.endsWith(".png") ||
        fileNameLower.endsWith(".jpg") ||
        fileNameLower.endsWith(".jpeg") ||
        fileNameLower.endsWith(".webp")
      ) {
        setLoading(false);
        setStatus(null);
        setPendingOcr({ file, isPdf: false });
      } else {
        throw new Error("Unsupported format. Upload a PDF, DOCX, LinkedIn ZIP, or an image.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
      setLoading(false);
    }
  };

  return (
    <div className="panel flex flex-col">
      <div className="panel-head">
        <h3 className="panel-title">Upload a document</h3>
        <span className="folio">PDF · DOCX · LinkedIn ZIP · JPG/PNG/WebP</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <Upload className="h-5 w-5 text-stamp" strokeWidth={1.6} />

        <p className="mt-3 max-w-[40ch] text-[13px] leading-relaxed text-graphite">
          PDFs and DOCX files are read in your browser. Scanned PDFs and images use OCR only after you approve it. SVG files aren’t supported.
        </p>

        {error && (
          <div className="mt-3 flex w-full items-start gap-2 border border-alarm/35 bg-alarm-soft px-2.5 py-2 text-left text-[11.5px] text-alarm">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        )}

        {status && !error && (
          <div className="mt-3 flex w-full items-start gap-2 border border-rule bg-paper-alt px-2.5 py-2 text-left text-[11.5px] text-graphite">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-press" strokeWidth={1.8} />
            <span>{status}</span>
          </div>
        )}

        <label className="mt-4 inline-block cursor-pointer">
          <span className="btn btn-primary">
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Reading the file
              </>
            ) : (
              "Choose a file"
            )}
          </span>
          <input
            type="file"
            accept=".pdf,.docx,.zip,.png,.jpg,.jpeg,.webp"
            disabled={loading}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {pendingOcr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg border border-rule bg-sheet">
            <div className="flex items-start justify-between border-b border-rule px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight">
                <ShieldCheck className="h-4 w-4 text-marker-dark" strokeWidth={1.8} />
                Before this file leaves the browser
              </h2>
              <button onClick={() => setPendingOcr(null)} className="btn btn-icon" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <p className="text-[13px] leading-relaxed">
                <span className="font-mono text-[12px]">{pendingOcr.file.name}</span> is{" "}
                {pendingOcr.isPdf ? "a scanned PDF with no selectable text" : "a raster image"}. Reading it
                means sending it to OCR.space.
              </p>

              <ul className="space-y-1 border-t border-rule pt-2 text-[12px] leading-relaxed text-graphite">
                <li>Sent over TLS to OCR.space and processed without permanent storage.</li>
                <li>Text comes back into staging, where you approve it line by line.</li>
                <li>The free tier allows five requests per minute.</li>
              </ul>

              <div className="flex justify-end gap-2 border-t border-rule pt-3">
                <button onClick={() => setPendingOcr(null)} className="btn btn-quiet">
                  Cancel
                </button>
                <button
                  onClick={() => executeOcr(pendingOcr.file, pendingOcr.isPdf)}
                  className="btn btn-primary"
                >
                  Send and read
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
