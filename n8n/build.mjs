/**
 * Generates the two workflows the Jarvis homepage calls.
 *
 *   node build.mjs
 *
 *   jarvis-homepage-briefing.json  GET  /webhook/jarvis-briefing  — the morning briefing
 *   jarvis-send-reply.json         POST /webhook/jarvis-reply     — replies to one email
 *
 * The JSON is what n8n imports, but it is generated rather than hand-edited: the Code
 * nodes' JavaScript lives in `src/*.js` where it is readable and lintable instead of
 * being a one-line escaped string.
 *
 * After regenerating, re-import with `./import.sh`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
/**
 * Reads a Code node's source, resolving `// @include <file>` lines against `src/`.
 *
 * The two briefing nodes run in separate sandboxes and cannot import from each other,
 * but the agent refers to an email by its position in the prompt list and Shape Response
 * resolves that number back by index -- so they must filter the inbox identically. The
 * include is what keeps that one definition in one file.
 */
const src = (name) =>
    readFileSync(join(here, "src", name), "utf8").replace(
        /^\/\/ @include (\S+)[ \t]*$/gm,
        (_, file) => src(file).trimEnd(),
    );

/**
 * The homepage is served from this origin, and both workflows say so in their response
 * headers. n8n's webhook answers no CORS preflight — an `OPTIONS` to it 500s with no
 * `Access-Control-Allow-Origin` — so the browser may only reach these as CORS-simple
 * requests: a bare `GET`, and a `POST` whose body is form encoded. Scoped to the one
 * origin rather than `*`, so no other page you happen to have open can read the inbox
 * summary or send mail as you.
 */
const UI_ORIGIN = "http://localhost:3000";

const corsHeaders = (extra = []) => ({
    responseHeaders: {
        entries: [{ name: "Access-Control-Allow-Origin", value: UI_ORIGIN }, ...extra],
    },
});

/** The briefing the agent must produce, as an Ollama output grammar. Also the shape
 * `Shape Response` reads from. */
const BRIEFING_SCHEMA = {
    type: "object",
    properties: {
        greeting: {
            type: "string",
            description: "One short friendly greeting line for Genrey.",
        },
        weather: {
            type: "object",
            properties: {
                condition: { type: "string", description: "e.g. thunderstorm, light rain, clear" },
                high_c: { type: "number" },
                low_c: { type: "number" },
                rain_chance_percent: { type: "number" },
                advice: {
                    type: "string",
                    description: "One sentence on what the weather means for his plans.",
                },
            },
            required: ["condition", "high_c", "low_c", "rain_chance_percent", "advice"],
        },
        email_summary: {
            type: "string",
            description: "One or two sentences summarising the inbox.",
        },
        action_items: {
            type: "array",
            description:
                "Up to five emails that genuinely need action today. Empty array if none.",
            items: {
                type: "object",
                properties: {
                    // A number, not the subject line: Shape Response looks the real message
                    // up by it, so the homepage gets a Gmail id it can actually reply to and
                    // a subject the model has not garbled.
                    email_number: {
                        type: "number",
                        description: "The number of the email in the RECENT EMAILS list above.",
                    },
                    why: { type: "string", description: "Why it needs action today." },
                },
                required: ["email_number", "why"],
            },
        },
        tasks: {
            type: "array",
            description: "Exactly three concrete tasks for today, suited to the weather.",
            items: {
                type: "object",
                properties: {
                    task: { type: "string" },
                    reason: { type: "string" },
                },
                required: ["task", "reason"],
            },
        },
        followup_question: {
            type: "string",
            description:
                "A question about yesterday's tasks, or an empty string if there were none.",
        },
    },
    required: [
        "greeting",
        "weather",
        "email_summary",
        "action_items",
        "tasks",
        "followup_question",
    ],
};

const AGENT_PROMPT = `=You are Genrey's Jarvis, a virtual assistant that helps him start his day.

Here is today's information:

{{ $json.briefing_input }}

Using ONLY the information above, produce Genrey's morning briefing.
- greeting: one short friendly line. If today is a holiday or has something on the calendar, say so here.
- weather: copy the numbers exactly from the data above, and add one sentence of advice.
- email_summary: one or two sentences on what is sitting in his inbox.
- action_items: up to five emails that genuinely need a reply from him today, most important first. The list has already had automated no-reply senders removed, so every email in it can be replied to. Identify each one by its number in the RECENT EMAILS list, not by its subject. Empty array if none.
- tasks: exactly three concrete tasks suited to today's weather AND to what is already on his calendar. Do not propose something that collides with an entry, and if today is a holiday or already has entries on it, work around them.
- followup_question: your memory holds the briefings you wrote on earlier days. If you gave him tasks on an earlier day, ask by name how those specific tasks went. Otherwise an empty string.`;

/* -------------------------------------------------------------------------- */
/* 1. The morning briefing                                                     */
/* -------------------------------------------------------------------------- */

const briefing = {
    // Keeping the id means importing updates the existing workflow rather than
    // creating a second copy alongside it.
    id: "gil5JXItoV0Ox4mV",
    name: "Jarvis Homepage Briefing",
    active: true,
    settings: { binaryMode: "separate", executionOrder: "v1" },
    nodes: [
        {
            id: "be991654-3dc6-4afd-8630-b01ced8f6fe2",
            name: "Homepage Webhook",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2.1,
            position: [208, 16],
            // Stable so the test URL survives a re-import.
            webhookId: "2f0c1d6a-4b7e-4a3d-9c21-8ef0b5a7c134",
            parameters: {
                httpMethod: "GET",
                path: "jarvis-briefing",
                // The homepage wants the finished briefing in the response body, so the
                // request is held open until "Respond to Homepage" runs.
                responseMode: "responseNode",
                options: {},
            },
        },
        {
            id: "b3e99b24-40aa-4f93-b5b7-7f29aa60b9fc",
            name: "Get Weather",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [416, 16],
            parameters: {
                url: "https://api.open-meteo.com/v1/forecast?latitude=14.644&longitude=121.051&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=Asia%2FManila&forecast_days=1",
                options: {},
            },
        },
        {
            id: "d771d56e-2958-43e3-906a-e394626e03e2",
            name: "Get Emails",
            type: "n8n-nodes-base.gmail",
            typeVersion: 2.2,
            position: [624, 16],
            alwaysOutputData: true,
            parameters: {
                // Build Briefing Input drops no-reply senders, and on a busy day those are
                // most of the inbox -- fetch enough that five repliable emails survive it.
                limit: 30,
                simple: true,
                filters: { q: "newer_than:1d" },
                operation: "getAll",
            },
            credentials: {
                gmailOAuth2: { id: "YtxHS2abmDDNLINe", name: "Gmail account" },
            },
        },
        {
            id: "7a1c5f28-6d3b-4e90-8f4a-2b9d0c6e1a75",
            name: "Get Documents",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [832, 16],
            // Gmail hands this node one item per email; without executeOnce the backend
            // would be hit once per message.
            executeOnce: true,
            alwaysOutputData: true,
            // A briefing without the library card still beats no briefing at all.
            onError: "continueRegularOutput",
            parameters: {
                // Service name, not localhost: this runs inside the compose network.
                url: "http://app:8080/api/v1/documents",
                options: { timeout: 10000 },
            },
        },
        {
            id: "6c4d2a19-7f83-4b05-9e26-1d8a0c5f3b74",
            name: "Get Calendar",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [936, 16],
            // Same reason as Get Documents: the node upstream hands this one item per
            // email, and the calendar only needs fetching once.
            executeOnce: true,
            alwaysOutputData: true,
            // A briefing that cannot see the calendar is still worth having.
            onError: "continueRegularOutput",
            parameters: {
                // Service name, not localhost: this runs inside the compose network. The
                // week ahead is what the agent can actually plan around.
                url: "http://app:8080/api/v1/calendar/upcoming?days=7",
                options: { timeout: 10000 },
            },
        },
        {
            id: "1b6f9e30-2c47-4a58-9d81-4f0a7c3e5b92",
            name: "Pick Channels",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1040, 16],
            parameters: { jsCode: src("pick-channels.js") },
        },
        {
            id: "e50d8b71-93a2-4c16-b7f4-6d2e819c0a34",
            name: "Get Video Feed",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1248, 16],
            alwaysOutputData: true,
            // YouTube being slow or unreachable costs the watch tile, nothing else.
            onError: "continueRegularOutput",
            parameters: {
                url: "={{ $json.feedUrl }}",
                options: {
                    timeout: 10000,
                    // Atom XML: take it as text and let Shape Response pull the entries out.
                    response: { response: { responseFormat: "text", outputPropertyName: "data" } },
                },
            },
        },
        {
            id: "032f6b3c-655d-44b1-b9f0-5fb9e2be7d3d",
            name: "Build Briefing Input",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1456, 16],
            parameters: { jsCode: src("build-briefing-input.js") },
        },
        {
            id: "05bb60a2-0592-4cc0-a7da-63df1a46ff9f",
            name: "AI Agent",
            type: "@n8n/n8n-nodes-langchain.agent",
            typeVersion: 3.1,
            position: [1664, 16],
            parameters: {
                text: AGENT_PROMPT,
                options: { enableStreaming: false },
                promptType: "define",
                // Deliberately no output parser. n8n's Structured Output Parser makes the
                // agent demand its answer through a `format_final_json_response` tool call,
                // and the Ollama `format` grammar below physically cannot emit one — the
                // model can only produce a bare JSON object, so every run failed with
                // "Model output doesn't fit required format". The grammar is itself a hard
                // schema guarantee, so the parser was only ever belt-and-braces here.
                // `Shape Response` parses the JSON string the agent returns.
                hasOutputParser: false,
            },
        },
        {
            id: "f0327c96-26ac-402e-8d86-968546b56d40",
            name: "Ollama Chat Model",
            type: "@n8n/n8n-nodes-langchain.lmChatOllama",
            typeVersion: 1,
            position: [1584, 288],
            parameters: {
                model: "llama3.2:3b",
                options: {
                    // Ollama serves at num_ctx 4096 by default, regardless of the 131072 the
                    // model card advertises. The prompt is the weather, up to twenty emails
                    // and the Postgres chat memory of earlier briefings, and an overflow is
                    // silent -- Ollama drops the oldest tokens, which would take the numbered
                    // email list with it and make every action item point at the wrong
                    // message. Set high enough that the whole prompt survives.
                    numCtx: 8192,
                    // Ollama's structured-output grammar, and the only thing enforcing the
                    // briefing's shape now that the output parser is gone. The `output`
                    // wrapper is what the agent returns as its text.
                    format: {
                        type: "object",
                        required: ["output"],
                        properties: { output: BRIEFING_SCHEMA },
                    },
                },
            },
            credentials: {
                ollamaApi: { id: "pzpQke7yc1q3hNGz", name: "Ollama account" },
            },
        },
        {
            id: "3ec59482-e826-4dea-a87e-d94254e14da6",
            name: "Postgres Chat Memory",
            type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
            typeVersion: 1.4,
            position: [1764, 288],
            // One long-running session: this is what lets Jarvis remember the tasks it
            // set on earlier days and ask how they went.
            parameters: {
                sessionKey: "jarvis-daily",
                sessionIdType: "customKey",
                contextWindowLength: 20,
            },
            credentials: {
                postgres: { id: "5XBq8dDbpRxVOz24", name: "Postgres account" },
            },
        },
        {
            id: "c4e8a903-51fd-4b62-9a0e-7d3c8b1f6042",
            name: "Shape Response",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1872, 16],
            parameters: { jsCode: src("shape-response.js") },
        },
        {
            id: "9d2b7e14-08ac-4f35-b6d8-3a5c9e027f81",
            name: "Respond to Homepage",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1.5,
            position: [2080, 16],
            parameters: {
                respondWith: "firstIncomingItem",
                options: corsHeaders([{ name: "Cache-Control", value: "no-store" }]),
            },
        },
    ],
    connections: {
        "Homepage Webhook": { main: [[{ node: "Get Weather", type: "main", index: 0 }]] },
        "Get Weather": { main: [[{ node: "Get Emails", type: "main", index: 0 }]] },
        "Get Emails": { main: [[{ node: "Get Documents", type: "main", index: 0 }]] },
        "Get Documents": { main: [[{ node: "Get Calendar", type: "main", index: 0 }]] },
        "Get Calendar": { main: [[{ node: "Pick Channels", type: "main", index: 0 }]] },
        "Pick Channels": { main: [[{ node: "Get Video Feed", type: "main", index: 0 }]] },
        "Get Video Feed": { main: [[{ node: "Build Briefing Input", type: "main", index: 0 }]] },
        "Build Briefing Input": { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Shape Response", type: "main", index: 0 }]] },
        "Shape Response": { main: [[{ node: "Respond to Homepage", type: "main", index: 0 }]] },
        "Ollama Chat Model": {
            ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]],
        },
        "Postgres Chat Memory": {
            ai_memory: [[{ node: "AI Agent", type: "ai_memory", index: 0 }]],
        },
    },
};

/* -------------------------------------------------------------------------- */
/* 2. Replying to one of the action items                                      */
/* -------------------------------------------------------------------------- */

const reply = {
    id: "jrvsReply0000001",
    name: "Jarvis Send Reply",
    active: true,
    settings: { executionOrder: "v1" },
    nodes: [
        {
            id: "0a4c17e2-88bd-4f6e-9c53-1e7b0d9a2f46",
            name: "Reply Webhook",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2.1,
            position: [208, 16],
            webhookId: "5c93a1f7-62de-40b8-a1c4-73f2e6b09d85",
            parameters: {
                httpMethod: "POST",
                path: "jarvis-reply",
                responseMode: "responseNode",
                options: {},
            },
        },
        {
            id: "b71e4d05-3f8a-4c29-84b6-9e0d5c1a7f38",
            name: "Send Reply",
            type: "n8n-nodes-base.gmail",
            typeVersion: 2.2,
            position: [416, 16],
            alwaysOutputData: true,
            // A rejected send must still come back through "Respond to Sender" with the
            // CORS header on it, or the browser reports an opaque network failure and the
            // user never learns why the reply did not go out.
            onError: "continueRegularOutput",
            parameters: {
                operation: "reply",
                // The body is form encoded, which is what keeps the request CORS-simple.
                // Gmail derives the recipients and the subject from the message being
                // replied to, so the id is the only addressing this needs.
                messageId: "={{ $json.body.messageId }}",
                emailType: "text",
                message: "={{ $json.body.message }}",
                options: {},
            },
            credentials: {
                gmailOAuth2: { id: "YtxHS2abmDDNLINe", name: "Gmail account" },
            },
        },
        {
            id: "cd2f6903-71b5-4e8a-9f01-2a3c8d5e4b67",
            name: "Reply Result",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [624, 16],
            parameters: { jsCode: src("reply-result.js") },
        },
        {
            id: "4e8b0c27-5d1f-49a3-b672-8c0e37f1a95d",
            name: "Respond to Sender",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1.5,
            position: [832, 16],
            parameters: {
                respondWith: "firstIncomingItem",
                options: corsHeaders(),
            },
        },
    ],
    connections: {
        "Reply Webhook": { main: [[{ node: "Send Reply", type: "main", index: 0 }]] },
        "Send Reply": { main: [[{ node: "Reply Result", type: "main", index: 0 }]] },
        "Reply Result": { main: [[{ node: "Respond to Sender", type: "main", index: 0 }]] },
    },
};

for (const [file, workflow] of [
    ["jarvis-homepage-briefing.json", briefing],
    ["jarvis-send-reply.json", reply],
]) {
    writeFileSync(join(here, file), JSON.stringify(workflow, null, 2) + "\n");
    console.log(`wrote ${file} (${workflow.nodes.length} nodes)`);
}
