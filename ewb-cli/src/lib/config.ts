/** Fallback for a local `docker compose up` of the retrieval-search backend. */
export const DEFAULT_API_BASE_URL = "http://localhost:8080/api/v1";

/** Name of the single environment variable the components read. */
export const API_BASE_URL_ENV = "NEXT_PUBLIC_EWB_API_URL";

/**
 * Resolves which backend a component talks to: an explicit `apiBaseUrl` prop wins, then
 * `NEXT_PUBLIC_EWB_API_URL`, then localhost.
 *
 * `process` is guarded rather than read directly. Next.js inlines `NEXT_PUBLIC_*` into
 * node_modules at build time so the lookup works there, but a Vite or plain-browser consumer
 * has no `process` global at all and a bare `process.env` would throw at module scope.
 */
export function resolveApiBaseUrl(explicit?: string): string {
    if (explicit) {
        return stripTrailingSlash(explicit);
    }
    const fromEnv =
        typeof process !== "undefined" ? process.env?.[API_BASE_URL_ENV] : undefined;
    return stripTrailingSlash(fromEnv ?? DEFAULT_API_BASE_URL);
}

function stripTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}
