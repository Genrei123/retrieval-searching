"use client";

import Link from "next/link";
import { useState } from "react";
import type { DocumentContent, JobStatusResponse } from "@/lib/api";
import { documentHref } from "@/lib/links";

const STEPS = ["Transfer", "Extract text", "Create chunks", "Index & save"];
const PAGE_SIZE = 12;
export function ChunkingProgress({ phase, job, content }: {
    phase: string; job: JobStatusResponse | null; content: DocumentContent | null;
}) {
    const [page, setPage] = useState(0);
    const progress = job?.progress;
    const retained = job?.status === "SKIPPED_UNCHANGED";
    const done = phase === "done";
    const failed = phase === "failed";
    const step = done ? 4 : phase === "uploading" ? 0 : progress?.stage === "INDEXING" ? 3
        : progress?.stage === "CHUNKING" ? 2 : 1;
    const chunks = content ? content.sections.map(s => ({ ...s, wordCount: s.body.trim().split(/\s+/).length, preview: s.body }))
        : progress?.chunks ?? [];
    const total = content?.sections.length ?? progress?.totalChunks ?? 0;
    const maxWords = progress?.maxWords ?? 800;
    const shownPage = Math.min(page, Math.max(0, Math.ceil(chunks.length / PAGE_SIZE) - 1));
    const visible = chunks.slice(shownPage * PAGE_SIZE, (shownPage + 1) * PAGE_SIZE);
    const words = content ? chunks.reduce((sum, c) => sum + c.wordCount, 0) : progress?.extractedWords ?? 0;
    return (
        <section aria-label="Chunking process" className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/50">
            <div className="border-b border-stone-200 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-medium">{retained ? "Existing chunks retained" : "From document to searchable chunks"}</h2>
                    <span role="status" className={failed ? "text-sm text-red-600" : "text-sm text-stone-500"}>
                        {failed ? "Processing stopped" : retained ? "No re-chunking needed" : done ? "Indexed and ready for search" : "Processing your file"}
                    </span>
                </div>
                {!retained && <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Upload stages">
                    {STEPS.map((label, i) => <li key={label} aria-current={!done && step === i ? "step" : undefined}
                        className={"rounded-xl border p-3 text-sm " + (i < step ? "border-emerald-200 bg-emerald-50 text-emerald-800" : i === step ? "border-amber-300 bg-amber-50 text-amber-900" : "border-stone-200 text-stone-400")}>
                        <span className="mr-2 font-mono text-xs">{i < step ? "✓" : i + 1}</span>{label}
                    </li>)}
                </ol>}
                <div className="mt-5 grid grid-cols-3 gap-3">
                    {[{label: "Words", value: words.toLocaleString()}, {label: "Chunks", value: total.toLocaleString()},
                        {label: "Maximum / chunk", value: maxWords + " words"}].map(item => <div key={item.label}>
                            <p className="text-xs text-stone-500">{item.label}</p><p className="mt-1 text-lg font-medium tabular-nums">{item.value}</p>
                        </div>)}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-stone-600">
                    {progress?.strategy === "HEADINGS" || content?.document.contentType === "markdown" || content?.document.contentType === "html"
                        ? "Split at H1–H3 headings; oversized sections are grouped by paragraph."
                        : "Group extracted text by sentence boundaries."} Long paragraphs or sentences are split to respect the {maxWords}-word limit.
                    Groups aim for {progress?.targetWords ?? 400} words; neighbors shorter than {progress?.minWords ?? 50} words are merged when they fit.
                </p>
            </div>
            <div className="p-5 sm:p-6">
                {chunks.length === 0 ? <p className="text-sm text-stone-500">{done ? "Loading indexed chunks…" : "Chunk cards will appear when the backend finishes splitting the text."}</p> : <>
                    <p className="mb-3 text-xs text-stone-500">Each card is an actual chunk, in document order. Bar length shows words relative to the {maxWords}-word limit.</p>
                    {!content && <p className="mb-3 text-xs text-amber-800">Preview excerpts only{total > chunks.length ? `; showing the first ${chunks.length} of ${total} chunks` : ""}. Full chunk text loads after saving.</p>}
                    <div className="grid gap-3 md:grid-cols-2">
                        {visible.map(chunk => <article key={chunk.ordinal} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
                            <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="font-mono text-stone-500">CHUNK {String(chunk.ordinal + 1).padStart(3, "0")}</span>
                                <span className="tabular-nums text-stone-600">{chunk.wordCount} words</span></div>
                            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-teal-600" style={{width: Math.min(100, chunk.wordCount / maxWords * 100) + "%"}} /></div>
                            <h3 className="mb-2 break-words text-sm font-medium">{chunk.headingPath ?? "Sentence group"}</h3>
                            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{chunk.preview}</p>
                            {content && <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-teal-700">Inspect full chunk</summary>
                                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-3 font-sans text-sm leading-relaxed">{chunk.preview}</pre>
                            </details>}
                        </article>)}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="text-stone-500">Chunks {shownPage * PAGE_SIZE + 1}–{Math.min((shownPage + 1) * PAGE_SIZE, chunks.length)} of {chunks.length}</span>
                        <div className="flex gap-3"><button disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} className="disabled:opacity-30">Previous</button>
                            <button disabled={(shownPage + 1) * PAGE_SIZE >= chunks.length} onClick={() => setPage(shownPage + 1)} className="disabled:opacity-30">Next</button></div>
                    </div>
                </>}
                {content && <Link href={documentHref(content.document.id)} className="mt-5 inline-block text-sm font-medium text-teal-700 underline underline-offset-4">Read or search this document →</Link>}
            </div>
        </section>
    );
}
