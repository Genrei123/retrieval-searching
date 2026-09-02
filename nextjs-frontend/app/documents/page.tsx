"use client";

import { useState } from "react";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentList } from "@/components/document-list";

export default function DocumentsPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
                <header className="mb-10">
                    <h1 className="text-4xl font-medium tracking-tight text-stone-950">
                        Documents
                    </h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
                        Upload PDFs, Markdown, or HTML for ingestion, and manage what&apos;s
                        already indexed.
                    </p>
                </header>

                <div className="flex flex-col gap-8">
                    <DocumentUpload onIngested={() => setRefreshKey((k) => k + 1)} />
                    <DocumentList refreshKey={refreshKey} />
                </div>
            </div>
        </main>
    );
}
