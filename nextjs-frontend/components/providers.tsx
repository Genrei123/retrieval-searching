"use client";

import { AskProvider } from "@/components/ask-store";
import { BriefingProvider } from "@/components/briefing-store";
import { SearchProvider } from "@/components/search-store";

/** Client state that outlives a tab switch. Mounted once in the root layout, so navigating
 * between Home / Ask / Search / Documents no longer throws away what you typed, what came
 * back, or a briefing that took two minutes of local inference to produce. */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <BriefingProvider>
            <AskProvider>
                <SearchProvider>{children}</SearchProvider>
            </AskProvider>
        </BriefingProvider>
    );
}
