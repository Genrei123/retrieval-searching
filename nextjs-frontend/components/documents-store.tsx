"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getDocumentContent, getJobStatus, updateDocument, uploadDocument,
    type DocumentContent, type DocumentDto, type JobStatusResponse } from "@/lib/api";
import { useInvalidateDocuments } from "@/components/search-store";
import { useAsk } from "@/components/ask-store";

type Draft = { id: string | null; title: string; sourceUri: string; version: string; file: File | null };
const EMPTY: Draft = { id: null, title: "", sourceUri: "", version: "1", file: null };

function useDocumentsState() {
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done" | "failed">("idle");
    const [job, setJob] = useState<JobStatusResponse | null>(null);
    const [content, setContent] = useState<DocumentContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [formKey, setFormKey] = useState(0);
    const run = useRef(0);
    const active = useRef(false);
    const invalidate = useInvalidateDocuments();
    const { reset: resetAnswer } = useAsk();
    const busy = phase === "uploading" || phase === "processing";

    useEffect(() => () => { run.current++; }, []);

    const libraryChanged = useCallback(() => {
        invalidate();
        resetAnswer();
        setRefreshKey(k => k + 1);
    }, [invalidate, resetAnswer]);

    function edit(document?: DocumentDto) {
        if (active.current) return;
        setDraft(document ? { id: document.id, title: document.title, sourceUri: document.sourceUri ?? "",
            version: document.version ?? "1", file: null } : EMPTY);
        setPhase("idle"); setJob(null); setContent(null); setError(null); setFormKey(k => k + 1);
    }

    async function loadPreview(documentId: string) {
        try { setContent(await getDocumentContent(documentId)); setError(null); }
        catch (e) { setError(`Document saved. Chunk preview could not load: ${e instanceof Error ? e.message : "Try again."}`); }
    }

    async function submit() {
        if (active.current || !draft.title.trim() || !draft.version.trim() || (!draft.id && !draft.file)) return;
        active.current = true;
        const currentRun = ++run.current;
        setPhase("uploading"); setJob(null); setContent(null); setError(null);
        try {
            const input = { ...draft, title: draft.title.trim(), version: draft.version.trim() };
            const { jobId } = input.id ? await updateDocument(input.id, input)
                : await uploadDocument(input.file!, input.title, input.sourceUri, input.version);
            if (run.current !== currentRun) return;
            setPhase("processing");
            // Sequential polling avoids overlapping requests or a late response moving progress backwards.
            for (;;) {
                const next = await getJobStatus(jobId);
                if (run.current !== currentRun) return;
                setJob(next);
                if (next.status === "FAILED") throw new Error(next.message ?? "Ingestion failed.");
                if (next.status === "DONE" || next.status === "SKIPPED_UNCHANGED") {
                    setPhase("done");
                    libraryChanged();
                    if (next.documentId) await loadPreview(next.documentId);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 600));
                if (run.current !== currentRun) return;
            }
        } catch (e) {
            if (run.current === currentRun) {
                setPhase("failed"); setError(e instanceof Error ? e.message : "Upload failed.");
            }
        } finally { active.current = false; }
    }

    return { draft, setDraft, phase, job, content, error, busy, refreshKey, formKey, edit, submit, libraryChanged, loadPreview };
}

const DocumentsContext = createContext<ReturnType<typeof useDocumentsState> | null>(null);
export function DocumentsProvider({ children }: { children: React.ReactNode }) {
    const value = useDocumentsState();
    return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}
export function useDocuments() {
    const value = useContext(DocumentsContext);
    if (!value) throw new Error("DocumentsProvider is required");
    return value;
}
