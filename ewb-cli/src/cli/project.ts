import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ENV_FILE = ".env.local";
export const ENV_KEY = "NEXT_PUBLIC_EWB_API_URL";
export const STYLES_IMPORT = '@ewb/cli/styles.css';

export type EnvWriteResult = "created" | "updated" | "unchanged";

/**
 * Sets one key in `.env.local`, preserving everything else in the file verbatim: an existing
 * line for the key is replaced in place, otherwise the key is appended. The file belongs to the
 * user and routinely holds unrelated secrets, so it is never rewritten wholesale.
 */
export function upsertEnvVar(cwd: string, key: string, value: string): EnvWriteResult {
    const path = join(cwd, ENV_FILE);
    const line = `${key}=${value}`;

    if (!existsSync(path)) {
        writeFileSync(path, `${line}\n`, "utf8");
        return "created";
    }

    const original = readFileSync(path, "utf8");
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const lines = original.split(/\r?\n/);
    const index = lines.findIndex((l) => l.trimStart().startsWith(`${key}=`));

    if (index !== -1) {
        if (lines[index] === line) {
            return "unchanged";
        }
        lines[index] = line;
        writeFileSync(path, lines.join(eol), "utf8");
        return "updated";
    }

    const needsNewline = original.length > 0 && !original.endsWith("\n");
    writeFileSync(path, `${original}${needsNewline ? eol : ""}${line}${eol}`, "utf8");
    return "updated";
}

/** Candidate root layouts, in the order Next.js itself would resolve them. */
const LAYOUT_CANDIDATES = [
    "app/layout.tsx",
    "app/layout.jsx",
    "src/app/layout.tsx",
    "src/app/layout.jsx",
];

export function findRootLayout(cwd: string): string | null {
    for (const candidate of LAYOUT_CANDIDATES) {
        const path = join(cwd, candidate);
        if (existsSync(path)) {
            return path;
        }
    }
    return null;
}

export function hasStylesImport(layoutPath: string): boolean {
    return readFileSync(layoutPath, "utf8").includes(STYLES_IMPORT);
}

/**
 * Inserts the stylesheet import above the file's first existing import, so it sits with the
 * other imports rather than below unrelated code. Falls back to prepending when the layout has
 * no imports at all.
 */
export function insertStylesImport(layoutPath: string): void {
    const original = readFileSync(layoutPath, "utf8");
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const statement = `import "${STYLES_IMPORT}";`;
    const lines = original.split(/\r?\n/);
    const firstImport = lines.findIndex((l) => l.trimStart().startsWith("import "));

    if (firstImport === -1) {
        writeFileSync(layoutPath, `${statement}${eol}${original}`, "utf8");
        return;
    }

    lines.splice(firstImport, 0, statement);
    writeFileSync(layoutPath, lines.join(eol), "utf8");
}

export type Reachability =
    | { ok: true; documentCount: number }
    | { ok: false; reason: string };

/**
 * Confirms the URL really is a retrieval-search backend by listing its documents. The count is
 * worth reporting: an empty index is the most common reason a freshly wired ChatBot answers
 * "No relevant sections were found."
 */
export async function checkBackend(apiBaseUrl: string): Promise<Reachability> {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/documents`;
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            headers: { accept: "application/json" },
        });
        if (!response.ok) {
            return { ok: false, reason: `${url} responded ${response.status}` };
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            return { ok: false, reason: `${url} did not return a document list` };
        }
        return { ok: true, documentCount: body.length };
    } catch (e) {
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
}
