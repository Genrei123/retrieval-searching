import { useCallback, useMemo, useState, type FormEvent } from "react";
import { createEwbClient, type SearchResponse, type SearchResult } from "../lib/api";
import { Snippet } from "./snippet";
import { ResultCard } from "./result-card";
import { Button } from "./button";
import { cx } from "../lib/cx";

export type SearchProps = {
    /**
     * Base URL of your retrieval-search backend. Defaults to `NEXT_PUBLIC_EWB_API_URL`, then
     * `http://localhost:8080/api/v1`.
     */
    apiBaseUrl?: string;
    /** Restrict the search to a single document. */
    documentId?: string;
    pageSize?: number;
    placeholder?: string;
    /** Called when a result is clicked. Without this and `resultHref`, results are inert. */
    onResultClick?: (result: SearchResult) => void;
    /** Builds an href for a result — use it to link into your own document reader. */
    resultHref?: (result: SearchResult) => string;
    className?: string;
};

/**
 * Full-text search over the backend's indexed document sections. Renders the Postgres
 * `ts_headline` snippets with their highlights intact and tags each hit as an exact or
 * synonym-expanded match.
 */
export function Search({
    apiBaseUrl,
    documentId,
    pageSize = 10,
    placeholder = "Search document sections…",
    onResultClick,
    resultHref,
    className,
}: SearchProps) {
    const client = useMemo(() => createEwbClient(apiBaseUrl), [apiBaseUrl]);

    const [input, setInput] = useState("");
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const runSearch = useCallback(
        async (query: string, targetPage: number) => {
            setLoading(true);
            setError(null);
            try {
                const response = await client.search(query, {
                    page: targetPage,
                    size: pageSize,
                    documentId,
                });
                setResult(response);
                setPage(targetPage);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Search failed");
            } finally {
                setLoading(false);
            }
        },
        [client, documentId, pageSize],
    );

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;
        void runSearch(trimmed, 0);
    }

    const totalPages = result ? Math.max(1, Math.ceil(result.totalResults / result.size)) : 0;

    return (
        <div className={cx("ewb-root", "ewb-search", className)}>
            <form onSubmit={handleSubmit} className="ewb-search__form">
                <input
                    aria-label="Search query"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    className="ewb-input ewb-search__input"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                    {loading ? "Searching…" : "Search"}
                </Button>
            </form>

            {error && (
                <p className="ewb-error" role="alert">
                    {error}
                </p>
            )}

            {result && (
                <div className="ewb-search__results">
                    <div className="ewb-search__meta">
                        {result.totalResults} result{result.totalResults === 1 ? "" : "s"} for
                        &nbsp;&ldquo;{result.query}&rdquo; ({result.tookMs}ms)
                    </div>

                    {result.results.length === 0 && (
                        <p className="ewb-muted">No matches found.</p>
                    )}

                    <ul className="ewb-list">
                        {result.results.map((hit) => (
                            <li key={hit.sectionId}>
                                <ResultCard
                                    href={resultHref?.(hit)}
                                    onClick={onResultClick ? () => onResultClick(hit) : undefined}
                                >
                                    <div className="ewb-card__row">
                                        <span className="ewb-card__title">
                                            {hit.documentTitle}
                                            {hit.headingPath && (
                                                <span className="ewb-card__heading">
                                                    {" "}
                                                    — {hit.headingPath}
                                                </span>
                                            )}
                                        </span>
                                        <span className="ewb-badge">
                                            {hit.matchType.toLowerCase()}
                                        </span>
                                    </div>
                                    <Snippet text={hit.snippet} />
                                </ResultCard>
                            </li>
                        ))}
                    </ul>

                    {totalPages > 1 && (
                        <div className="ewb-pager">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => void runSearch(result.query, page - 1)}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {page + 1} of {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page + 1 >= totalPages || loading}
                                onClick={() => void runSearch(result.query, page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
