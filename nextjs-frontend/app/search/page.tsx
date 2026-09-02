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
                        Full-text search over ingested document sections.
                    </p>
                </header>

                <SearchPanel />
            </div>
        </main>
    );
}
