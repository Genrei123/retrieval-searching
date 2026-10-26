"use client";

import { useCallback, useRef, useState } from "react";
import { answerStreamUrl, type SearchResult } from "@/lib/api";

type StreamState = {
    question: string;
    answer: string;
    sources: SearchResult[];
    status: "idle" | "streaming" | "done" | "error";
    error: string | null;
    cached: boolean;
};

const INITIAL_STATE: StreamState = {
    question: "",
    answer: "",
    sources: [],
    status: "idle",
    error: null,
    cached: false,
};

/** Drives the /answer/stream SSE endpoint: emits a `sources` event once retrieval finishes,
 * then a `token` event per chunk of generated text, then `done`. */
export function useAnswerStream() {
    const [state, setState] = useState<StreamState>(INITIAL_STATE);
    const sourceRef = useRef<EventSource | null>(null);

    const stop = useCallback(() => {
        sourceRef.current?.close();
        sourceRef.current = null;
    }, []);

    const ask = useCallback(
        (question: string, opts: { topK?: number; documentId?: string } = {}) => {
            stop();
            setState({ ...INITIAL_STATE, question, status: "streaming" });

            const es = new EventSource(answerStreamUrl(question, opts));
            sourceRef.current = es;

            es.addEventListener("sources", (event) => {
                if (sourceRef.current !== es) return;
                const sources = JSON.parse((event as MessageEvent).data) as SearchResult[];
                setState((prev) => ({ ...prev, sources }));
            });

            es.addEventListener("token", (event) => {
                if (sourceRef.current !== es) return;
                // The backend wraps each token as { token: "..." } so a word-initial leading
                // space survives: a raw "data: Section" line would have that one leading space
                // stripped by EventSource per the SSE spec.
                const { token } = JSON.parse((event as MessageEvent).data) as { token: string };
                setState((prev) => ({ ...prev, answer: prev.answer + token }));
            });

            es.addEventListener("cache", (event) => {
                if (sourceRef.current !== es) return;
                const { cached } = JSON.parse((event as MessageEvent).data) as { cached: boolean };
                setState((prev) => ({ ...prev, cached }));
            });

            es.addEventListener("done", () => {
                if (sourceRef.current !== es) return;
                setState((prev) => ({ ...prev, status: "done" }));
                stop();
            });

            es.addEventListener("generation-error", (event) => {
                if (sourceRef.current !== es) return;
                const { message } = JSON.parse((event as MessageEvent).data) as { message: string };
                setState((prev) => ({ ...prev, status: "error", error: message }));
                stop();
            });

            es.onerror = () => {
                if (sourceRef.current !== es) return;
                setState((prev) =>
                    prev.status === "done"
                        ? prev
                        : { ...prev, status: "error", error: "Connection to the server was lost." },
                );
                stop();
            };
        },
        [stop],
    );

    const reset = useCallback(() => {
        stop();
        setState(INITIAL_STATE);
    }, [stop]);

    return { ...state, ask, stop, reset };
}
