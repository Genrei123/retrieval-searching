import { cx } from "../lib/cx";

type Fragment = { text: string; highlighted: boolean };

/**
 * Renders a Postgres `ts_headline` snippet. Postgres wraps matched terms in `<mark>…</mark>` but
 * does NOT escape the surrounding document body, so this splits on those two tags and renders
 * everything else as plain text — highlights survive, and markup from an uploaded document can
 * never become live HTML. Never swap this for `dangerouslySetInnerHTML`.
 */
export function Snippet({ text, className }: { text: string; className?: string }) {
    return (
        <p className={cx("ewb-snippet", className)}>
            {toFragments(text).map((fragment, i) =>
                fragment.highlighted ? (
                    <mark key={i} className="ewb-snippet__mark">
                        {fragment.text}
                    </mark>
                ) : (
                    <span key={i}>{fragment.text}</span>
                ),
            )}
        </p>
    );
}

function toFragments(text: string): Fragment[] {
    const fragments: Fragment[] = [];
    let highlighted = false;

    for (const part of text.split(/(<mark>|<\/mark>)/)) {
        if (part === "<mark>") {
            highlighted = true;
        } else if (part === "</mark>") {
            highlighted = false;
        } else if (part) {
            fragments.push({ text: part, highlighted });
        }
    }

    return fragments;
}
