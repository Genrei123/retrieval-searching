/**
 * Hand-rolled ANSI styling. A colour library would be one more dependency for what amounts to
 * eight escape codes, and this way the CLI honours NO_COLOR and non-TTY output for free.
 */
const ESC = "\u001b";

const enabled =
    process.env.NO_COLOR === undefined &&
    process.env.TERM !== "dumb" &&
    Boolean(process.stdout.isTTY);

function wrap(open: string, close: string) {
    return (text: string) => (enabled ? `${ESC}[${open}m${text}${ESC}[${close}m` : text);
}

export const color = {
    accent: wrap("32", "39"),
    accentBright: wrap("92", "39"),
    dim: wrap("2", "22"),
    bold: wrap("1", "22"),
    red: wrap("31", "39"),
    yellow: wrap("33", "39"),
    cyan: wrap("36", "39"),
};

export const ui = {
    /** The banner every command opens with. */
    banner(): void {
        console.log();
        console.log(`  ${color.accentBright("ewb")} ${color.dim("· retrieval-search components")}`);
        console.log();
    },

    line(text = ""): void {
        console.log(text ? `  ${text}` : "");
    },

    step(text: string): void {
        console.log(`  ${color.accent("✓")} ${text}`);
    },

    warn(text: string): void {
        console.log(`  ${color.yellow("!")} ${text}`);
    },

    error(text: string): void {
        console.error(`  ${color.red("✗")} ${text}`);
    },

    /** A fenced block used for copy-pasteable snippets. */
    code(snippet: string): void {
        console.log();
        for (const line of snippet.split("\n")) {
            console.log(`  ${color.dim("│")} ${color.cyan(line)}`);
        }
        console.log();
    },
};
