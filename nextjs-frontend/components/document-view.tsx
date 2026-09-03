"use client";

import { useEffect, useState } from "react";
import { getDocumentContent, type DocumentContent } from "@/lib/api";
import { useDocumentCache } from "@/components/search-store";
import { Markdown } from "@/components/markdown";

export function sectionDomId(sectionId: string): string {
    return `section-${sectionId}`;
}

export function scrollToSection(sectionId: string) {
    document
        .getElementById(sectionDomId(sectionId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Loads a document and every section indexed for it, memoised for the session so re-opening one
 * from another result is instant. */
export function useDocumentContent(documentId: string | null) {
    const cache = useDocumentCache();
    // Only the outcome of a fetch is state; a cache hit is read straight through during render,
    // which is what makes going back to an already-opened document instant.
    const [settled, setSettled] = useState<{ documentId: string; error: string | null } | null>(null);

    useEffect(() => {
        if (!documentId || cache.get(documentId)) return;

        let cancelled = false;
        getDocumentContent(documentId)
            .then((fetched) => {
                cache.set(fetched);
                if (!cancelled) setSettled({ documentId, error: null });
            })
            .catch((e) => {
                if (!cancelled) {
                    setSettled({
                        documentId,
                        error: e instanceof Error ? e.message : "Failed to load document",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
        // `cache` is ref-backed and stable across renders.
    }, [documentId, cache]);

    const content = documentId ? cache.get(documentId) ?? null : null;
    const error = settled?.documentId === documentId ? settled.error : null;

    return { content, error };
}

/**
 * The document behind a search hit or an answer source, rebuilt from the sections that were
 * indexed for it — so what you read is exactly what retrieval matched against. `focusSectionId`
 * is the cited section: highlighted, and scrolled into view once the content lands.
 */
export function DocumentSections({
    content,
    focusSectionId,
}: {
    content: DocumentContent;
    focusSectionId?: string | null;
}) {
    useEffect(() => {
        if (focusSectionId) scrollToSection(focusSectionId);
    }, [content, focusSectionId]);

    if (content.sections.length === 0) {
        return <p className="text-sm text-stone-500">This document has no indexed sections.</p>;
    }

    const isMarkdown = content.document.contentType === "markdown";

    return (
        <div className="flex flex-col gap-4">
            {content.sections.map((section) => {
                const focused = section.id === focusSectionId;
                return (
                    <article
                        key={section.id}
                        id={sectionDomId(section.id)}
                        className={`scroll-mt-24 rounded-xl border p-5 transition ${
                            focused ? "border-amber-300 bg-amber-50/50" : "border-stone-200 bg-white"
                        }`}
                    >
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <h2 className="text-sm font-medium text-stone-900">
                                {section.headingPath ?? `Section ${section.ordinal + 1}`}
                            </h2>
                            {focused && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-800">
                                    Referenced
                                </span>
                            )}
                        </div>
                        <div className="text-[15px] leading-relaxed text-stone-700">
                            {isMarkdown ? (
                                <Markdown>{section.body}</Markdown>
                            ) : (
                                <p className="whitespace-pre-wrap">{section.body}</p>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
