/** Joins class names, dropping anything falsy. Keeps component JSX readable without a dep. */
export function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(" ");
}
