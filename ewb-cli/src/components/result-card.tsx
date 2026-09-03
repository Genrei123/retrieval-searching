import type { ReactNode } from "react";
import { cx } from "../lib/cx";

/**
 * Wraps a source or result card in whatever interaction the consumer configured. The library
 * imports nothing from `next/*`, so where a citation leads is entirely the host app's decision:
 * give it an `href`, give it an `onClick`, or give it neither and the card renders inert.
 */
export function ResultCard({
    href,
    onClick,
    className,
    children,
}: {
    href?: string;
    onClick?: () => void;
    className?: string;
    children: ReactNode;
}) {
    const classes = cx("ewb-card", (href || onClick) && "ewb-card--interactive", className);

    if (href) {
        return (
            <a href={href} className={classes} onClick={onClick}>
                {children}
            </a>
        );
    }
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={cx(classes, "ewb-card--button")}>
                {children}
            </button>
        );
    }
    return <div className={classes}>{children}</div>;
}
