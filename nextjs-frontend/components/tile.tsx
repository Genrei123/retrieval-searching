/** The bento primitives. Extracted from `home-bento` so the homepage's static sections
 * (the tech snackbar, the Philippine newsstand, the Wikipedia facts) sit on the same
 * surface as the briefing tiles without either file importing the other. */

/** One bento cell. Cards are uniform in shape and differ only in tint and span, which is
 * what keeps a grid of unrelated things reading as one surface. */
export function Tile({
    className = "",
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            className={`flex flex-col rounded-2xl border border-stone-200 p-5 transition hover:border-stone-300 ${className}`}
        >
            {children}
        </section>
    );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">
            {children}
        </h2>
    );
}
