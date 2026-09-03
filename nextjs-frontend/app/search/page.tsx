import { Suspense } from "react";
import { SearchPanel } from "@/components/search-panel";

export default function SearchPage() {
    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
                <header className="mb-10">
                    <h1 className="text-4xl font-medium tracking-tight text-stone-950">
                        Search
                    </h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
                        Full-text search over ingested document sections — open any hit to read it
                        inside the document it came from.
                    </p>
                </header>

                {/* SearchPanel reads `documentId` / `section` from the query string, so it needs a
                    Suspense boundary to keep this page statically prerenderable. */}
                <Suspense fallback={<p className="text-sm text-stone-400">Loading…</p>}>
                    <SearchPanel />
                </Suspense>
            </div>
        </main>
    );
}
