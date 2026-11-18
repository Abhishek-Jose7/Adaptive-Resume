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
        const result = await parseDocxBuffer(buffer, file.name);
        setStatus("Structuring DOCX entries for staging review...");

        // Transform paragraphs into staged experience items
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
        const pdfResult = await parsePdfBuffer(buffer, file.name);
        setStatus(`Parsed ${pdfResult.pageCount} PDF pages...`);

        const nonBlank = pdfResult.pages
          .join("\n")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 5);

        const items = [
          {
            entryType: "experience",
            rawSnippet: `PDF: ${file.name} (${pdfResult.pageCount} pages)`,
            parsedDataJson: {
              title: nonBlank[0] || "Imported Career History",
              organization: "Uploaded Resume (PDF)",
              bullets: nonBlank.slice(1, 20),
            },
            confidence: 0.88,
          },
        ];

        await onParsedItemsReady("resume_upload", file.name, items);
      } else {
        throw new Error("Unsupported format. Please upload PDF, DOCX, or LinkedIn ZIP.");
      }

      setStatus("Upload parsed and staged successfully for review!");
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
      <div className="max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Upload Existing Resume or LinkedIn Export
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Supports PDF, DOCX, or official LinkedIn Data Export (.zip).
            <br />
            Enforces strict client-side compute bounds: ≤10 MB, ≤10 pages. Raw files are discarded.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status && !error && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg flex items-center gap-1.5 justify-center">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}

        <label className="inline-block cursor-pointer">
          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors">
            {loading ? "Processing..." : "Select File"}
          </span>
          <input
            type="file"
            accept=".pdf,.docx,.zip"
            disabled={loading}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
