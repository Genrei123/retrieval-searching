"use client";

import { useState } from "react";
import { useAnswerStream } from "@/hooks/use-answer-stream";
import { Markdown } from "@/components/markdown";

export function ChatPanel() {
    const [input, setInput] = useState("");
    const { question, answer, sources, status, error, ask } = useAnswerStream();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || status === "streaming") return;
        ask(trimmed);
    }

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your documents…"
                    className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-[15px] outline-none focus:border-stone-500"
                />
                <button
                    type="submit"
                    disabled={status === "streaming" || !input.trim()}
                    className="rounded-lg bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {status === "streaming" ? "Thinking…" : "Ask"}
                </button>
            </form>

            {question && (
                <div className="rounded-2xl border border-stone-200 p-5">
                    <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                        {question}
                    </div>

                    <div className="text-[15px] text-stone-800">
                        {answer ? (
                            <Markdown>{answer}</Markdown>
                        ) : status === "streaming" ? (
                            <span className="text-stone-400">Retrieving relevant sections…</span>
                        ) : null}
                        {status === "streaming" && answer && (
                            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-stone-400 align-middle" />
                        )}
                    </div>

                    {status === "error" && (
                        <p className="mt-3 text-sm text-red-600">{error}</p>
                    )}

                    {sources.length > 0 && (
                        <div className="mt-5 border-t border-stone-100 pt-4">
                            <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                                Sources
                            </div>
                            <ul className="space-y-2">
                                {sources.map((s) => (
                                    <li key={s.sectionId} className="text-sm text-stone-600">
                                        <span className="font-medium text-stone-800">
                                            {s.documentTitle}
                                        </span>
                                        {s.headingPath && <span> — {s.headingPath}</span>}
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
