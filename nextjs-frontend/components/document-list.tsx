"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDocument, listDocuments, type DocumentDto } from "@/lib/api";
import { documentHref } from "@/lib/links";
import { useDocuments } from "@/components/documents-store";

export function DocumentList() {
    const { refreshKey, edit, busy, libraryChanged, draft } = useDocuments();
    const [documents, setDocuments] = useState<DocumentDto[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        listDocuments()
            .then((docs) => {
                if (!cancelled) { setDocuments(docs); setError(null); }
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
        setError(null);
        try {
            await deleteDocument(id);
            setDocuments((prev) => prev?.filter((d) => d.id !== id) ?? null);
            setConfirmId(null);
            if (draft.id === id) edit();
            libraryChanged();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setDeletingId(null);
        }
    }

    if (error && !documents) return <p role="alert" className="text-sm text-red-600">{error}</p>;
    if (!documents) return <p className="text-sm text-stone-400">Loading documents…</p>;
    if (documents.length === 0)
        return <p className="text-sm text-stone-500">No documents uploaded yet.</p>;

    return (
        <section aria-label="Document library">
        <h2 className="mb-4 text-lg font-medium">Document library <span className="text-sm text-stone-400">({documents.length})</span></h2>
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
        <ul className="flex flex-col gap-2">
            {documents.map((doc) => (
                <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 transition focus-within:border-stone-400 hover:border-stone-400"
                >
                    {/* Opens the document in the Search tab, which doubles as the reader. */}
                    <Link href={documentHref(doc.id)} className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-stone-900">
                            {doc.title}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                            {doc.contentType} · v{doc.version} ·{" "}
                            {new Date(doc.ingestedAt).toLocaleString()}
                        </div>
                        <span className="mt-1 inline-block text-xs text-teal-700">Read / search →</span>
                    </Link>
                    <button type="button" disabled={busy || deletingId !== null} onClick={() => {
                        edit(doc);
                        document.getElementById("document-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40">Edit / Replace file</button>
                    <button
                        type="button"
                        onClick={() => setConfirmId(doc.id)}
                        disabled={busy || deletingId !== null}
                        className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                    >
                        {deletingId === doc.id ? "Deleting…" : "Delete"}
                    </button>
                    {confirmId === doc.id && <div className="flex w-full flex-wrap items-center gap-3 border-t border-stone-200 pt-3 text-sm">
                        <p>Delete this document, its original file, and all its chunks?</p>
                        <button disabled={busy || deletingId !== null} onClick={() => void handleDelete(doc.id)} className="font-medium text-red-600 disabled:opacity-40">Delete document</button>
                        <button disabled={deletingId !== null} onClick={() => setConfirmId(null)} className="text-stone-500">Cancel</button>
                    </div>}
                </li>
            ))}
        </ul>
        </section>
    );
}
