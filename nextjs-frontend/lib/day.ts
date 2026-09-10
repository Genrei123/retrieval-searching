/**
 * Local calendar days, as `YYYY-MM-DD`. The homepage is a daily thing — "was this
 * briefing written today?", "what did Jarvis ask me to do yesterday?" — and every one of
 * those questions is about the user's own timezone, so `toISOString()` (UTC) is the wrong
 * tool. `en-CA` formats as `YYYY-MM-DD`, which sorts lexicographically.
 */
export function dayKey(at: Date | number = Date.now()): string {
    return new Date(at).toLocaleDateString("en-CA");
}

export function isToday(at: Date | number): boolean {
    return dayKey(at) === dayKey();
}

/** e.g. `Monday, 8 September`. */
export function formatDayLabel(at: Date | number = Date.now()): string {
    return new Date(at).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

/** e.g. `09:14`. */
export function formatClock(at: Date | number): string {
    return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
