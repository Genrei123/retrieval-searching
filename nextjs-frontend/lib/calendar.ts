/**
 * Date arithmetic for the homepage calendar grid.
 *
 * Everything here works in `YYYY-MM-DD` strings and local `Date` parts, never in UTC. The
 * backend stores a calendar day as a `DATE` with no timezone, and in Manila `toISOString()`
 * would move a late-evening entry to the following day — so `dayKey()` from `lib/day.ts` (which
 * formats in the browser's own timezone) is the only conversion used.
 */
import { dayKey } from "@/lib/day";

export type DayCell = {
    /** `YYYY-MM-DD` — the key events are grouped by. */
    key: string;
    day: number;
    /** False for the leading and trailing days that pad the grid out to whole weeks. */
    inMonth: boolean;
};

/** Always six rows of seven, so the panel does not change height from month to month. Weeks
 * start on Sunday, as Philippine calendars print them. */
export function monthGrid(year: number, month: number): DayCell[] {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());

    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        return { key: dayKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
    });
}

/** The range a month's grid actually covers, padding days included — one fetch per month. */
export function monthRange(year: number, month: number): { from: string; to: string } {
    const cells = monthGrid(year, month);
    return { from: cells[0].key, to: cells[cells.length - 1].key };
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
    const shifted = new Date(year, month + delta, 1);
    return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

/** e.g. `September 2026`. */
export function monthLabel(year: number, month: number): string {
    return new Date(year, month, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });
}

/** `2026-09-08` → `Tuesday, 8 September`. Parsed as local parts; `new Date("2026-09-08")` is
 * parsed as UTC midnight and can render as the day before. */
export function formatDayKey(key: string): string {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

/** `14:30:00` → `14:30`. Null stays null, which is how an all-day entry reads. */
export function formatEventTime(startTime: string | null): string | null {
    return startTime ? startTime.slice(0, 5) : null;
}

export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
