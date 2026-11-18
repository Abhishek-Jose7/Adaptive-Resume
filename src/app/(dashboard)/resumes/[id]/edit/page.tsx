"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import { IndexedDbDraftService } from "@/lib/editor/indexedDbDraft";
import { EditorFormPanel } from "@/components/editor/EditorFormPanel";
import { EditorPreviewPanel } from "@/components/editor/EditorPreviewPanel";
import { ResumeDoc } from "@/types/resume";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResumeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<ResumeDocStore | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "conflict" | "error">("saved");
  const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
  const [versionNumber, setVersionNumber] = useState(1);
  const [draftAlert, setDraftAlert] = useState<boolean>(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Resume & Store
  useEffect(() => {
    async function initEditor() {
      try {
        const res = await fetch(`/api/v1/resumes/${resumeId}`);
        if (!res.ok) throw new Error("Resume not found");

        const json = await res.json();
        const serverData = json.data || json;
        const serverDoc: ResumeDoc =
          serverData.latestVersion?.resumeDocJson || serverData.documentJson || serverData;

        setResumeTitle(serverData.document?.title || "Untitled Resume");
        setVersionNumber(serverData.latestVersion?.versionNumber || 1);

        // Check IndexedDB for un-synced offline draft
        const localDraft = await IndexedDbDraftService.loadDraft(resumeId);
        let initialDoc = serverDoc;

        if (localDraft && localDraft.document) {
          const localTime = new Date(localDraft.updatedAt).getTime();
          const serverTime = new Date(serverData.document?.updatedAt || 0).getTime();
          if (localTime > serverTime) {
            setDraftAlert(true);
            initialDoc = localDraft.document;
          }
        }

        const newStore = new ResumeDocStore(initialDoc);
        setStore(newStore);
        setEditorState(newStore.getState());

        // Subscribe to store updates
        newStore.subscribe((newState) => {
          setEditorState(newState);

          if (newState.isDirty) {
            setAutosaveStatus("saving");

            // Save to IndexedDB immediately for disaster resilience
            IndexedDbDraftService.saveDraft(resumeId, newState.doc, versionNumber);

            // Debounce server autosave by 1.5 seconds (PRD Section 10.6)
            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = setTimeout(async () => {
              try {
                const patchRes = await fetch(`/api/v1/resumes/${resumeId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    document: newState.doc,
                    versionNumber,
                  }),
                });

                if (patchRes.status === 409) {
                  setAutosaveStatus("conflict");
                  return;
                }

                if (!patchRes.ok) {
                  setAutosaveStatus("error");
                  return;
                }

                newStore.markSaved();
                setAutosaveStatus("saved");
              } catch (err) {
                console.error("Autosave error:", err);
                setAutosaveStatus("error");
              }
            }, 1500);
          }
        });
      } catch (err: any) {
        console.error("Init editor error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (resumeId) {
      initEditor();
    }

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [resumeId]);

  if (loading || !store || !editorState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-medium text-gray-600">Loading Resume Document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/resumes"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Resumes
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-bold text-gray-900">{resumeTitle}</h1>
          <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
            v{versionNumber}.0
          </span>
        </div>

        {draftAlert && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Restored recent offline draft from browser
          </div>
        )}
      </header>

      {/* Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Form Panel */}
        <div className="w-1/2 h-full overflow-hidden">
          <EditorFormPanel store={store} editorState={editorState} />
        </div>

        {/* Right Live Preview Panel */}
        <div className="w-1/2 h-full overflow-hidden">
          <EditorPreviewPanel
            store={store}
            editorState={editorState}
            resumeId={resumeId}
            autosaveStatus={autosaveStatus}
          />
        </div>
      </div>
    </div>
  );
}
