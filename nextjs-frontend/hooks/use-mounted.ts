"use client";

import { useSyncExternalStore } from "react";

/** Anything derived from the clock, or from `Math.random()`, has to wait for the client, or
 * the server-rendered markup and the first client render disagree about what they show.
 * `false` on the server and through hydration, `true` from the render after it. */
const NEVER_CHANGES = () => () => {};

export function useMounted(): boolean {
    return useSyncExternalStore(
        NEVER_CHANGES,
        () => true,
        () => false,
    );
}
