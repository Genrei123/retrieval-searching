"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMounted } from "@/hooks/use-mounted";
import {
    applyTheme,
    DARK_QUERY,
    nextTheme,
    setTheme,
    themeStore,
    type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, { icon: string; title: string }> = {
    system: { icon: "◐", title: "Theme: follows your system" },
    light: { icon: "☀", title: "Theme: light" },
    dark: { icon: "☾", title: "Theme: dark" },
};

/**
 * Cycles system → light → dark. Sits in the nav, so it is reachable from every page.
 *
 * The class on `<html>` is written by the inline script in the root layout before first paint;
 * this component only keeps it in step with what the user picks afterwards.
 */
export function ThemeToggle() {
    const preference = useSyncExternalStore(
        themeStore.subscribe,
        themeStore.getSnapshot,
        themeStore.getServerSnapshot,
    );
    const mounted = useMounted();

    // On "system", the OS can change under us — at sunset, or when the user flips their
    // machine's appearance. This subscribes to that; it never sets React state.
    useEffect(() => {
        if (preference !== "system") return;
        const media = window.matchMedia(DARK_QUERY);
        const onChange = () => applyTheme("system");
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);

    // Before hydration the stored preference is unknown (the store's server snapshot is
    // "system"), so the button renders its neutral face until then rather than flickering
    // from one icon to another.
    const shown = mounted ? preference : "system";

    return (
        <button
            type="button"
            onClick={() => setTheme(nextTheme(preference))}
            title={LABELS[shown].title}
            aria-label={LABELS[shown].title}
            className="ml-auto flex size-8 items-center justify-center rounded-lg text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
            <span aria-hidden>{LABELS[shown].icon}</span>
        </button>
    );
}
