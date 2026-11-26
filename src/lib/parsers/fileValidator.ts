/**
 * File validation helper enforcing limits and file magic byte verification
 * PRD Section 6.3 I6, Section 11.5
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_PASTED_TEXT_LENGTH = 30000; // 30,000 characters limit

export type AllowedFileType = "pdf" | "docx" | "zip" | "image";

export interface FileValidationResult {
  isValid: boolean;
  fileType?: AllowedFileType;
  errorMessage?: string;
}

export function validateFileBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename: string
): FileValidationResult {
  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // 1. Check size
  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessage: `File exceeds maximum allowable size of 10 MB (File size: ${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB)`,
    };
  }

  if (bytes.byteLength < 4) {
    return {
      isValid: false,
      errorMessage: "File is empty or corrupted.",
    };
  }

  // 2. Check Magic Bytes
  // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { isValid: true, fileType: "pdf" };
  }

  // ZIP / DOCX: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const isDocx = filename.toLowerCase().endsWith(".docx");
    return { isValid: true, fileType: isDocx ? "docx" : "zip" };
  }

  // PNG: \x89PNG (0x89, 0x50, 0x4E, 0x47)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { isValid: true, fileType: "image" };
  }

  // JPEG: \xFF\xD8\xFF (0xFF, 0xD8, 0xFF)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { isValid: true, fileType: "image" };
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { isValid: true, fileType: "image" };
  }

  return {
    isValid: false,
    errorMessage: "Unsupported file type. Please upload a valid PDF, DOCX, LinkedIn export ZIP, or JPEG/PNG/WebP screenshot.",
  };
}
