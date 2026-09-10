import { dayKey } from "@/lib/day";
import { createLocalStore } from "@/lib/local-store";

/**
 * Which of Jarvis's daily tasks got ticked off, kept per calendar day.
 *
 * This is what makes the follow-up question answerable. The agent asks "how did yesterday's
 * tasks go?" from its own Postgres chat memory, but that memory has no idea what the user
 * actually did — the homepage shows the previous day's list beside the question so there is
 * something concrete to answer with.
 *
 * Deliberately browser-local: it is a personal checklist, not retrieval data, and it does
 * not belong in the backend's document store.
 */
export type TaskDay = { tasks: string[]; done: boolean[] };
export type DatedTaskDay = TaskDay & { day: string };
export type TaskLog = Record<string, TaskDay>;

/** Enough history to answer "yesterday" across a weekend or a short holiday. */
const KEEP_DAYS = 14;

export const taskLogStore = createLocalStore<TaskLog>(
    "jarvis.tasklog.v1",
    (raw) => {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw) as TaskLog;
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    },
    (log) => {
        // Day keys are `YYYY-MM-DD`, so the newest are simply the last ones in sort order.
        const kept = Object.keys(log).sort().slice(-KEEP_DAYS);
        return JSON.stringify(Object.fromEntries(kept.map((day) => [day, log[day]])));
    },
);

/**
 * Records today's task list. Ticks are preserved while the list is unchanged, so re-reading
 * a cached briefing does not wipe the morning's progress; a genuine refresh produces new
 * task text and starts from unticked.
 *
 * A no-op when nothing changed, which matters because this is called from an effect —
 * writing unconditionally would notify subscribers on every render.
 */
export function syncTasks(tasks: string[], day = dayKey()): void {
    const log = taskLogStore.getSnapshot();
    const existing = log[day];
    if (
        existing &&
        existing.tasks.length === tasks.length &&
        existing.tasks.every((t, i) => t === tasks[i])
    ) {
        return;
    }

    taskLogStore.write({ ...log, [day]: { tasks, done: tasks.map(() => false) } });
}

export function setTaskDone(index: number, done: boolean, day = dayKey()): void {
    const log = taskLogStore.getSnapshot();
    const entry = log[day];
    if (!entry || index < 0 || index >= entry.done.length) return;

    taskLogStore.write({
        ...log,
        [day]: { tasks: entry.tasks, done: entry.done.map((d, i) => (i === index ? done : d)) },
    });
}

/** The most recent day before `day` that has tasks — "yesterday", skipping unused days. */
export function previousTaskDay(log: TaskLog, day = dayKey()): DatedTaskDay | null {
    const last = Object.keys(log)
        .filter((d) => d < day && log[d].tasks.length > 0)
        .sort()
        .at(-1);
    return last ? { day: last, ...log[last] } : null;
}
