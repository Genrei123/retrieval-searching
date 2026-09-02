"use client";

import { useRef, useState } from "react";
import { getJobStatus, uploadDocument, type JobStatus } from "@/lib/api";

type UploadState = {
    phase: "idle" | "uploading" | "polling" | "done" | "failed";
    message: string | null;
};

const POLL_INTERVAL_MS = 1000;

export function DocumentUpload({ onIngested }: { onIngested: () => void }) {
    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [state, setState] = useState<UploadState>({ phase: "idle", message: null });
    const fileInputRef = useRef<HTMLInputElement>(null);

    function pollJob(jobId: string) {
        setState({ phase: "polling", message: "Ingesting…" });

        const interval = setInterval(async () => {
            try {
                const job = await getJobStatus(jobId);
                if (isTerminal(job.status)) {
                    clearInterval(interval);
                    if (job.status === "DONE" || job.status === "SKIPPED_UNCHANGED") {
                        setState({ phase: "done", message: job.message ?? "Ingestion complete." });
                        onIngested();
                    } else {
                        setState({ phase: "failed", message: job.message ?? "Ingestion failed." });
                    }
                }
            } catch (e) {
                clearInterval(interval);
                setState({
                    phase: "failed",
                    message: e instanceof Error ? e.message : "Lost track of ingestion job.",
                });
            }
        }, POLL_INTERVAL_MS);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file || !title.trim()) return;

        setState({ phase: "uploading", message: null });
        try {
            const { jobId } = await uploadDocument(file, title.trim());
            pollJob(jobId);
        } catch (e) {
            setState({ phase: "failed", message: e instanceof Error ? e.message : "Upload failed" });
        }
    }

    function reset() {
        setTitle("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setState({ phase: "idle", message: null });
    }

    const busy = state.phase === "uploading" || state.phase === "polling";

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-5"
        >
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                    Title
                </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Spring Framework Reference"
                    disabled={busy}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 disabled:opacity-50"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                    File (PDF, Markdown, or HTML)
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.md,.markdown,.html,.htm"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={busy}
                    className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-50"
                />
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={busy || !file || !title.trim()}
                    className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? "Uploading…" : "Upload"}
                </button>
                {state.phase === "done" && (
                    <button
                        type="button"
                        onClick={reset}
                        className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800"
                    >
                        Upload another
                    </button>
                )}
                {state.message && (
                    <span
                        className={`text-sm ${
                            state.phase === "failed" ? "text-red-600" : "text-stone-500"
                        }`}
                    >
                        {state.message}
                    </span>
                )}
            </div>
        </form>
    );
}

function isTerminal(status: JobStatus): boolean {
    return status === "DONE" || status === "FAILED" || status === "SKIPPED_UNCHANGED";
}
