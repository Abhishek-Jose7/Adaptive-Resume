"use client";

import React, { useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { parseDocxBuffer } from "@/lib/parsers/browserDocxParser";
import { parseLinkedInZip } from "@/lib/parsers/browserZipParser";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";
import { parseResumeTextWithFallback } from "@/lib/parsers/clientIntakeParser";

interface FileUploadDropzoneProps {
  onParsedItemsReady: (sourceType: string, sourceLabel: string, items: any[]) => Promise<void>;
}

export function FileUploadDropzone({ onParsedItemsReady }: FileUploadDropzoneProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const executeOcr = async (file: File, isPdf: boolean) => {
    setLoading(true);
    setError(null);
    setStatus(`Extracting text from ${file.name} via OCR service...`);

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
        throw new Error(err.error?.message || "OCR document extraction failed");
      }

      const ocrData = await ocrRes.json();
      const items = ocrData.items || ocrData.data?.items || [];
      const lineCount = ocrData.lineCount ?? ocrData.data?.lineCount ?? 0;
      if (items.length === 0) {
        throw new Error(`No structured items could be extracted from ${file.name}. Please ensure the scan is clear.`);
      }
      setStatus(`Read ${lineCount} lines from ${file.name}`);
      await onParsedItemsReady("resume_upload", file.name, items);
      setStatus("Parsed and staged for review");
    } catch (err: any) {
      setError(err.message || "Failed to process OCR document.");
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is over the 10 MB limit.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(`Reading ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith(".docx")) {
        const result = await parseDocxBuffer(buffer, file.name);
        setStatus("Structuring resume sections...");
        const items = await parseResumeTextWithFallback(result.text, file.name);

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
          // Auto-trigger OCR without modal confirmation as requested
          await executeOcr(file, true);
        } else {
          setStatus("Structuring resume sections...");
          const items = await parseResumeTextWithFallback(pdfResult.text, file.name);

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
        // Auto-trigger OCR for raster images directly
        await executeOcr(file, false);
      } else {
        throw new Error("Unsupported format. Upload a PDF, DOCX, LinkedIn ZIP, or an image.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.currentTarget.value = "";
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false when leaving the drop zone container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="panel flex flex-col">
      <div className="panel-head">
        <h3 className="panel-title">Upload a document</h3>
        <span className="folio">PDF · DOCX · LinkedIn ZIP · JPG/PNG/WebP</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`m-3 flex flex-1 flex-col items-center justify-center rounded-md border-2 px-5 py-8 text-center transition-all ${
          isDragging
            ? "border-dashed border-accent bg-accent/5 ring-2 ring-accent/20"
            : "border-dashed border-rule/60 hover:border-rule"
        }`}
      >
        <Upload
          className={`h-6 w-6 transition-transform ${isDragging ? "scale-110 text-accent" : "text-stamp"}`}
          strokeWidth={1.6}
        />

        <p className="mt-3 font-medium text-[13.5px] text-ink">
          {isDragging ? "Drop your file here" : "Drag and drop your file here, or choose a file"}
        </p>

        <p className="mt-1 max-w-[42ch] text-[12px] leading-relaxed text-graphite">
          PDFs and DOCX files are read in your browser. Scanned PDFs and images are processed securely using OCR.
        </p>

        {error && (
          <div className="mt-3 flex w-full max-w-md items-start gap-2 border border-alarm/35 bg-alarm-soft px-2.5 py-2 text-left text-[11.5px] text-alarm">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        )}

        {status && !error && (
          <div className="mt-3 flex w-full max-w-md items-start gap-2 border border-rule bg-paper-alt px-2.5 py-2 text-left text-[11.5px] text-graphite">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-press" strokeWidth={1.8} />
            <span>{status}</span>
          </div>
        )}

        <label className="mt-4 inline-block cursor-pointer">
          <span className="btn btn-primary">
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Processing document...
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
    </div>
  );
}
