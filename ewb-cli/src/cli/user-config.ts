import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type UserConfig = {
    /** Last API base URL the user accepted, used to pre-fill the prompt next time. */
    apiBaseUrl?: string;
};

export const CONFIG_PATH = join(homedir(), ".ewb", "config.json");

/**
 * Machine-level preferences, kept outside any project so that a second `ewb add` — in this
 * repo or another one — can offer the URL you already typed. The project's own `.env.local`
 * remains the source of truth for what the app actually uses at runtime.
 */
export function readUserConfig(): UserConfig {
    try {
        return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as UserConfig;
    } catch {
        // Missing or unparseable config is not an error — it just means no remembered default.
        return {};
    }
}

export function writeUserConfig(patch: UserConfig): void {
    const next = { ...readUserConfig(), ...patch };
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}
