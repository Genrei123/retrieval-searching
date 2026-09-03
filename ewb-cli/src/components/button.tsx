import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "../lib/cx";

export type ButtonVariant = "solid" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Shows a spinner glyph and disables the button. */
    loading?: boolean;
};

/** Neutral button with solid, ghost and danger variants. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "solid", size = "md", loading = false, disabled, className, children, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={rest.type ?? "button"}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cx(
                "ewb-root",
                "ewb-btn",
                `ewb-btn--${variant}`,
                `ewb-btn--${size}`,
                loading && "ewb-btn--loading",
                className,
            )}
            {...rest}
        >
            {loading && <span className="ewb-btn__spinner" aria-hidden="true" />}
            {children}
        </button>
    );
});
