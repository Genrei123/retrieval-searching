"use client";

import { AskProvider } from "@/components/ask-store";
import { SearchProvider } from "@/components/search-store";

/** Client state that outlives a tab switch. Mounted once in the root layout, so navigating
 * between Ask / Search / Documents no longer throws away what you typed or what came back. */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AskProvider>
            <SearchProvider>{children}</SearchProvider>
        </AskProvider>
    );
}
