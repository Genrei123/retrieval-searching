"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { DocumentContent, SearchResponse } from "@/lib/api";

export type SearchSlot = {
    input: string;
    page: number;
    result: SearchResponse | null;
    error: string | null;
};

const EMPTY_SLOT: SearchSlot = { input: "", page: 0, result: null, error: null };

/** Searches are remembered per scope: the unscoped tab under `ALL_SCOPE`, and each
 * document-scoped search under its own document id. That way opening a document from a result
 * and coming back leaves the original result list exactly as it was. */
export const ALL_SCOPE = "all";

type SearchStore = {
    slots: Record<string, SearchSlot>;
    patchSlot: (scope: string, patch: Partial<SearchSlot>) => void;
    getCachedDocument: (documentId: string) => DocumentContent | undefined;
    cacheDocument: (content: DocumentContent) => void;
    invalidate: () => void;
    getRevision: () => number;
};

const SearchContext = createContext<SearchStore | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const [slots, setSlots] = useState<Record<string, SearchSlot>>({});
    // Fetched documents are a cache, not rendered state — a ref keeps re-opening a document
    // instant without re-rendering every consumer when one is stored.
    const documents = useRef<Map<string, DocumentContent>>(new Map());
    const revision = useRef(0);
    const getRevision = useCallback(() => revision.current, []);

    const patchSlot = useCallback((scope: string, patch: Partial<SearchSlot>) => {
        setSlots((prev) => ({ ...prev, [scope]: { ...(prev[scope] ?? EMPTY_SLOT), ...patch } }));
    }, []);

    const getCachedDocument = useCallback(
        (documentId: string) => documents.current.get(documentId),
        [],
    );

    const cacheDocument = useCallback((content: DocumentContent) => {
        documents.current.set(content.document.id, content);
    }, []);

    const invalidate = useCallback(() => {
        revision.current++;
        documents.current.clear();
        setSlots({});
    }, []);

    const value = useMemo(
        () => ({ slots, patchSlot, getCachedDocument, cacheDocument, invalidate, getRevision }),
        [slots, patchSlot, getCachedDocument, cacheDocument, invalidate, getRevision],
    );

    return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

function useSearchStore(): SearchStore {
    const store = useContext(SearchContext);
    if (!store) {
        throw new Error("useSearchStore must be used inside <SearchProvider>");
    }
    return store;
}

export function useSearchSlot(scope: string): [SearchSlot, (patch: Partial<SearchSlot>) => void] {
    const { slots, patchSlot } = useSearchStore();
    const patch = useCallback((next: Partial<SearchSlot>) => patchSlot(scope, next), [patchSlot, scope]);
    return [slots[scope] ?? EMPTY_SLOT, patch];
}

export function useDocumentCache() {
    const { getCachedDocument, cacheDocument } = useSearchStore();
    return { get: getCachedDocument, set: cacheDocument };
}

export function useInvalidateDocuments() {
    return useSearchStore().invalidate;
}

export function useLibraryRevision() {
    return useSearchStore().getRevision;
}
