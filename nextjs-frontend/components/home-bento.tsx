"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useBriefing } from "@/components/briefing-store";
import { CalendarPanel } from "@/components/calendar-panel";
import {
    PhilippineNewsTile,
    TechSnackbar,
    WikipediaFactTile,
} from "@/components/discover";
import { Eyebrow, Tile } from "@/components/tile";
import { useMounted } from "@/hooks/use-mounted";
import { documentHref } from "@/lib/links";
import { dayKey, formatClock, formatDayLabel, isToday } from "@/lib/day";
import { previousTaskDay, setTaskDone, syncTasks, taskLogStore } from "@/lib/task-log";
import { markReplied, repliedStore, sendReply } from "@/lib/reply";
import type {
    Briefing,
    BriefingActionItem,
    BriefingDocument,
    BriefingTask,
    BriefingVideo,
    BriefingWeather,
} from "@/lib/briefing";

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */

/** The daily checklist, shared by the Today and Jarvis-asks tiles. */
function useTaskLog() {
    return useSyncExternalStore(
        taskLogStore.subscribe,
        taskLogStore.getSnapshot,
        taskLogStore.getServerSnapshot,
    );
}

export function HomeBento() {
    const { briefing, fetchedAt, status, error, refresh } = useBriefing();
    const mounted = useMounted();
    const stale = fetchedAt != null && !isToday(fetchedAt);

    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-6xl px-6 pt-12 pb-24">
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">
                            {mounted ? formatDayLabel() : " "}
                        </p>
                        <h1 className="mt-2 text-4xl font-medium tracking-tight text-stone-950">
                            {briefing?.greeting || "Good morning."}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {fetchedAt != null && mounted && (
                            <span className="text-xs text-stone-400">
                                Briefed {formatClock(fetchedAt)}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={status === "loading"}
                            className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {status === "loading" ? "Briefing…" : "Refresh"}
                        </button>
                    </div>
                </header>

                {/* The briefing is only re-run on demand, so a briefing left over from an
                    earlier day is shown as-is and flagged rather than silently replaced. */}
                {stale && mounted && briefing && (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        This briefing is from {formatDayLabel(fetchedAt!)}. Refresh for today.
                    </p>
                )}

                {error && (
                    <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                        {error}
                    </p>
                )}

                {/* Static, so these are the parts of the page that are never empty and never
                    waiting: the reads and the newsstand are up before the briefing resolves,
                    and are still there if it never does. */}
                <TechSnackbar />
                <PhilippineNewsTile className="mb-4" />

                {/* The briefing and the calendar side by side: the bento keeps the full width
                    it was laid out for on small screens, and the calendar becomes a rail
                    beside it once there is room. It sticks, so scrolling the briefing does
                    not scroll the month away. */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
                    <div>
                        {briefing ? (
                            <BentoGrid briefing={briefing} />
                        ) : status === "loading" ? (
                            <LoadingGrid />
                        ) : null}

                        {/* Outside the briefing branch above for the same reason. */}
                        <WikipediaFactTile className="mt-4" />
                    </div>

                    <aside className="lg:sticky lg:top-6 lg:self-start">
                        <CalendarPanel />
                    </aside>
                </div>
            </div>
        </main>
    );
}

function BentoGrid({ briefing }: { briefing: Briefing }) {
    return (
        <div className="grid gap-4 md:grid-cols-6">
            <WeatherTile weather={briefing.weather} />
            <InboxTile summary={briefing.email_summary} count={briefing.email_count} />
            <ActionItemsTile items={briefing.action_items} />
            <TasksTile tasks={briefing.tasks} />
            <FollowUpTile question={briefing.followup_question} />
            {/* Keyed on the run so a refresh starts the watch tile back at its first video. */}
            <VideosTile key={briefing.generated_at} videos={briefing.videos} />
            <LibraryTile documents={briefing.documents} total={briefing.document_count} />
        </div>
    );
}

function LoadingGrid() {
    // The workflow runs a 3B model end to end, so this can sit here for a minute or two.
    // Saying so is kinder than a spinner that looks stuck.
    const spans = [
        "md:col-span-2 md:row-span-2 min-h-64",
        "md:col-span-4 min-h-32",
        "md:col-span-4 min-h-32",
        "md:col-span-3 min-h-40",
        "md:col-span-3 min-h-40",
        "md:col-span-6 min-h-56",
        "md:col-span-6 min-h-28",
    ];
    return (
        <>
            <p className="mb-4 text-sm text-stone-400">
                Jarvis is reading the forecast and your inbox. This takes a minute or two.
            </p>
            <div className="grid gap-4 md:grid-cols-6">
                {spans.map((span, i) => (
                    <div
                        key={i}
                        className={`animate-pulse rounded-2xl border border-stone-200 bg-stone-50 ${span}`}
                    />
                ))}
            </div>
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* Tiles                                                                       */
/* -------------------------------------------------------------------------- */

/** `2026-09-08T05:41` → `05:41`. Open-Meteo returns local time for the requested
 * timezone, so it is displayed as-is rather than parsed into a `Date`. */
function timeOfDay(iso: string | null): string {
    return iso?.slice(11, 16) ?? "—";
}

function degrees(value: number | null): string {
    return value == null ? "—" : `${Math.round(value)}°`;
}

function WeatherTile({ weather }: { weather: BriefingWeather }) {
    const wet = (weather.rain_chance_percent ?? 0) >= 50;

    return (
        <Tile
            className={`md:col-span-2 md:row-span-2 ${wet ? "bg-sky-50/70" : "bg-stone-50/70"}`}
        >
            <Eyebrow>{weather.location}</Eyebrow>

            <div className="mt-4 flex items-baseline gap-3">
                <span className="text-6xl font-medium tracking-tighter text-stone-950">
                    {degrees(weather.current_c)}
                </span>
                <span className="text-[15px] text-stone-500 capitalize">{weather.condition}</span>
            </div>

            {weather.feels_like_c != null && (
                <p className="mt-1 text-sm text-stone-500">
                    Feels like {degrees(weather.feels_like_c)}
                </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
                <Stat label="High / low">
                    {degrees(weather.high_c)} / {degrees(weather.low_c)}
                </Stat>
                <Stat label="Rain">
                    {weather.rain_chance_percent == null
                        ? "—"
                        : `${weather.rain_chance_percent}%`}
                </Stat>
                <Stat label="Humidity">
                    {weather.humidity_percent == null ? "—" : `${weather.humidity_percent}%`}
                </Stat>
                <Stat label="Sun">
                    {timeOfDay(weather.sunrise)} – {timeOfDay(weather.sunset)}
                </Stat>
            </dl>

            {weather.advice && (
                <p className="mt-auto pt-6 text-[15px] leading-relaxed text-stone-700">
                    {weather.advice}
                </p>
            )}
        </Tile>
    );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-stone-400">{label}</dt>
            <dd className="mt-0.5 font-medium text-stone-800">{children}</dd>
        </div>
    );
}

function InboxTile({ summary, count }: { summary: string; count: number }) {
    return (
        <Tile className="md:col-span-4">
            <Eyebrow>Inbox · last 24 hours</Eyebrow>
            <p className="mt-3 text-2xl font-medium tracking-tight text-stone-950">
                {count === 0 ? "Nothing new" : `${count} new ${count === 1 ? "email" : "emails"}`}
            </p>
            {summary && (
                <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{summary}</p>
            )}
        </Tile>
    );
}

function ActionItemsTile({ items }: { items: BriefingActionItem[] }) {
    const [openId, setOpenId] = useState<string | null>(null);
    const replied = useSyncExternalStore(
        repliedStore.subscribe,
        repliedStore.getSnapshot,
        repliedStore.getServerSnapshot,
    );

    return (
        <Tile className="md:col-span-4">
            <Eyebrow>Needs a reply</Eyebrow>
            {items.length === 0 ? (
                <p className="mt-3 text-[15px] text-stone-500">
                    Nothing in the inbox needs you today.
                </p>
            ) : (
                <ul className="mt-3 flex flex-col gap-2">
                    {items.map((item) => {
                        const open = openId === item.message_id;
                        return (
                            <li
                                key={item.message_id}
                                className="rounded-xl border border-stone-200 transition focus-within:border-stone-400"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenId(open ? null : item.message_id)}
                                    aria-expanded={open}
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-stone-900">
                                            {item.subject}
                                        </span>
                                        <span className="mt-0.5 block truncate text-xs text-stone-400">
                                            {item.from}
                                        </span>
                                        {item.why && (
                                            <span className="mt-1 block text-sm text-stone-600">
                                                {item.why}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
                                            replied[item.message_id]
                                                ? "bg-stone-100 text-stone-500"
                                                : "text-stone-600"
                                        }`}
                                    >
                                        {replied[item.message_id]
                                            ? "Replied"
                                            : open
                                              ? "Close"
                                              : "Reply"}
                                    </span>
                                </button>

                                {open && <ReplyComposer item={item} onSent={() => setOpenId(null)} />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Tile>
    );
}

function ReplyComposer({ item, onSent }: { item: BriefingActionItem; onSent: () => void }) {
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const text = body.trim();
        if (!text || sending) return;

        setSending(true);
        setError(null);
        try {
            await sendReply(item.message_id, text);
            markReplied(item.message_id);
            setBody("");
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send the reply.");
        } finally {
            setSending(false);
        }
    }

    return (
        <form onSubmit={submit} className="border-t border-stone-200 px-4 py-3">
            {item.snippet && (
                <p className="mb-3 border-l-2 border-stone-200 pl-3 text-xs leading-relaxed text-stone-400">
                    {item.snippet}
                </p>
            )}

            {/* Gmail builds the Re: subject and the recipients from the message being
                replied to, so the body is the only thing left to write. */}
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                autoFocus
                placeholder={`Reply to ${item.from}…`}
                className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-2 flex items-center gap-3">
                <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {sending ? "Sending…" : "Send reply"}
                </button>
                <span className="text-xs text-stone-400">Sends from your Gmail account.</span>
            </div>
        </form>
    );
}

function TasksTile({ tasks }: { tasks: BriefingTask[] }) {
    const log = useTaskLog();
    const day = log[dayKey()] ?? null;

    // Seeds today's checklist from the briefing. Ticks survive a reload of the same
    // briefing and reset when a refresh produces a different list of tasks. `syncTasks`
    // no-ops when the list is unchanged, so this does not loop.
    useEffect(() => {
        syncTasks(tasks.map((t) => t.task));
    }, [tasks]);

    const doneCount = day?.done.filter(Boolean).length ?? 0;

    return (
        <Tile className="md:col-span-3 bg-stone-50/70">
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>Today</Eyebrow>
                {day && tasks.length > 0 && (
                    <span className="text-xs text-stone-400">
                        {doneCount} of {tasks.length} done
                    </span>
                )}
            </div>

            {tasks.length === 0 ? (
                <p className="mt-3 text-[15px] text-stone-500">No tasks today.</p>
            ) : (
                <ul className="mt-3 flex flex-col gap-3">
                    {tasks.map((t, i) => {
                        const checked = day?.done[i] ?? false;
                        return (
                            <li key={i}>
                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => setTaskDone(i, e.target.checked)}
                                        className="mt-1 size-4 shrink-0 accent-stone-900"
                                    />
                                    <span className="min-w-0">
                                        <span
                                            className={`block text-[15px] ${
                                                checked
                                                    ? "text-stone-400 line-through"
                                                    : "text-stone-900"
                                            }`}
                                        >
                                            {t.task}
                                        </span>
                                        {t.reason && (
                                            <span className="mt-0.5 block text-sm text-stone-500">
                                                {t.reason}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Tile>
    );
}

function FollowUpTile({ question }: { question: string }) {
    const yesterday = previousTaskDay(useTaskLog());

    // The agent only asks once it has an earlier briefing in its Postgres memory, so on
    // day one there is genuinely nothing to ask.
    const asks = question.trim();

    return (
        <Tile className="md:col-span-3">
            <Eyebrow>Jarvis asks</Eyebrow>

            {asks ? (
                <p className="mt-3 text-[15px] leading-relaxed text-stone-900">{asks}</p>
            ) : (
                <p className="mt-3 text-[15px] text-stone-500">
                    Nothing to follow up on yet — Jarvis will ask about today&apos;s tasks
                    tomorrow.
                </p>
            )}

            {yesterday && (
                <div className="mt-4 border-t border-stone-200 pt-4">
                    <p className="text-xs text-stone-400">
                        What you set on {formatDayLabel(new Date(`${yesterday.day}T00:00`))}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {yesterday.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <span
                                    aria-hidden
                                    className={
                                        yesterday.done[i] ? "text-stone-900" : "text-stone-300"
                                    }
                                >
                                    {yesterday.done[i] ? "✓" : "○"}
                                </span>
                                <span
                                    className={
                                        yesterday.done[i] ? "text-stone-400" : "text-stone-700"
                                    }
                                >
                                    {task}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Tile>
    );
}

function VideosTile({ videos }: { videos: BriefingVideo[] }) {
    const [current, setCurrent] = useState(0);

    if (videos.length === 0) {
        return (
            <Tile className="md:col-span-6">
                <Eyebrow>Watch</Eyebrow>
                <p className="mt-3 text-[15px] text-stone-500">
                    No videos came back from the channel feeds this time.
                </p>
            </Tile>
        );
    }

    const video = videos[Math.min(current, videos.length - 1)];

    return (
        <Tile className="md:col-span-6">
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>Watch</Eyebrow>
                <span className="text-xs text-stone-400">a different few each refresh</span>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-[2fr_1fr]">
                {/* youtube-nocookie rather than youtube.com: youtube.com itself refuses to be
                    framed, and only the /embed/ path is embeddable at all. */}
                <div className="aspect-video overflow-hidden rounded-xl border border-stone-200 bg-stone-950">
                    <iframe
                        key={video.id}
                        src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                        title={video.title}
                        className="h-full w-full"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                </div>

                <ul className="flex flex-col gap-2">
                    {videos.map((v, i) => (
                        <li key={v.id}>
                            <button
                                type="button"
                                onClick={() => setCurrent(i)}
                                aria-current={v.id === video.id}
                                className={`flex w-full items-start gap-3 rounded-lg p-1.5 text-left transition ${
                                    v.id === video.id ? "bg-stone-100" : "hover:bg-stone-50"
                                }`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element -- a remote
                                    thumbnail on a host next/image is not configured for, and one
                                    that must not break the tile if it 404s. */}
                                <img
                                    src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                                    alt=""
                                    loading="lazy"
                                    className="h-12 w-20 shrink-0 rounded-md bg-stone-200 object-cover"
                                />
                                <span className="min-w-0">
                                    <span className="line-clamp-2 text-sm text-stone-900">
                                        {v.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-stone-400">
                                        {v.channel}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </Tile>
    );
}

function LibraryTile({
    documents,
    total,
}: {
    documents: BriefingDocument[];
    total: number;
}) {
    return (
        <Tile className="md:col-span-6">
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>From your library</Eyebrow>
                <span className="text-xs text-stone-400">
                    {total} indexed · a different three each refresh
                </span>
            </div>

            {documents.length === 0 ? (
                <p className="mt-3 text-[15px] text-stone-500">
                    Nothing ingested yet.{" "}
                    <Link href="/documents" className="underline underline-offset-4">
                        Upload a document
                    </Link>
                    .
                </p>
            ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                    {documents.map((doc) => (
                        <li key={doc.id}>
                            {/* The Search tab doubles as the reader. */}
                            <Link
                                href={documentHref(doc.id)}
                                className="block rounded-xl border border-stone-200 px-4 py-3 transition hover:border-stone-400"
                            >
                                <span className="block truncate text-sm font-medium text-stone-900">
                                    {doc.title}
                                </span>
                                <span className="mt-0.5 block text-xs text-stone-400">
                                    {doc.contentType}
                                    {doc.ingestedAt
                                        ? ` · ${new Date(doc.ingestedAt).toLocaleDateString()}`
                                        : ""}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Tile>
    );
}
