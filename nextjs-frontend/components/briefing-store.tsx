"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { briefingCache, briefingJob, runBriefing, type Briefing } from "@/lib/briefing";

type Status = "loading" | "ready" | "error";

type BriefingStore = {
    briefing: Briefing | null;
    /** When the workflow that produced `briefing` was run. Null until something loads. */
    fetchedAt: number | null;
    status: Status;
    error: string | null;
    /** Re-runs the workflow and replaces the cache. Wired to the Refresh button. */
    refresh: () => void;
};

const BriefingContext = createContext<BriefingStore | null>(null);

/**
 * Exposes the homepage briefing.
 *
 * Running the workflow takes minutes, so its result is a `localStorage` cache rather than
 * component state: the workflow runs once, on the first visit that finds no cache, and
 * after that only when the user presses Refresh. A briefing left over from an earlier day
 * is still shown rather than silently re-fetched — the homepage labels it as stale and
 * leaves the decision where the user put it, on the button.
 *
 * Both the cache and the run live in `lib/briefing.ts`; this provider only subscribes to
 * them, and is mounted in the root layout so that switching to Search and back does not
 * throw the briefing away.
 */
export function BriefingProvider({ children }: { children: React.ReactNode }) {
    const cached = useSyncExternalStore(
        briefingCache.subscribe,
        briefingCache.getSnapshot,
        briefingCache.getServerSnapshot,
    );
    const job = useSyncExternalStore(
        briefingJob.subscribe,
        briefingJob.getSnapshot,
        briefingJob.getServerSnapshot,
    );

    // The one automatic run: first visit on this browser, nothing cached yet.
    useEffect(() => {
        if (!briefingCache.getSnapshot()) runBriefing();
    }, []);

    const value = useMemo<BriefingStore>(
        () => ({
            briefing: cached?.briefing ?? null,
            fetchedAt: cached?.fetchedAt ?? null,
            // Nothing cached and nothing wrong means the first run is still on its way.
            status: job.running ? "loading" : job.error ? "error" : cached ? "ready" : "loading",
            error: job.error,
            refresh: runBriefing,
        }),
        [cached, job],
    );

    return <BriefingContext.Provider value={value}>{children}</BriefingContext.Provider>;
}

export function useBriefing(): BriefingStore {
    const store = useContext(BriefingContext);
    if (!store) {
        throw new Error("useBriefing must be used inside <BriefingProvider>");
    }
    return store;
}
