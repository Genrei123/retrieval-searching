import { relative } from "node:path";
import { DEFAULT_API_BASE_URL } from "../lib/config";
import { findEntry, componentNames } from "./registry";
import { ask, confirm, isInteractive } from "./prompt";
import { readUserConfig, writeUserConfig } from "./user-config";
import {
    ENV_FILE,
    ENV_KEY,
    STYLES_IMPORT,
    checkBackend,
    findRootLayout,
    hasStylesImport,
    insertStylesImport,
    upsertEnvVar,
} from "./project";
import { color, ui } from "./ui";

export type AddOptions = {
    apiUrl?: string;
    yes?: boolean;
};

/**
 * Configures a component for the current project. Because components ship inside the package,
 * this writes no source: it resolves the backend URL, records it in `.env.local`, makes sure the
 * stylesheet is imported, and prints the snippet to paste.
 */
export async function addCommand(name: string, options: AddOptions): Promise<void> {
    const cwd = process.cwd();
    ui.banner();

    const entry = findEntry(name);
    if (!entry) {
        ui.error(`Unknown component: ${name}`);
        ui.line(`Available: ${componentNames().join(", ")}`);
        process.exitCode = 1;
        return;
    }

    ui.line(`${color.bold(entry.name)} ${color.dim("·")} ${entry.description}`);
    ui.line();

    if (entry.needsApi) {
        await configureApi(cwd, options);
    }

    await ensureStyles(cwd, options);

    ui.line();
    ui.line(color.dim("Use it:"));
    ui.code(entry.usage);
}

async function configureApi(cwd: string, options: AddOptions): Promise<void> {
    const remembered = readUserConfig().apiBaseUrl;
    const fallback = remembered ?? DEFAULT_API_BASE_URL;

    let apiBaseUrl: string;
    if (options.apiUrl) {
        apiBaseUrl = options.apiUrl;
    } else if (options.yes || !isInteractive()) {
        // Non-TTY (CI, piped input) cannot answer a prompt, so take the default rather than hang.
        apiBaseUrl = fallback;
        ui.line(color.dim(`Using ${apiBaseUrl}`));
    } else {
        apiBaseUrl = await ask("RAG API base URL:", fallback);
    }

    apiBaseUrl = apiBaseUrl.replace(/\/$/, "");

    const reachability = await checkBackend(apiBaseUrl);
    if (reachability.ok) {
        const { documentCount } = reachability;
        ui.step(
            `reachable — ${documentCount} document${documentCount === 1 ? "" : "s"} indexed`,
        );
        if (documentCount === 0) {
            ui.warn("The index is empty, so answers will say no relevant sections were found.");
        }
    } else {
        // Not fatal: the backend is often not running yet at scaffold time.
        ui.warn(`could not reach ${apiBaseUrl} — ${reachability.reason}`);
    }

    const result = upsertEnvVar(cwd, ENV_KEY, apiBaseUrl);
    ui.step(
        result === "unchanged"
            ? `${ENV_FILE} already set (${ENV_KEY})`
            : `${ENV_FILE} ${result} (${ENV_KEY})`,
    );

    writeUserConfig({ apiBaseUrl });
}

async function ensureStyles(cwd: string, options: AddOptions): Promise<void> {
    const layout = findRootLayout(cwd);

    if (!layout) {
        ui.warn("No app/layout.tsx found — import the stylesheet once in your root component:");
        ui.code(`import "${STYLES_IMPORT}";`);
        return;
    }

    const shown = relative(cwd, layout).replace(/\\/g, "/");

    if (hasStylesImport(layout)) {
        ui.step(`styles already imported in ${shown}`);
        return;
    }

    if (options.yes || !isInteractive()) {
        insertStylesImport(layout);
        ui.step(`styles imported in ${shown}`);
        return;
    }

    const accepted = await confirm(`Add the stylesheet import to ${shown}?`);
    if (accepted) {
        insertStylesImport(layout);
        ui.step(`styles imported in ${shown}`);
    } else {
        ui.warn("Skipped. Add this yourself once, anywhere that loads on every page:");
        ui.code(`import "${STYLES_IMPORT}";`);
    }
}
