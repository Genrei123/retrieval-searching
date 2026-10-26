"use client";

import { AskProvider } from "@/components/ask-store";
import { SearchProvider } from "@/components/search-store";
import { DocumentsProvider } from "@/components/documents-store";

/** Search, answer, and upload state survive navigation between the three RAG views. */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
            <AskProvider>
                <SearchProvider><DocumentsProvider>{children}</DocumentsProvider></SearchProvider>
            </AskProvider>
    );
}
