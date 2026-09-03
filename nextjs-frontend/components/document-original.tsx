"use client";

import { useEffect, useState } from "react";
import { documentFileUrl, type DocumentFileInfo } from "@/lib/api";
import { Markdown } from "@/components/markdown";

/**
 * The document as it was uploaded, straight from `GET /documents/{id}/file`: PDFs in the
 * browser's own viewer, markdown rendered from the original source (headings included — the
 * indexed sections keep those in `headingPath` instead), HTML in a sandboxed frame.
 */
export function DocumentOriginal({
    documentId,
    original,
}: {
    documentId: string;
    original: DocumentFileInfo;
}) {
    const url = documentFileUrl(documentId);

    if (original.mediaType === "application/pdf") {
        return (
            <iframe
                src={url}
                title={original.filename ?? "Original document"}
                className="h-[80vh] w-full rounded-xl border border-stone-200"
            />
        );
    }

    if (original.mediaType === "text/markdown") {
        return <OriginalMarkdown url={url} />;
    }

    return (
        <iframe
            src={url}
            title={original.filename ?? "Original document"}
            // Uploaded HTML is untrusted: no scripts, no forms, no navigation.
            sandbox=""
            className="h-[80vh] w-full rounded-xl border border-stone-200 bg-white"
        />
    );
}

function OriginalMarkdown({ url }: { url: string }) {
    const [state, setState] = useState<{ text: string | null; error: string | null }>({
        text: null,
        error: null,
    });

    useEffect(() => {
        let cancelled = false;
        fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed with ${response.status}`);
                return response.text();
            })
            .then((text) => {
                if (!cancelled) setState({ text, error: null });
            })
            .catch((e) => {
                if (!cancelled) {
                    setState({
                        text: null,
                        error: e instanceof Error ? e.message : "Failed to load the original file",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [url]);

    if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
    if (state.text === null) return <p className="text-sm text-stone-400">Loading original…</p>;

    return (
        <div className="rounded-xl border border-stone-200 p-6 text-[15px] leading-relaxed text-stone-700">
            <Markdown>{state.text}</Markdown>
        </div>
    );
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
