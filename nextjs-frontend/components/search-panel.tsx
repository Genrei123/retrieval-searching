"use client";

import { useState } from "react";
import { search, type SearchResponse } from "@/lib/api";

const PAGE_SIZE = 10;

export function SearchPanel() {
    const [input, setInput] = useState("");
    const [page, setPage] = useState(0);
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function runSearch(query: string, targetPage: number) {
        setLoading(true);
        setError(null);
        try {
            const response = await search(query, { page: targetPage, size: PAGE_SIZE });
            setResult(response);
            setPage(targetPage);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Search failed");
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

    const totalPages = result ? Math.max(1, Math.ceil(result.totalResults / result.size)) : 0;

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Search document sections…"
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
                        {result.results.map((r) => (
                            <li
                                key={r.sectionId}
                                className="rounded-xl border border-stone-200 p-4"
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-stone-900">
                                        {r.documentTitle}
                                        {r.headingPath && (
                                            <span className="font-normal text-stone-500">
                                                {" "}
                                                — {r.headingPath}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-500">
                                        {r.matchType.toLowerCase()}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed text-stone-600">
                                    {r.snippet}
                                </p>
                            </li>
                        ))}
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
        </div>
    );
}
