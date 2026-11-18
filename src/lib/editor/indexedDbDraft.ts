import { ResumeDoc } from "@/types/resume";

const DB_NAME = "ResumeMakerDraftsDB";
const STORE_NAME = "resume_drafts";
const DB_VERSION = 1;

export interface DraftRecord {
  resumeId: string;
  document: ResumeDoc;
  updatedAt: string;
  rowVersion: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "resumeId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbDraftService {
  /**
   * Saves a working draft to browser IndexedDB
   */
  static async saveDraft(resumeId: string, document: ResumeDoc, rowVersion: number): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;

      const record: DraftRecord = {
        resumeId,
        document,
        updatedAt: new Date().toISOString(),
        rowVersion,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("Failed to save draft to IndexedDB:", err);
    }
  }

  /**
   * Loads a working draft from browser IndexedDB
   */
  static async loadDraft(resumeId: string): Promise<DraftRecord | null> {
    try {
      const db = await openDB();
      if (!db) return null;

      return await new Promise<DraftRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(resumeId);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("Failed to load draft from IndexedDB:", err);
      return null;
    }
  }

  /**
   * Clears a working draft from IndexedDB after server confirmation
   */
  static async clearDraft(resumeId: string): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(resumeId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("Failed to clear draft from IndexedDB:", err);
    }
  }
}
