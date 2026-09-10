import { ChatPanel } from "@/components/chat-panel";

export default function AskPage() {
    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
                <header className="mb-10">
                    <h1 className="text-4xl font-medium tracking-tight text-stone-950">
                        Ask your documents
                    </h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
                        Retrieval-augmented answers generated from whatever you&apos;ve uploaded,
                        streamed in as they&apos;re written.
                    </p>
                </header>

                <ChatPanel />
            </div>
        </main>
    );
}
