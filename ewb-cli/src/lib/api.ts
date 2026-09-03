import { resolveApiBaseUrl } from "./config";

export type MatchType = "EXACT" | "SYNONYM" | "FUZZY";

export type SearchResult = {
    sectionId: string;
    documentId: string;
    documentTitle: string;
    headingPath: string | null;
    anchor: string | null;
    snippet: string;
    score: number;
    matchType: MatchType;
};

export type SearchResponse = {
    query: string;
    totalResults: number;
    page: number;
    size: number;
    tookMs: number;
    results: SearchResult[];
};

export type DocumentDto = {
    id: string;
    title: string;
    sourceUri: string | null;
    contentType: string;
    version: string;
    ingestedAt: string;
    checksum: string;
};

export type SearchOptions = {
    page?: number;
    size?: number;
    documentId?: string;
    signal?: AbortSignal;
};

export type AnswerStreamOptions = {
    topK?: number;
    documentId?: string;
};

export type EwbClient = {
    /** The resolved base URL this client talks to, e.g. `http://localhost:8080/api/v1`. */
    readonly baseUrl: string;
    search(query: string, opts?: SearchOptions): Promise<SearchResponse>;
    listDocuments(signal?: AbortSignal): Promise<DocumentDto[]>;
    /** URL for the SSE answer stream — pass it to `new EventSource(...)`. */
    answerStreamUrl(question: string, opts?: AnswerStreamOptions): string;
};

async function unwrap<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed with ${response.status}`);
    }
    return (await response.json()) as T;
}

/**
 * Typed wrapper over the retrieval-search REST API. Unlike the POC's module-level client, the
 * base URL is a parameter, so one page can host components pointed at different deployments.
 */
export function createEwbClient(apiBaseUrl?: string): EwbClient {
    const baseUrl = resolveApiBaseUrl(apiBaseUrl);

    return {
        baseUrl,

        async search(query, opts = {}) {
            const params = new URLSearchParams({ q: query });
            if (opts.page != null) params.set("page", String(opts.page));
            if (opts.size != null) params.set("size", String(opts.size));
            if (opts.documentId) params.set("documentId", opts.documentId);

            const response = await fetch(`${baseUrl}/search?${params}`, { signal: opts.signal });
            return unwrap<SearchResponse>(response);
        },

        async listDocuments(signal) {
            const response = await fetch(`${baseUrl}/documents`, { cache: "no-store", signal });
            return unwrap<DocumentDto[]>(response);
        },

        answerStreamUrl(question, opts = {}) {
            const params = new URLSearchParams({ q: question });
            if (opts.topK != null) params.set("topK", String(opts.topK));
            if (opts.documentId) params.set("documentId", opts.documentId);
            return `${baseUrl}/answer/stream?${params}`;
        },
    };
}
