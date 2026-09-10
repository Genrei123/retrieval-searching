import { REPLY_URL } from "@/lib/config";
import { createLocalStore } from "@/lib/local-store";

type ReplyResult = {
    sent: boolean;
    message_id: string | null;
    thread_id: string | null;
    error: string | null;
};

/**
 * Sends a reply to one email through the `Jarvis Send Reply` workflow, which hands it to
 * the Gmail node. Gmail derives the recipients and the `Re:` subject from the message being
 * replied to, so the id is the only addressing needed.
 *
 * The body is a `URLSearchParams`, which makes `fetch` send
 * `Content-Type: application/x-www-form-urlencoded` — a CORS-simple content type. That
 * matters: n8n's webhook answers no preflight (an `OPTIONS` to it 500s with no
 * `Access-Control-Allow-Origin`), so a JSON body would make this unsendable from the
 * browser. Do not add headers here.
 */
export async function sendReply(messageId: string, message: string): Promise<void> {
    let response: Response;
    try {
        response = await fetch(REPLY_URL, {
            method: "POST",
            body: new URLSearchParams({ messageId, message }),
            signal: AbortSignal.timeout(60_000),
        });
    } catch (cause) {
        throw new Error(
            "Could not reach the reply workflow. Check that n8n is running and “Jarvis Send Reply” is active.",
            { cause },
        );
    }

    // The workflow always answers 200 — a Gmail rejection comes back as `sent: false` with a
    // reason, because a failed execution would skip the node that sets the CORS header and
    // the browser would only see an opaque network error.
    if (!response.ok) {
        throw new Error(`The reply workflow responded with ${response.status}.`);
    }

    const result = (await response.json().catch(() => null)) as ReplyResult | null;
    if (!result?.sent) {
        throw new Error(result?.error ?? "Gmail did not confirm the reply was sent.");
    }
}

/**
 * Gmail message ids already replied to from this browser, so a reload does not offer to
 * send a second copy of a reply that already went out. Purely a guard against the obvious
 * mistake — the inbox itself remains the record of what was sent.
 */
export const repliedStore = createLocalStore<Record<string, number>>(
    "jarvis.replied.v1",
    (raw) => {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw) as Record<string, number>;
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    },
    // Briefings only ever carry the last day of email, so a fortnight is more than enough
    // history to stop a repeat.
    (map) => {
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        return JSON.stringify(
            Object.fromEntries(Object.entries(map).filter(([, at]) => at > cutoff)),
        );
    },
);

export function markReplied(messageId: string): void {
    repliedStore.write({ ...repliedStore.getSnapshot(), [messageId]: Date.now() });
}
