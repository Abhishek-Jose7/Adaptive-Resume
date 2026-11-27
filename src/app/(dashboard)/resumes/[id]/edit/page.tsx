"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ResumeDocStore, EditorState } from "@/lib/editor/resumeDocStore";
import { IndexedDbDraftService } from "@/lib/editor/indexedDbDraft";
import { EditorFormPanel } from "@/components/editor/EditorFormPanel";
import { EditorPreviewPanel } from "@/components/editor/EditorPreviewPanel";
import { ResumeDoc } from "@/types/resume";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResumeEditorPage() {
  const params = useParams();
  const resumeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [store, setStore] = useState<ResumeDocStore | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "conflict" | "error">("saved");
  const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
  const [versionNumber, setVersionNumber] = useState(1);
  const [draftAlert, setDraftAlert] = useState<boolean>(false);
  const [pane, setPane] = useState<"form" | "preview">("form");

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rowVersionRef = useRef<number>(1);
  const versionNumberRef = useRef<number>(1);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function initEditor() {
      setLoadError(null);
      try {
        const res = await fetch(`/api/v1/resumes/${resumeId}`);
        if (!res.ok) throw new Error("Resume not found");

        const json = await res.json();
        const serverData = json.data || json;
        const serverDoc: ResumeDoc =
          serverData.latestVersion?.resumeDocJson || serverData.documentJson || serverData;

        if (!active) return;

        const initialVerNum = serverData.latestVersion?.versionNumber || 1;
        const initialRowVer = serverData.latestVersion?.rowVersion || 1;
        versionNumberRef.current = initialVerNum;
        rowVersionRef.current = initialRowVer;

        setResumeTitle(serverData.document?.title || "Untitled Resume");
        setVersionNumber(initialVerNum);

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

        if (!active) return;

        const newStore = new ResumeDocStore(initialDoc);
        setStore(newStore);
        setEditorState(newStore.getState());

        unsubscribe = newStore.subscribe((newState) => {
          setEditorState(newState);

          if (newState.isDirty) {
            setAutosaveStatus("saving");

            IndexedDbDraftService.saveDraft(resumeId, newState.doc, versionNumberRef.current);

            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = setTimeout(async () => {
              try {
                const patchRes = await fetch(`/api/v1/resumes/${resumeId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    document: newState.doc,
                    rowVersion: rowVersionRef.current,
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

                const patchJson = await patchRes.json();
                const savedPayload = patchJson?.data ?? patchJson;
                if (typeof savedPayload?.rowVersion === "number") {
                  rowVersionRef.current = savedPayload.rowVersion;
                } else {
                  rowVersionRef.current += 1;
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
        if (active) setLoadError(err?.message || "Could not load resume");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (resumeId) {
      initEditor();
    }

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [resumeId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center space-y-3">
        <p className="text-[14px] font-medium text-ink">{loadError}</p>
        <Link href="/resumes" className="btn btn-sm inline-flex">
          Back to Resumes
        </Link>
      </div>
    );
  }

  if (loading || !store || !editorState) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-graphite">
        <RefreshCw className="h-4 w-4 animate-spin text-stamp" />
        Setting out the document
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-6 flex h-[calc(100dvh-54px-56px)] flex-col overflow-hidden border-rule sm:-mx-6 sm:-mt-8 md:h-[calc(100dvh-54px)] md:border-t">
      <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-paper px-4 py-2.5 sm:px-5">
        <Link
          href="/resumes"
          className="inline-flex items-center gap-1.5 text-[12px] text-graphite hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="hidden sm:inline">Resumes</span>
        </Link>

        <span className="h-3.5 w-px bg-rule" />

        <h1 className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold tracking-tight">
          {resumeTitle}
        </h1>

        <span className="folio hidden shrink-0 sm:block">v{versionNumber}.0</span>

        <div className="tabbar ml-auto shrink-0 border-b-0 md:hidden">
          <button className="tab" data-active={pane === "form"} onClick={() => setPane("form")}>
            Edit
          </button>
          <button className="tab" data-active={pane === "preview"} onClick={() => setPane("preview")}>
            Preview
          </button>
        </div>
      </header>

      {draftAlert && (
        <div className="flex items-center gap-1.5 border-b border-marker/30 bg-marker-soft px-4 py-1.5 text-[11.5px] text-marker-dark">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
          Recovered a newer draft from this browser
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div
          className={`h-full min-h-0 w-full overflow-hidden md:block md:w-1/2 md:border-r md:border-rule ${
            pane === "form" ? "block" : "hidden"
          }`}
        >
          <EditorFormPanel store={store} editorState={editorState} resumeId={resumeId} />
        </div>

        <div
          className={`h-full min-h-0 w-full overflow-hidden md:block md:w-1/2 ${
            pane === "preview" ? "block" : "hidden"
          }`}
        >
          <EditorPreviewPanel
            store={store}
            editorState={editorState}
            resumeId={resumeId}
            resumeTitle={resumeTitle}
            autosaveStatus={autosaveStatus}
          />
        </div>
      </div>
    </div>
  );
}
