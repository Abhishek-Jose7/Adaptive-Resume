"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { parseDocxBuffer } from "@/lib/parsers/browserDocxParser";
import { parseLinkedInZip } from "@/lib/parsers/browserZipParser";
import { parsePdfBuffer } from "@/lib/parsers/browserPdfParser";

interface FileUploadDropzoneProps {
  onParsedItemsReady: (sourceType: string, sourceLabel: string, items: any[]) => Promise<void>;
}

export function FileUploadDropzone({ onParsedItemsReady }: FileUploadDropzoneProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum allowable size of 10 MB (PRD 6.3 I6)");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(`Extracting text from ${file.name} in browser...`);

    try {
      const buffer = await file.arrayBuffer();
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith(".docx")) {
        // Architecture: Selectable DOCX -> Mammoth local parsing
        setStatus("Detected DOCX document. Running browser-side Mammoth extraction...");
        const result = await parseDocxBuffer(buffer, file.name);
        setStatus("Structuring DOCX entries for staging review...");

        const nonBlankLines = result.lines.filter((l) => l.length > 5);
        const items = [
          {
            entryType: "experience",
            rawSnippet: `File: ${file.name} (${nonBlankLines.length} lines parsed)`,
            parsedDataJson: {
              title: nonBlankLines[0] || "Imported Role",
              organization: "Uploaded Resume (DOCX)",
              bullets: nonBlankLines.slice(1, 15),
            },
            confidence: 0.9,
          },
        ];

        await onParsedItemsReady("resume_upload", file.name, items);
      } else if (fileNameLower.endsWith(".zip")) {
        // Architecture: LinkedIn ZIP -> JSZip local parsing
        setStatus("Detected LinkedIn Data Export. Running browser-side JSZip extraction...");
        const zipResult = await parseLinkedInZip(buffer);
        setStatus(`Extracted ${zipResult.items.length} items from LinkedIn ZIP...`);

        const stagedCandidates = zipResult.items.map((item) => ({
          entryType: item.entryType,
          rawSnippet: `LinkedIn Export: ${item.title} @ ${item.organization || ""}`,
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
      } else if (fileNameLower.endsWith(".pdf")) {
        // Architecture: Browser-side file detection: Determine whether PDF contains selectable text or is scanned
        setStatus("Running browser-side detection to determine if PDF is selectable or scanned...");
        const pdfResult = await parsePdfBuffer(buffer, file.name);

        if (pdfResult.isScanned) {
          // Architecture: Scanned PDF -> OCR.space via Next.js API route
          setStatus("Scanned PDF detected (no selectable text layer). Routing to OCR.space external engine...");
          const formData = new FormData();
          formData.append("file", file);

          const ocrRes = await fetch("/api/v1/ocr", {
            method: "POST",
            body: formData,
          });

          if (!ocrRes.ok) {
            const err = await ocrRes.json().catch(() => ({}));
            throw new Error(err.error?.message || "OCR.space scanning failed");
          }

          const ocrData = await ocrRes.json();
          const items = ocrData.data?.items || [];
          setStatus(`OCR.space extracted ${ocrData.data?.lineCount || 0} lines from scanned document.`);
          await onParsedItemsReady("resume_upload", file.name, items);
        } else {
          // Architecture: Selectable PDF -> PDF.js local parsing
          setStatus(`Selectable PDF detected (${pdfResult.charCount} characters). Running local PDF.js parser...`);
          const nonBlank = pdfResult.pages
            .join("\n")
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 5);

          const items = [
            {
              entryType: "experience",
              rawSnippet: `PDF: ${file.name} (${pdfResult.pageCount} pages, selectable text)`,
              parsedDataJson: {
                title: nonBlank[0] || "Imported Career History",
                organization: "Uploaded Resume (PDF)",
                bullets: nonBlank.slice(1, 20),
              },
              confidence: 0.9,
            },
          ];

          await onParsedItemsReady("resume_upload", file.name, items);
        }
      } else if (
        fileNameLower.endsWith(".png") ||
        fileNameLower.endsWith(".jpg") ||
        fileNameLower.endsWith(".jpeg") ||
        fileNameLower.endsWith(".webp")
      ) {
        // Architecture: Image -> OCR.space via Next.js API route
        setStatus(`Image document detected (${file.type}). Sending to OCR.space external engine...`);
        const formData = new FormData();
        formData.append("file", file);

        const ocrRes = await fetch("/api/v1/ocr", {
          method: "POST",
          body: formData,
        });

        if (!ocrRes.ok) {
          const err = await ocrRes.json().catch(() => ({}));
          throw new Error(err.error?.message || "OCR.space image extraction failed");
        }

        const ocrData = await ocrRes.json();
        const items = ocrData.data?.items || [];
        setStatus(`OCR.space successfully transcribed image into ${ocrData.data?.lineCount || 0} lines.`);
        await onParsedItemsReady("resume_upload", file.name, items);
      } else {
        throw new Error("Unsupported format. Please upload PDF, DOCX, LinkedIn ZIP, or Image (PNG/JPG/WEBP).");
      }

      setStatus("Upload parsed and staged successfully for review!");
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center bg-gray-900/60 hover:bg-gray-900 transition-colors">
      <div className="max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto">
          {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-100">
            Upload Existing Resume, Image, or LinkedIn Export
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Supports PDF (selectable or scanned), DOCX, Images (.png, .jpg, .webp), or LinkedIn ZIP.
            <br />
            Browser-side detection automatically routes selectable docs to local PDF.js/Mammoth and scanned docs to OCR.space.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status && !error && (
          <div className="p-2.5 bg-blue-950/60 border border-blue-800 text-blue-300 text-xs rounded-lg flex items-center gap-1.5 justify-center">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}

        <label className="inline-block cursor-pointer">
          <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors">
            {loading ? "Processing Document..." : "Select File"}
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
