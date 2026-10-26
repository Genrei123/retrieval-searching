"use client";

import { useDocuments } from "@/components/documents-store";
import { ChunkingProgress } from "@/components/chunking-progress";

export function DocumentUpload() {
    const { draft, setDraft, busy, phase, error, job, content, formKey, edit, submit, loadPreview } = useDocuments();
    const field = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 disabled:opacity-50";
    return (
        <section id="document-editor" className="scroll-mt-6 space-y-5">
            <form onSubmit={e => { e.preventDefault(); void submit(); }} className="rounded-2xl border border-stone-200 p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-medium">{draft.id ? "Edit document" : "Upload a document"}</h2>
                    {(draft.id || phase === "done") && <button type="button" disabled={busy} onClick={() => edit()}
                        className="text-sm text-stone-500 underline underline-offset-4 disabled:opacity-40">{draft.id ? "Cancel edit" : "Upload another"}</button>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm sm:col-span-2"><span>Title</span>
                        <input required maxLength={200} value={draft.title} disabled={busy} className={field}
                            placeholder="Dataset or document title" onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
                    </label>
                    <label className="space-y-1.5 text-sm"><span>Source / reference (optional)</span>
                        <input value={draft.sourceUri} disabled={busy} maxLength={2000} className={field}
                            placeholder="Where this document came from" onChange={e => setDraft(d => ({ ...d, sourceUri: e.target.value }))} />
                    </label>
                    <label className="space-y-1.5 text-sm"><span>Version</span>
                        <input required maxLength={50} value={draft.version} disabled={busy} className={field}
                            onChange={e => setDraft(d => ({ ...d, version: e.target.value }))} />
                    </label>
                    <label className="space-y-2 text-sm sm:col-span-2"><span>{draft.id ? "Replace file (optional)" : "File"}</span>
                        <input key={formKey} type="file" accept=".pdf,.md,.markdown,.html,.htm" disabled={busy}
                            onChange={e => setDraft(d => ({ ...d, file: e.target.files?.[0] ?? null }))}
                            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm disabled:opacity-50" />
                        <p className="text-xs text-stone-500">PDF, Markdown, or HTML · Up to 25 MB. {draft.id && "Leave the file empty to keep the existing content and chunks."}</p>
                        {draft.file && <p className="text-xs text-stone-600">Selected: {draft.file.name} ({(draft.file.size / 1024).toFixed(1)} KB)</p>}
                    </label>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button disabled={busy || !draft.title.trim() || !draft.version.trim() || (!draft.id && !draft.file)}
                        className="rounded-lg bg-stone-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {phase === "uploading" ? "Transferring file…" : busy ? "Processing…" : draft.id ? "Save changes" : "Upload & inspect chunks"}
                    </button>
                    {phase === "done" && <span role="status" className="text-sm text-emerald-700">{job?.message ?? "Document saved."}</span>}
                    {busy && <span role="status" className="text-xs text-stone-500">You can switch tabs; processing will continue.</span>}
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                {phase === "done" && !content && job?.documentId && <button type="button" onClick={() => void loadPreview(job.documentId!)}
                    className="mt-2 text-sm underline">Load chunk preview</button>}
            </form>
            {phase !== "idle" && <ChunkingProgress key={job?.jobId ?? "transferring"} phase={phase} job={job} content={content} />}
        </section>
    );
}