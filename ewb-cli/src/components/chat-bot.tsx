import { useState, type FormEvent } from "react";
import { useAnswerStream } from "../lib/use-answer-stream";
import type { SearchResult } from "../lib/api";
import { Markdown } from "./markdown";
import { Snippet } from "./snippet";
import { ResultCard } from "./result-card";
import { Button } from "./button";
import { cx } from "../lib/cx";

export type ChatBotProps = {
    /**
     * Base URL of your retrieval-search backend, e.g. `https://rag.acme.internal/api/v1`.
     * Defaults to `NEXT_PUBLIC_EWB_API_URL`, then `http://localhost:8080/api/v1`.
     */
    apiBaseUrl?: string;
    /** How many sections to retrieve as context. The backend clamps this to 1–10. */
    topK?: number;
    /** Restrict retrieval to a single document. */
    documentId?: string;
    placeholder?: string;
    /** Called when a citation is clicked. Without this and `sourceHref`, sources are inert. */
    onSourceClick?: (source: SearchResult) => void;
    /** Builds an href for a citation — use it to link into your own document reader. */
    sourceHref?: (source: SearchResult) => string;
    className?: string;
};

/**
 * Streaming RAG chat over the retrieval-search backend. Answers arrive token by token over SSE
 * and are rendered as markdown as they stream, followed by the sections they were grounded in.
 */
export function ChatBot({
    apiBaseUrl,
    topK,
    documentId,
    placeholder = "Ask a question about your documents…",
    onSourceClick,
    sourceHref,
    className,
}: ChatBotProps) {
    const [input, setInput] = useState("");
    const { question, answer, sources, status, error, ask } = useAnswerStream({
        apiBaseUrl,
        topK,
        documentId,
    });

    const streaming = status === "streaming";

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || streaming) return;
        ask(trimmed);
    }

    return (
        <div className={cx("ewb-root", "ewb-chat", className)}>
            <form onSubmit={handleSubmit} className="ewb-chat__form">
                <input
                    aria-label="Question"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    className="ewb-input ewb-chat__input"
                />
                <Button type="submit" disabled={streaming || !input.trim()}>
                    {streaming ? "Thinking…" : "Ask"}
                </Button>
            </form>

            {question && (
                <div className="ewb-chat__exchange">
                    <div className="ewb-chat__question">{question}</div>

                    <div className="ewb-chat__answer" aria-live="polite">
                        {answer ? (
                            <Markdown>{answer}</Markdown>
                        ) : streaming ? (
                            <span className="ewb-muted">Retrieving relevant sections…</span>
                        ) : null}
                        {streaming && answer && <span className="ewb-cursor" aria-hidden="true" />}
                    </div>

                    {status === "error" && (
                        <p className="ewb-error" role="alert">
                            {error}
                        </p>
                    )}

                    {sources.length > 0 && (
                        <div className="ewb-chat__sources">
                            <div className="ewb-sectiontitle">Sources</div>
                            <ul className="ewb-list">
                                {sources.map((source) => (
                                    <li key={source.sectionId}>
                                        <ResultCard
                                            href={sourceHref?.(source)}
                                            onClick={
                                                onSourceClick
                                                    ? () => onSourceClick(source)
                                                    : undefined
                                            }
                                        >
                                            <div className="ewb-card__title">
                                                {source.documentTitle}
                                                {source.headingPath && (
                                                    <span className="ewb-card__heading">
                                                        {" "}
                                                        — {source.headingPath}
                                                    </span>
                                                )}
                                            </div>
                                            <Snippet text={source.snippet} />
                                        </ResultCard>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
