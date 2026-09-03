"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useAnswerStream } from "@/hooks/use-answer-stream";

type AskStore = ReturnType<typeof useAnswerStream> & {
    input: string;
    setInput: (value: string) => void;
};

const AskContext = createContext<AskStore | null>(null);

/**
 * Holds the Ask tab's draft question, its answer, and the live SSE connection. It lives in the
 * root layout rather than in `app/page.tsx` so that switching tabs — which unmounts the page —
 * keeps the conversation on screen, and so an in-flight answer keeps streaming while you're off
 * reading a source document.
 */
export function AskProvider({ children }: { children: React.ReactNode }) {
    const stream = useAnswerStream();
    const [input, setInput] = useState("");

    const value = useMemo(() => ({ ...stream, input, setInput }), [stream, input]);

    return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
}

export function useAsk(): AskStore {
    const store = useContext(AskContext);
    if (!store) {
        throw new Error("useAsk must be used inside <AskProvider>");
    }
    return store;
}
