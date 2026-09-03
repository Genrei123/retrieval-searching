"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDocument, listDocuments, type DocumentDto } from "@/lib/api";
import { documentHref } from "@/lib/links";

export function DocumentList({ refreshKey }: { refreshKey: number }) {
    const [documents, setDocuments] = useState<DocumentDto[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        listDocuments()
            .then((docs) => {
                if (!cancelled) setDocuments(docs);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load documents");
            });
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    async function handleDelete(id: string) {
        setDeletingId(id);
        try {
            await deleteDocument(id);
            setDocuments((prev) => prev?.filter((d) => d.id !== id) ?? null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setDeletingId(null);
        }
    }

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!documents) return <p className="text-sm text-stone-400">Loading documents…</p>;
    if (documents.length === 0)
        return <p className="text-sm text-stone-500">No documents uploaded yet.</p>;

    return (
        <ul className="flex flex-col gap-2">
            {documents.map((doc) => (
                <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 transition focus-within:border-stone-400 hover:border-stone-400"
                >
                    {/* Opens the document in the Search tab, which doubles as the reader. */}
                    <Link href={documentHref(doc.id)} className="min-w-0 flex-1 px-4 py-3">
                        <div className="truncate text-sm font-medium text-stone-900">
                            {doc.title}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                            {doc.contentType} · v{doc.version} ·{" "}
                            {new Date(doc.ingestedAt).toLocaleString()}
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="mr-4 shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                    >
                        {deletingId === doc.id ? "Removing…" : "Remove"}
                    </button>
                </li>
            ))}
        </ul>
    );
}
