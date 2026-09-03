import { Command } from "commander";
import { addCommand } from "./cli/add";
import { REGISTRY, componentNames } from "./cli/registry";
import { CONFIG_PATH, readUserConfig, writeUserConfig } from "./cli/user-config";
import { color, ui } from "./cli/ui";
import { DEFAULT_API_BASE_URL } from "./lib/config";

const program = new Command();

program
    .name("ewb")
    .description("React components for the retrieval-search RAG backend.")
    .version("0.1.0");

program
    .command("list")
    .alias("ls")
    .description("List the components this package ships")
    .action(() => {
        ui.banner();
        const width = Math.max(...REGISTRY.map((entry) => entry.name.length));
        for (const entry of REGISTRY) {
            const api = entry.needsApi ? color.dim("  [needs API URL]") : "";
            ui.line(`${color.accent(entry.name.padEnd(width))}  ${entry.description}${api}`);
        }
        ui.line();
        ui.line(color.dim("Add one with:  ewb add <name>"));
        ui.line();
    });

program
    .command("add")
    .argument("<component>", `one of: ${componentNames().join(", ")}`)
    .description("Configure a component for this project (env wiring, styles, usage)")
    .option("--api-url <url>", "skip the prompt and use this backend URL")
    .option("-y, --yes", "accept defaults without prompting")
    .action(async (component: string, options: { apiUrl?: string; yes?: boolean }) => {
        await addCommand(component, options);
    });

const config = program
    .command("config")
    .description("Read or write the remembered CLI defaults");

config
    .command("show")
    .description("Print the current stored configuration")
    .action(() => {
        ui.banner();
        const stored = readUserConfig();
        ui.line(`${color.dim("file")}         ${CONFIG_PATH}`);
        ui.line(
            `${color.dim("api-url")}      ${stored.apiBaseUrl ?? color.dim(`(unset — defaults to ${DEFAULT_API_BASE_URL})`)}`,
        );
        ui.line();
    });

config
    .command("set")
    .argument("<key>", "currently only: api-url")
    .argument("<value>")
    .description("Store a default, used to pre-fill prompts in future projects")
    .action((key: string, value: string) => {
        ui.banner();
        if (key !== "api-url") {
            ui.error(`Unknown config key: ${key}`);
            ui.line("Supported keys: api-url");
            process.exitCode = 1;
            return;
        }
        writeUserConfig({ apiBaseUrl: value.replace(/\/$/, "") });
        ui.step(`api-url set to ${value}`);
        ui.line(color.dim(CONFIG_PATH));
        ui.line();
    });

program.parseAsync(process.argv).catch((error: unknown) => {
    ui.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
