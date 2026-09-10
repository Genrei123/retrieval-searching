import { BRIEFING_URL } from "@/lib/config";
import { createLocalStore } from "@/lib/local-store";

/**
 * The morning briefing, as returned by the `Jarvis Homepage Briefing` n8n workflow
 * (`../../n8n/`). The wire format is snake_case because it is shaped by that workflow's
 * `Shape Response` node — keep the two in step.
 *
 * Only the prose fields come from the model. The weather numbers and the document list
 * are copied verbatim from Open-Meteo and the retrieval backend, so they can be trusted
 * even when llama3.2:3b paraphrases badly.
 */
export type BriefingWeather = {
    location: string;
    condition: string;
    high_c: number | null;
    low_c: number | null;
    current_c: number | null;
    feels_like_c: number | null;
    humidity_percent: number | null;
    rain_chance_percent: number | null;
    /** ISO local time for the forecast's timezone, e.g. `2026-09-08T05:41`. */
    sunrise: string | null;
    sunset: string | null;
    advice: string;
};

/** An email Jarvis thinks needs a reply. `message_id` is a real Gmail message id —
 * `Shape Response` resolves the model's email number back to the actual message — so the
 * homepage can reply to it rather than only describe it. */
export type BriefingActionItem = {
    message_id: string;
    thread_id: string;
    subject: string;
    from: string;
    snippet: string;
    why: string;
};

export type BriefingVideo = {
    id: string;
    title: string;
    channel: string;
    published: string | null;
    url: string;
};
export type BriefingTask = { task: string; reason: string };
export type BriefingDocument = {
    id: string;
    title: string;
    contentType: string;
    ingestedAt: string | null;
};

export type Briefing = {
    generated_at: string;
    greeting: string;
    weather: BriefingWeather;
    email_summary: string;
    email_count: number;
    action_items: BriefingActionItem[];
    tasks: BriefingTask[];
    followup_question: string;
    documents: BriefingDocument[];
    document_count: number;
    videos: BriefingVideo[];
};

export type CachedBriefing = { fetchedAt: number; briefing: Briefing };

/**
 * Runs the workflow. This is slow — the agent generates the whole briefing against a local
 * 3B model, so a couple of minutes is normal — which is exactly why the result is cached
 * rather than re-fetched on every page load.
 *
 * Sent as a bare GET with no custom headers so it stays a CORS-simple request: n8n's
 * webhook has no preflight handler, only the `Access-Control-Allow-Origin` header that the
 * workflow's `Respond to Homepage` node puts on the response itself.
 */
export async function fetchBriefing(): Promise<Briefing> {
    let response: Response;
    try {
        response = await fetch(BRIEFING_URL, { signal: AbortSignal.timeout(240_000) });
    } catch (cause) {
        throw new Error(
            `Could not reach the Jarvis workflow at ${BRIEFING_URL}. Check that n8n is running and the workflow is active.`,
            { cause },
        );
    }

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "The workflow's webhook is not registered. Activate “Jarvis Homepage Briefing” in n8n."
                : `The workflow responded with ${response.status}.`,
        );
    }

    // A workflow that throws mid-run still completes the HTTP request, but with an empty
    // body — "Respond to Homepage" never got the chance to run. Say so plainly rather than
    // surfacing a JSON parse error.
    const body = (await response.text()).trim();
    if (!body) {
        throw new Error(
            "The workflow returned an empty response, which means it failed part-way. Open its latest execution in n8n to see which node threw.",
        );
    }

    try {
        return JSON.parse(body) as Briefing;
    } catch (cause) {
        throw new Error("The workflow returned something that is not JSON.", { cause });
    }
}

/** The last briefing produced, so a reload does not re-run a two-minute workflow. */
export const briefingCache = createLocalStore<CachedBriefing | null>(
    "jarvis.briefing.v1",
    (raw) => {
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as CachedBriefing;
            // Reject anything written by an older shape of this type.
            if (!parsed?.briefing?.weather || !Array.isArray(parsed.briefing.tasks)) return null;
            if (!Array.isArray(parsed.briefing.videos)) return null;
            return parsed;
        } catch {
            return null;
        }
    },
    (value) => JSON.stringify(value),
);

/* -------------------------------------------------------------------------- */
/* The run itself                                                              */
/* -------------------------------------------------------------------------- */

/** Whether a workflow run is in flight, and how the last one failed. */
export type BriefingJob = { running: boolean; error: string | null };

const IDLE: BriefingJob = Object.freeze({ running: false, error: null });

let job: BriefingJob = IDLE;
const jobListeners = new Set<() => void>();

function setJob(next: BriefingJob) {
    job = next;
    for (const listener of jobListeners) listener();
}

/**
 * Module-level rather than component state, for two reasons. It makes `runBriefing` an
 * external system that an effect may drive — the React 19 rules forbid an effect that
 * calls `setState` synchronously, which a `useState`-based version could not avoid — and
 * it means the in-flight guard survives a remount, so a run started on the homepage is
 * not duplicated by navigating away and back.
 */
export const briefingJob = {
    subscribe(onChange: () => void) {
        jobListeners.add(onChange);
        return () => {
            jobListeners.delete(onChange);
        };
    },
    getSnapshot: () => job,
    getServerSnapshot: () => IDLE,
};

/** Runs the workflow and publishes the result to `briefingCache`. A no-op while a run is
 * already in flight, so an impatient double-click costs nothing. */
export function runBriefing(): void {
    if (job.running) return;
    setJob({ running: true, error: null });

    void fetchBriefing().then(
        (briefing) => {
            briefingCache.write({ fetchedAt: Date.now(), briefing });
            setJob(IDLE);
        },
        (e: unknown) => {
            setJob({
                running: false,
                error: e instanceof Error ? e.message : "Could not load the briefing.",
            });
        },
    );
}
