import { API_BASE_URL } from "@/lib/config";

export type MatchType = "EXACT" | "SYNONYM" | "FUZZY";

export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED_UNCHANGED";

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

export type DocumentSectionDto = {
    id: string;
    ordinal: number;
    headingPath: string | null;
    anchor: string | null;
    body: string;
};

/** Describes the file as uploaded. Null for documents ingested before the backend kept
 * originals — those can only be read as sections until the file is uploaded again. */
export type DocumentFileInfo = {
    filename: string | null;
    mediaType: string;
    byteSize: number;
};

export type DocumentContent = {
    document: DocumentDto;
    original: DocumentFileInfo | null;
    sections: DocumentSectionDto[];
};

export type IngestResponse = { jobId: string };

export type JobStatusResponse = {
    jobId: string;
    status: JobStatus;
    message: string | null;
    documentId: string | null;
};

async function unwrap<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed with ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export async function search(
    query: string,
    opts: { page?: number; size?: number; documentId?: string } = {},
): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (opts.page != null) params.set("page", String(opts.page));
    if (opts.size != null) params.set("size", String(opts.size));
    if (opts.documentId) params.set("documentId", opts.documentId);

    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    return unwrap<SearchResponse>(response);
}

export async function listDocuments(): Promise<DocumentDto[]> {
    const response = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
    return unwrap<DocumentDto[]>(response);
}

export async function getDocument(id: string): Promise<DocumentDto> {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, { cache: "no-store" });
    return unwrap<DocumentDto>(response);
}

/** The document plus all of its sections in reading order — used to show a search hit or an
 * answer source inside the document it came from. */
export async function getDocumentContent(id: string): Promise<DocumentContent> {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/content`, { cache: "no-store" });
    return unwrap<DocumentContent>(response);
}

/** The original file, served with its own media type — embed it (PDF) or fetch it (markdown,
 * HTML) rather than reconstructing the document from sections. */
export function documentFileUrl(id: string): string {
    return `${API_BASE_URL}/documents/${id}/file`;
}

export async function uploadDocument(
    file: File,
    title: string,
    sourceUri?: string,
): Promise<IngestResponse> {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    if (sourceUri) form.append("sourceUri", sourceUri);

    const response = await fetch(`${API_BASE_URL}/documents`, {
        method: "POST",
        body: form,
    });
    return unwrap<IngestResponse>(response);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/jobs/${jobId}`, { cache: "no-store" });
    return unwrap<JobStatusResponse>(response);
}

export async function deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Delete failed with ${response.status}`);
    }
}

export function answerStreamUrl(question: string, opts: { topK?: number; documentId?: string } = {}): string {
    const params = new URLSearchParams({ q: question });
    if (opts.topK != null) params.set("topK", String(opts.topK));
    if (opts.documentId) params.set("documentId", opts.documentId);
    return `${API_BASE_URL}/answer/stream?${params}`;
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                    */
/* -------------------------------------------------------------------------- */

/** `PERSONAL` entries are the planner and are editable; `HOLIDAY` rows are seeded
 * reference data and the backend refuses writes against them. */
export type EventKind = "PERSONAL" | "HOLIDAY";

export type CalendarEvent = {
    id: string;
    /** `YYYY-MM-DD`, a plain calendar day with no timezone attached to it. */
    date: string;
    /** `HH:mm:ss`, or null for an all-day entry. Every holiday is all-day. */
    startTime: string | null;
    title: string;
    notes: string | null;
    kind: EventKind;
    createdAt: string;
};

export type CalendarEventInput = {
    date: string;
    startTime?: string | null;
    title: string;
    notes?: string | null;
};

/** Everything between two days, inclusive — one month of the calendar grid per call. */
export async function listCalendar(from: string, to: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({ from, to });
    const response = await fetch(`${API_BASE_URL}/calendar?${params}`, { cache: "no-store" });
    return unwrap<CalendarEvent[]>(response);
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const response = await fetch(`${API_BASE_URL}/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return unwrap<CalendarEvent>(response);
}

export async function updateCalendarEvent(
    id: string,
    input: CalendarEventInput,
): Promise<CalendarEvent> {
    const response = await fetch(`${API_BASE_URL}/calendar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return unwrap<CalendarEvent>(response);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/calendar/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Delete failed with ${response.status}`);
    }
}
