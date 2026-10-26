"use client";

import { DocumentUpload } from "@/components/document-upload";
import { DocumentList } from "@/components/document-list";

export default function DocumentsPage() {

    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
                <header className="mb-10">
                    <h1 className="text-4xl font-medium tracking-tight text-stone-950">
                        Documents
                    </h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
                        Build your dataset, inspect how each file is chunked, and manage the documents used by Search and Ask.
                    </p>
                </header>

                <div className="flex flex-col gap-8">
                    <DocumentUpload />
                    <DocumentList />
                </div>
            </div>
        </main>
    );
}
