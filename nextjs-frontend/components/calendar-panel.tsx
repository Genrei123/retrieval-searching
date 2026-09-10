"use client";

import { useEffect, useMemo, useState } from "react";
import { Eyebrow, Tile } from "@/components/tile";
import { useMounted } from "@/hooks/use-mounted";
import {
    createCalendarEvent,
    deleteCalendarEvent,
    listCalendar,
    updateCalendarEvent,
    type CalendarEvent,
    type CalendarEventInput,
} from "@/lib/api";
import {
    addMonths,
    formatDayKey,
    formatEventTime,
    monthGrid,
    monthLabel,
    monthRange,
    WEEKDAY_INITIALS,
} from "@/lib/calendar";
import { dayKey } from "@/lib/day";

/**
 * The planner and the Philippine holidays, in one month grid.
 *
 * Both come from the backend's `/calendar` endpoints, which means they live in the stack's
 * Postgres rather than in this browser — so they survive a different device, and the briefing
 * workflow can read the same rows to tell you what is coming up.
 */
export function CalendarPanel({ className = "" }: { className?: string }) {
    const mounted = useMounted();

    // "Which month is on screen" and "which day is open" are only meaningful once the client
    // knows what today is; before that the panel renders its skeleton.
    return mounted ? <LiveCalendar className={className} /> : <CalendarSkeleton className={className} />;
}

function CalendarSkeleton({ className }: { className: string }) {
    return (
        <Tile className={className}>
            <Eyebrow>Calendar</Eyebrow>
            <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-100" />
        </Tile>
    );
}

function LiveCalendar({ className }: { className: string }) {
    const today = dayKey();
    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [selected, setSelected] = useState(today);
    const [events, setEvents] = useState<CalendarEvent[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Bumped after every write, which is what re-runs the month fetch.
    const [reloads, setReloads] = useState(0);

    const { from, to } = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);

    useEffect(() => {
        let cancelled = false;
        listCalendar(from, to)
            .then((rows) => {
                if (!cancelled) {
                    setEvents(rows);
                    setError(null);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Could not load the calendar.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [from, to, reloads]);

    /** Day key → that day's entries, holidays first. One pass rather than a filter per cell. */
    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const event of events ?? []) {
            const list = map.get(event.date);
            if (list) list.push(event);
            else map.set(event.date, [event]);
        }
        return map;
    }, [events]);

    const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
    const selectedEvents = byDay.get(selected) ?? [];

    function jump(delta: number) {
        setCursor((c) => addMonths(c.year, c.month, delta));
    }

    function goToday() {
        const now = new Date();
        setCursor({ year: now.getFullYear(), month: now.getMonth() });
        setSelected(today);
    }

    return (
        <Tile className={className}>
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>Calendar</Eyebrow>
                <button
                    type="button"
                    onClick={goToday}
                    className="text-xs text-stone-400 underline underline-offset-4 transition hover:text-stone-900"
                >
                    Today
                </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <MonthButton label="Previous month" onClick={() => jump(-1)}>
                    ‹
                </MonthButton>
                <span className="text-sm font-medium text-stone-900">
                    {monthLabel(cursor.year, cursor.month)}
                </span>
                <MonthButton label="Next month" onClick={() => jump(1)}>
                    ›
                </MonthButton>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_INITIALS.map((initial, i) => (
                    <span key={i} className="py-1 text-[11px] font-medium text-stone-400">
                        {initial}
                    </span>
                ))}

                {cells.map((cell) => {
                    const dayEvents = byDay.get(cell.key) ?? [];
                    const holiday = dayEvents.some((e) => e.kind === "HOLIDAY");
                    const personal = dayEvents.some((e) => e.kind === "PERSONAL");
                    const isToday = cell.key === today;
                    const isSelected = cell.key === selected;

                    return (
                        <button
                            key={cell.key}
                            type="button"
                            onClick={() => setSelected(cell.key)}
                            aria-current={isToday ? "date" : undefined}
                            aria-label={formatDayKey(cell.key)}
                            className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] transition ${
                                isSelected
                                    ? "bg-stone-950 font-medium text-white"
                                    : isToday
                                      ? "bg-stone-100 font-medium text-stone-900"
                                      : cell.inMonth
                                        ? "text-stone-800 hover:bg-stone-100"
                                        : "text-stone-300 hover:bg-stone-50"
                            }`}
                        >
                            <span className={holiday && !isSelected ? "text-rose-600" : undefined}>
                                {cell.day}
                            </span>
                            {/* Two dots at most: one for a holiday, one for anything of the
                                user's own. The day cell is too small for a count to read. */}
                            <span className="mt-0.5 flex h-1 items-center gap-0.5">
                                {holiday && (
                                    <span
                                        className={`size-1 rounded-full ${isSelected ? "bg-white" : "bg-rose-500"}`}
                                    />
                                )}
                                {personal && (
                                    <span
                                        className={`size-1 rounded-full ${isSelected ? "bg-white" : "bg-stone-900"}`}
                                    />
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                    {error}
                </p>
            )}

            <DayDetail
                key={selected}
                dayKey={selected}
                events={selectedEvents}
                loading={events === null}
                onChanged={() => setReloads((n) => n + 1)}
                onError={setError}
            />
        </Tile>
    );
}

function MonthButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex size-7 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
        >
            {children}
        </button>
    );
}

/* -------------------------------------------------------------------------- */
/* One day                                                                     */
/* -------------------------------------------------------------------------- */

function DayDetail({
    dayKey: day,
    events,
    loading,
    onChanged,
    onError,
}: {
    dayKey: string;
    events: CalendarEvent[];
    loading: boolean;
    onChanged: () => void;
    onError: (message: string | null) => void;
}) {
    // `null` = not composing; `"new"` = the add form; an id = editing that entry. Moving to
    // another day is a remount (the caller keys this on the day), so it starts closed again.
    const [composing, setComposing] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function remove(event: CalendarEvent) {
        setBusyId(event.id);
        onError(null);
        try {
            await deleteCalendarEvent(event.id);
            onChanged();
        } catch (e) {
            onError(e instanceof Error ? e.message : "Could not delete that entry.");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="mt-4 border-t border-stone-200 pt-4">
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-stone-900">{formatDayKey(day)}</h3>
                {composing !== "new" && (
                    <button
                        type="button"
                        onClick={() => setComposing("new")}
                        className="text-xs text-stone-500 underline underline-offset-4 transition hover:text-stone-900"
                    >
                        Add
                    </button>
                )}
            </div>

            {loading ? (
                <p className="mt-2 text-xs text-stone-400">Loading…</p>
            ) : events.length === 0 && composing !== "new" ? (
                <p className="mt-2 text-xs text-stone-400">Nothing on this day.</p>
            ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                    {events.map((event) =>
                        composing === event.id ? (
                            <li key={event.id}>
                                <EventForm
                                    day={day}
                                    event={event}
                                    onDone={() => {
                                        setComposing(null);
                                        onChanged();
                                    }}
                                    onCancel={() => setComposing(null)}
                                    onError={onError}
                                />
                            </li>
                        ) : (
                            <li
                                key={event.id}
                                className="flex items-start gap-2 rounded-lg border border-stone-200 px-2.5 py-2"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline gap-2">
                                        {formatEventTime(event.startTime) && (
                                            <span className="text-[11px] tabular-nums text-stone-400">
                                                {formatEventTime(event.startTime)}
                                            </span>
                                        )}
                                        <span
                                            className={`min-w-0 flex-1 truncate text-[13px] ${
                                                event.kind === "HOLIDAY"
                                                    ? "text-rose-700"
                                                    : "text-stone-900"
                                            }`}
                                        >
                                            {event.title}
                                        </span>
                                    </span>
                                    {event.notes && (
                                        <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500">
                                            {event.notes}
                                        </span>
                                    )}
                                </span>

                                {/* Holidays come from a migration and the API refuses writes
                                    against them, so they get no controls. */}
                                {event.kind === "PERSONAL" && (
                                    <span className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setComposing(event.id)}
                                            className="rounded px-1 text-[11px] text-stone-400 transition hover:text-stone-900"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(event)}
                                            disabled={busyId === event.id}
                                            className="rounded px-1 text-[11px] text-stone-400 transition hover:text-red-600 disabled:opacity-40"
                                        >
                                            {busyId === event.id ? "…" : "×"}
                                        </button>
                                    </span>
                                )}
                            </li>
                        ),
                    )}
                </ul>
            )}

            {composing === "new" && (
                <div className="mt-2">
                    <EventForm
                        day={day}
                        onDone={() => {
                            setComposing(null);
                            onChanged();
                        }}
                        onCancel={() => setComposing(null)}
                        onError={onError}
                    />
                </div>
            )}
        </div>
    );
}

/** Add and edit are the same three fields, so they are the same form. */
function EventForm({
    day,
    event,
    onDone,
    onCancel,
    onError,
}: {
    day: string;
    event?: CalendarEvent;
    onDone: () => void;
    onCancel: () => void;
    onError: (message: string | null) => void;
}) {
    const [title, setTitle] = useState(event?.title ?? "");
    const [time, setTime] = useState(formatEventTime(event?.startTime ?? null) ?? "");
    const [notes, setNotes] = useState(event?.notes ?? "");
    const [saving, setSaving] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed || saving) return;

        const input: CalendarEventInput = {
            date: day,
            // An empty time input means all day, which the backend stores as NULL.
            startTime: time ? `${time}:00` : null,
            title: trimmed,
            notes: notes.trim() || null,
        };

        setSaving(true);
        onError(null);
        try {
            if (event) await updateCalendarEvent(event.id, input);
            else await createCalendarEvent(input);
            onDone();
        } catch (err) {
            onError(err instanceof Error ? err.message : "Could not save that entry.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} className="rounded-lg border border-stone-300 p-2.5">
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder="What is happening?"
                className="w-full rounded border border-stone-300 px-2 py-1.5 text-[13px] outline-none focus:border-stone-500"
            />
            <div className="mt-1.5 flex gap-1.5">
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    aria-label="Start time, optional"
                    className="w-28 rounded border border-stone-300 px-2 py-1.5 text-[13px] outline-none focus:border-stone-500"
                />
                <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes"
                    className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1.5 text-[13px] outline-none focus:border-stone-500"
                />
            </div>
            <div className="mt-2 flex items-center gap-2">
                <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className="rounded-lg bg-stone-950 px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? "Saving…" : event ? "Save" : "Add"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs text-stone-500 transition hover:text-stone-900"
                >
                    Cancel
                </button>
                <span className="ml-auto text-[11px] text-stone-400">
                    {time ? "" : "All day"}
                </span>
            </div>
        </form>
    );
}
