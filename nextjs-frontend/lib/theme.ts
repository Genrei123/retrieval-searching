/**
 * Light/dark preference, held in this browser.
 *
 * The palette itself is swapped in CSS (see the `.dark` block in `app/globals.css`); all this
 * does is decide whether that class is on `<html>`. Three states rather than two, because
 * "follow the OS" is a real answer and is the default — a machine that switches to dark at
 * sunset should take the app with it.
 */
import { createLocalStore } from "@/lib/local-store";

export type ThemePreference = "system" | "light" | "dark";

/** Also hard-coded in the inline script in `app/layout.tsx`, which runs before this module is
 * loaded and must read the same key. Change one, change the other. */
export const THEME_KEY = "jarvis.theme";

export const themeStore = createLocalStore<ThemePreference>(
    THEME_KEY,
    (raw) => (raw === "light" || raw === "dark" ? raw : "system"),
    (value) => value,
);

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function prefersDark(): boolean {
    return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
    if (preference === "system") return prefersDark() ? "dark" : "light";
    return preference;
}

/** The only place the class is written from React. */
export function applyTheme(preference: ThemePreference): void {
    document.documentElement.classList.toggle("dark", resolveTheme(preference) === "dark");
}

export function setTheme(preference: ThemePreference): void {
    themeStore.write(preference);
    applyTheme(preference);
}

/** Cycles in the order the toggle button offers them. */
export function nextTheme(preference: ThemePreference): ThemePreference {
    return preference === "system" ? "light" : preference === "light" ? "dark" : "system";
}
