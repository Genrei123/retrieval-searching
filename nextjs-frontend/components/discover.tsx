"use client";

import { useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { Eyebrow, Tile } from "@/components/tile";
import {
    outletThumbnail,
    PH_OUTLETS,
    readLogo,
    TECH_READS,
    topicTint,
    WIKI_FACTS,
    type NewsOutlet,
    type TechRead,
} from "@/lib/discover";

/* The homepage's reading material, next to the briefing. Everything here comes from the
   constants in `lib/discover`, so these sections render with the page and stay up even when
   the briefing workflow is slow, stale or down. */

/* -------------------------------------------------------------------------- */
/* Tech snackbar                                                               */
/* -------------------------------------------------------------------------- */

/** One read. The publisher's mark sits behind the text as a watermark, bleeding off the
 * bottom-right corner, over a tint chosen by topic. */
function ReadCard({ read, clone = false }: { read: TechRead; clone?: boolean }) {
    return (
        <li className={`shrink-0 ${clone ? "snackbar-clone" : ""}`} aria-hidden={clone || undefined}>
            <a
                href={read.url}
                target="_blank"
                rel="noreferrer"
                // The clone exists only to make the loop seamless, so it is out of the tab
                // order and out of the accessibility tree.
                tabIndex={clone ? -1 : undefined}
                className={`relative flex h-full w-64 flex-col overflow-hidden rounded-2xl border border-stone-200 p-4 transition hover:border-stone-400 ${topicTint(read.topic)}`}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- a remote favicon on a
                    host next/image is not configured for; if it 404s the card is simply
                    untinted by a logo, which is why nothing depends on it loading. */}
                <img
                    src={readLogo(read.url)}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="pointer-events-none absolute -right-5 -bottom-5 size-32 object-contain opacity-10"
                />

                <span className="relative text-[11px] font-medium tracking-[0.14em] text-stone-500 uppercase">
                    {read.topic}
                </span>
                <span className="relative mt-2 text-[15px] leading-snug font-medium text-stone-950">
                    {read.title}
                </span>
                <span className="relative mt-1.5 text-sm leading-relaxed text-stone-600">
                    {read.why}
                </span>
                <span className="relative mt-auto pt-3 text-xs text-stone-500">
                    {read.source} ↗
                </span>
            </a>
        </li>
    );
}

/** A strip of snack-sized reads across the top of the homepage: what is new, sitting next to
 * the practices that make it hold up. It drifts leftwards on its own and stops under the
 * cursor, so it is a thing you glance at rather than a thing you have to operate. The list is
 * rendered twice — the animation resets after exactly one copy, so the seam never shows. */
export function TechSnackbar() {
    return (
        <section className="mb-4" aria-labelledby="tech-snackbar">
            <div className="flex items-baseline justify-between gap-3">
                <span id="tech-snackbar">
                    <Eyebrow>Snackbar · worth a read</Eyebrow>
                </span>
                <span className="text-xs text-stone-400">
                    {TECH_READS.length} links · hover to stop
                </span>
            </div>

            <div className="snackbar-viewport mt-3 overflow-hidden">
                <ul className="snackbar-track flex w-max gap-3 pb-2">
                    {TECH_READS.map((read) => (
                        <ReadCard key={read.url} read={read} />
                    ))}
                    {TECH_READS.map((read) => (
                        <ReadCard key={`clone-${read.url}`} read={read} clone />
                    ))}
                </ul>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Philippine newsstand                                                        */
/* -------------------------------------------------------------------------- */

/** The outlet's favicon, with its monogram tile underneath. The monogram is what shows while
 * the image loads and, if the request fails, for good — a broken-image glyph in a row of
 * logos looks like a bug, an initialled tile looks deliberate. */
function OutletThumbnail({ outlet }: { outlet: NewsOutlet }) {
    const [failed, setFailed] = useState(false);

    return (
        <span
            className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-semibold tracking-wide ${outlet.tint}`}
        >
            {outlet.monogram}
            {!failed && (
                /* eslint-disable-next-line @next/next/no-img-element -- a remote favicon on a
                   host next/image is not configured for, and one that must not break the row
                   if it 404s. */
                <img
                    src={outletThumbnail(outlet.domain)}
                    alt=""
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className="absolute inset-0 size-full bg-[#fff] object-contain p-1.5"
                />
            )}
        </span>
    );
}

/** Front pages from home. Deliberately a newsstand and not a feed: it links to the section
 * fronts and lets the reader choose, rather than putting one newsroom's judgement on the
 * homepage. */
export function PhilippineNewsTile({ className = "" }: { className?: string }) {
    return (
        <Tile className={className}>
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>News · Philippines</Eyebrow>
                <span className="text-xs text-stone-400">opens in a new tab</span>
            </div>

            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PH_OUTLETS.map((outlet) => (
                    <li key={outlet.domain}>
                        <a
                            href={outlet.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5 transition hover:border-stone-400 hover:bg-stone-50"
                        >
                            <OutletThumbnail outlet={outlet} />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-stone-900">
                                    {outlet.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-stone-400">
                                    {outlet.kind}
                                </span>
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </Tile>
    );
}

/* -------------------------------------------------------------------------- */
/* Wikipedia facts                                                             */
/* -------------------------------------------------------------------------- */

function randomFactIndex(not: number): number {
    if (WIKI_FACTS.length < 2) return 0;
    let next = not;
    while (next === not) next = Math.floor(Math.random() * WIKI_FACTS.length);
    return next;
}

/** Drawn once when the bundle loads, so each visit opens on a different fact. It is only
 * shown after hydration — the server has its own copy of this module and picked a different
 * number, so the first client render has to stay on the fixed one. */
const OPENING_FACT = randomFactIndex(-1);

/** One fact at a time, each linking to the article it came from — the link is the citation,
 * so a fact that sounds too good is one click from being checked. */
export function WikipediaFactTile({ className = "" }: { className?: string }) {
    const mounted = useMounted();
    const [picked, setPicked] = useState<number | null>(null);

    const index = picked ?? (mounted ? OPENING_FACT : 0);
    const fact = WIKI_FACTS[index];

    return (
        <Tile className={`bg-stone-50/70 ${className}`}>
            <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>Random fact</Eyebrow>
                <span className="text-xs text-stone-400">Wikipedia</span>
            </div>

            <p className="mt-4 text-[17px] leading-relaxed text-stone-900">{fact.fact}</p>

            <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                <button
                    type="button"
                    onClick={() => setPicked(randomFactIndex(index))}
                    className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                >
                    Another fact
                </button>
                <a
                    href={fact.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-900"
                >
                    {fact.article} ↗
                </a>
            </div>
        </Tile>
    );
}
