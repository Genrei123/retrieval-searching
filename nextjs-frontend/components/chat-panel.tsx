"use client";

import Link from "next/link";
import { useAsk } from "@/components/ask-store";
import { documentHref } from "@/lib/links";
import { Markdown } from "@/components/markdown";
import { Snippet } from "@/components/snippet";

export function ChatPanel() {
    const { input, setInput, question, answer, sources, status, error, cached, ask } = useAsk();

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
                    maxLength={200}
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
                    {cached && (
                        <p className="mb-3 text-xs text-emerald-700">Previously asked · Answer served from memory</p>
                    )}

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
                            <ul className="flex flex-col gap-2">
                                {sources.map((s, index) => (
                                    <li key={s.sectionId}>
                                        <Link
                                            href={documentHref(s.documentId, s.sectionId)}
                                            className="block rounded-xl border border-stone-200 p-3 transition hover:border-stone-400"
                                        >
                                            <div className="text-sm text-stone-600">
                                                <span className="font-medium text-stone-800">
                                                    [{index + 1}] {s.documentTitle}
                                                </span>
                                                {s.headingPath && <span> — {s.headingPath}</span>}
                                            </div>
                                            <Snippet
                                                text={s.snippet}
                                                className="mt-1 text-sm leading-relaxed text-stone-500"
                                            />
                                            <span className="mt-2 inline-block text-xs text-stone-400">
                                                Read this passage in the document →
                                            </span>
                                        </Link>
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
