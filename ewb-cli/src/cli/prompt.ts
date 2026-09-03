import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { color } from "./ui";

/** True when we can actually ask a question — CI and piped input cannot answer one. */
export function isInteractive(): boolean {
    return Boolean(stdin.isTTY && stdout.isTTY);
}

/**
 * Asks for a value, offering `defaultValue` on an empty answer. Uses Node's built-in readline
 * rather than a prompt library so the CLI keeps a single runtime dependency.
 */
export async function ask(question: string, defaultValue?: string): Promise<string> {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
        const suffix = defaultValue ? ` ${color.dim(`(${defaultValue})`)}` : "";
        const answer = await rl.question(`  ${color.accent("?")} ${question}${suffix} `);
        return answer.trim() || defaultValue || "";
    } finally {
        rl.close();
    }
}

/** Yes/no confirmation. `defaultYes` decides what a bare Enter means. */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
    const hint = defaultYes ? "Y/n" : "y/N";
    const rl = createInterface({ input: stdin, output: stdout });
    try {
        const answer = (
            await rl.question(`  ${color.accent("?")} ${question} ${color.dim(`(${hint})`)} `)
        )
            .trim()
            .toLowerCase();
        if (!answer) return defaultYes;
        return answer === "y" || answer === "yes";
    } finally {
        rl.close();
    }
}
