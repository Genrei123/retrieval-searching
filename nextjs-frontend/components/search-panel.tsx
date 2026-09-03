"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { documentFileUrl, search, type SearchResult } from "@/lib/api";
import { documentHref } from "@/lib/links";
import { ALL_SCOPE, useSearchSlot } from "@/components/search-store";
import { DocumentSections, scrollToSection, useDocumentContent } from "@/components/document-view";
import { DocumentOriginal, formatBytes } from "@/components/document-original";
import { Snippet } from "@/components/snippet";

const PAGE_SIZE = 10;

export function SearchPanel() {
    const params = useSearchParams();
    const documentId = params.get("documentId");
    const sectionParam = params.get("section");

    const scope = documentId ?? ALL_SCOPE;
    const [slot, patchSlot] = useSearchSlot(scope);
    const [loading, setLoading] = useState(false);
    const { content, error: documentError } = useDocumentContent(documentId);

    // The highlighted section follows the URL when you arrive from an answer source or another
    // result, then moves locally as you click through hits inside the open document. Tagging the
    // local pick with the URL it was made under lets a new link win without an effect.
    const urlKey = `${documentId}#${sectionParam}`;
    const [pickedSection, setPickedSection] = useState<{ urlKey: string; sectionId: string } | null>(
        null,
    );
    const focusSectionId =
        pickedSection?.urlKey === urlKey ? pickedSection.sectionId : sectionParam;

    // Arriving at a cited passage opens the indexed sections, where that passage can be
    // highlighted; opening a document with no passage in mind shows the file as uploaded.
    const original = content?.original ?? null;
    const defaultView = !sectionParam && original ? "original" : "sections";
    const [pickedView, setPickedView] = useState<{ urlKey: string; view: DocumentView } | null>(null);
    const view = pickedView?.urlKey === urlKey ? pickedView.view : defaultView;

    const { result, error, input, page } = slot;

    async function runSearch(query: string, targetPage: number) {
        setLoading(true);
        patchSlot({ error: null });
        try {
            const response = await search(query, {
                page: targetPage,
                size: PAGE_SIZE,
                documentId: documentId ?? undefined,
            });
            patchSlot({ result: response, page: targetPage });
        } catch (e) {
            patchSlot({ error: e instanceof Error ? e.message : "Search failed" });
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;
        runSearch(trimmed, 0);
    }

    function openSection(sectionId: string) {
        setPickedSection({ urlKey, sectionId });
        setPickedView({ urlKey, view: "sections" });
        scrollToSection(sectionId);
    }

    const totalPages = result ? Math.max(1, Math.ceil(result.totalResults / result.size)) : 0;

    return (
        <div className="flex flex-col gap-6">
            {documentId && (
                <div className="flex flex-col gap-3">
                    <Link
                        href="/documents"
                        className="text-sm text-stone-500 underline-offset-2 transition hover:text-stone-900 hover:underline"
                    >
                        ← Back to all documents
                    </Link>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
                        <div className="text-sm font-medium text-stone-900">
                            {content?.document.title ?? "Loading document…"}
                        </div>
                        {content && (
                            <div className="mt-0.5 text-xs text-stone-400">
                                {content.document.contentType} · v{content.document.version} ·{" "}
                                {content.sections.length} section
                                {content.sections.length === 1 ? "" : "s"} ·{" "}
                                {new Date(content.document.ingestedAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => patchSlot({ input: e.target.value })}
                    placeholder={
                        documentId ? "Search within this document…" : "Search document sections…"
                    }
                    className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-[15px] outline-none focus:border-stone-500"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {loading ? "Searching…" : "Search"}
                </button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {result && (
                <div className="flex flex-col gap-4">
                    <div className="text-xs text-stone-400">
                        {result.totalResults} result{result.totalResults === 1 ? "" : "s"} for
                        &nbsp;&ldquo;{result.query}&rdquo; ({result.tookMs}ms)
                    </div>

                    {result.results.length === 0 && (
                        <p className="text-sm text-stone-500">No matches found.</p>
                    )}

                    <ul className="flex flex-col gap-3">
                        {result.results.map((r) =>
                            documentId ? (
                                <li key={r.sectionId}>
                                    <button
                                        type="button"
                                        onClick={() => openSection(r.sectionId)}
                                        className="w-full rounded-xl border border-stone-200 p-4 text-left transition hover:border-stone-400"
                                    >
                                        <ResultBody hit={r} action="Jump to passage" />
                                    </button>
                                </li>
                            ) : (
                                <li key={r.sectionId}>
                                    <Link
                                        href={documentHref(r.documentId, r.sectionId)}
                                        className="block rounded-xl border border-stone-200 p-4 transition hover:border-stone-400"
                                    >
                                        <ResultBody hit={r} action="Open in document" />
                                    </Link>
                                </li>
                            ),
                        )}
                    </ul>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                disabled={page === 0 || loading}
                                onClick={() => runSearch(result.query, page - 1)}
                                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-stone-500">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page + 1 >= totalPages || loading}
                                onClick={() => runSearch(result.query, page + 1)}
                                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {documentId && (
                <div className="flex flex-col gap-4 border-t border-stone-200 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex rounded-lg border border-stone-300 p-0.5 text-sm">
                            <ViewTab
                                active={view === "original"}
                                disabled={!original}
                                onClick={() => setPickedView({ urlKey, view: "original" })}
                            >
                                Original file
                            </ViewTab>
                            <ViewTab
                                active={view === "sections"}
                                onClick={() => setPickedView({ urlKey, view: "sections" })}
                            >
                                Indexed sections
                            </ViewTab>
                        </div>
                        {original && (
                            <a
                                href={documentFileUrl(documentId)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-900"
                            >
                                {original.filename ?? "Original file"} ({formatBytes(original.byteSize)})
                                — open in a new tab
                            </a>
                        )}
                    </div>

                    {documentError && <p className="text-sm text-red-600">{documentError}</p>}
                    {!documentError && !content && (
                        <p className="text-sm text-stone-400">Loading document…</p>
                    )}

                    {content && view === "original" && original && (
                        <DocumentOriginal documentId={documentId} original={original} />
                    )}
                    {content && view === "sections" && (
                        <>
                            {!original && (
                                <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                                    This document was ingested before the original file was kept, so only
                                    the indexed sections are available. Upload the file again on the
                                    Documents tab to store the original.
                                </p>
                            )}
                            <DocumentSections content={content} focusSectionId={focusSectionId} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

type DocumentView = "original" | "sections";

function ViewTab({
    active,
    disabled,
    onClick,
    children,
}: {
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={disabled ? "No original file stored for this document" : undefined}
            className={`rounded-md px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? "bg-stone-950 text-white" : "text-stone-600 hover:text-stone-900"
            }`}
        >
            {children}
        </button>
    );
}

function ResultBody({ hit, action }: { hit: SearchResult; action: string }) {
    return (
        <>
            <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-stone-900">
                    {hit.documentTitle}
                    {hit.headingPath && (
                        <span className="font-normal text-stone-500"> — {hit.headingPath}</span>
                    )}
                </span>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                    {hit.matchType.toLowerCase()}
                </span>
            </div>
            <Snippet text={hit.snippet} className="text-sm leading-relaxed text-stone-600" />
            <span className="mt-2 inline-block text-xs text-stone-400">{action} →</span>
        </>
    );
}
