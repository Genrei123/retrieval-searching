"use client";

type Fragment = { text: string; highlighted: boolean };

/**
 * Renders a `ts_headline` snippet. Postgres wraps matched terms in `<mark>…</mark>` but does not
 * escape the surrounding document text, so this splits on those two tags and renders everything
 * else as text — highlights survive, uploaded markup can't become HTML.
 */
export function Snippet({ text, className }: { text: string; className?: string }) {
    return (
        <p className={className}>
            {toFragments(text).map((fragment, i) =>
                fragment.highlighted ? (
                    <mark key={i} className="rounded bg-amber-100 px-0.5 text-stone-900">
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
