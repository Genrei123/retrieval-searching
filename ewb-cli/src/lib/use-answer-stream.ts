import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEwbClient, type SearchResult } from "./api";

export type AnswerStreamStatus = "idle" | "streaming" | "done" | "error";

export type AnswerStreamState = {
    question: string;
    answer: string;
    sources: SearchResult[];
    status: AnswerStreamStatus;
    error: string | null;
};

const INITIAL_STATE: AnswerStreamState = {
    question: "",
    answer: "",
    sources: [],
    status: "idle",
    error: null,
};

export type UseAnswerStreamOptions = {
    apiBaseUrl?: string;
    topK?: number;
    documentId?: string;
};

/**
 * Drives the backend's `GET /answer/stream` SSE endpoint: one `sources` event once retrieval
 * finishes, then a `token` event per chunk of generated text, then `done`.
 *
 * `EventSource` is browser-only, so it is created inside `ask` — never at module or render
 * time — which keeps the hook safe to import from a server-rendered page.
 */
export function useAnswerStream(options: UseAnswerStreamOptions = {}) {
    const { apiBaseUrl, topK, documentId } = options;
    const [state, setState] = useState<AnswerStreamState>(INITIAL_STATE);
    const sourceRef = useRef<EventSource | null>(null);

    const client = useMemo(() => createEwbClient(apiBaseUrl), [apiBaseUrl]);

    const stop = useCallback(() => {
        sourceRef.current?.close();
        sourceRef.current = null;
    }, []);

    // An unmount mid-stream would otherwise leave the connection open and the backend
    // generating into a socket nobody reads.
    useEffect(() => stop, [stop]);

    const ask = useCallback(
        (question: string) => {
            stop();
            setState({ question, answer: "", sources: [], status: "streaming", error: null });

            const es = new EventSource(client.answerStreamUrl(question, { topK, documentId }));
            sourceRef.current = es;

            es.addEventListener("sources", (event) => {
                const sources = JSON.parse((event as MessageEvent).data) as SearchResult[];
                setState((prev) => ({ ...prev, sources }));
            });

            es.addEventListener("token", (event) => {
                // The backend wraps each token as { token: "..." } so a word-initial leading
                // space survives: a raw "data: Section" line would have that one leading space
                // stripped by EventSource per the SSE spec.
                const { token } = JSON.parse((event as MessageEvent).data) as { token: string };
                setState((prev) => ({ ...prev, answer: prev.answer + token }));
            });

            es.addEventListener("done", () => {
                setState((prev) => ({ ...prev, status: "done" }));
                stop();
            });

            es.onerror = () => {
                setState((prev) =>
                    prev.status === "done"
                        ? prev
                        : { ...prev, status: "error", error: "Connection to the server was lost." },
                );
                stop();
            };
        },
        [client, documentId, stop, topK],
    );

    const reset = useCallback(() => {
        stop();
        setState(INITIAL_STATE);
    }, [stop]);

    return { ...state, ask, stop, reset };
}
