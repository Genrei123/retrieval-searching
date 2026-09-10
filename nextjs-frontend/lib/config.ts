export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

/**
 * Production webhook of the `Jarvis Homepage Briefing` n8n workflow (see ../../n8n/).
 * Like the API base URL the browser resolves this, so it must be reachable from the
 * user's machine rather than from inside the compose network, and it is baked into the
 * client bundle at build time.
 */
export const BRIEFING_URL =
    process.env.NEXT_PUBLIC_N8N_BRIEFING_URL ?? "http://localhost:5678/webhook/jarvis-briefing";

/**
 * Production webhook of the `Jarvis Send Reply` workflow. Posted to from the browser with
 * a form-encoded body — n8n answers no CORS preflight, so the request has to stay
 * CORS-simple.
 */
export const REPLY_URL =
    process.env.NEXT_PUBLIC_N8N_REPLY_URL ?? "http://localhost:5678/webhook/jarvis-reply";
