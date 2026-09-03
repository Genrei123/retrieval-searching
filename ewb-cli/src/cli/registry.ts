export type RegistryEntry = {
    name: string;
    description: string;
    /** Whether this component talks to a retrieval-search backend and so needs an API URL. */
    needsApi: boolean;
    /** Copy-pasteable usage printed at the end of `ewb add`. */
    usage: string;
};

/**
 * Components are imported from the package rather than copied into the consumer's tree, so this
 * registry carries metadata only — `ewb add` writes configuration, never component source.
 */
export const REGISTRY: RegistryEntry[] = [
    {
        name: "button",
        description: "Button with solid, ghost and danger variants.",
        needsApi: false,
        usage: `import { Button } from "@ewb/cli";

<Button onClick={save}>Save</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" loading={deleting}>Delete</Button>`,
    },
    {
        name: "login-form",
        description: "Presentational sign-in form — validation and pending state, auth is yours.",
        needsApi: false,
        usage: `import { LoginForm } from "@ewb/cli";

<LoginForm
  error={authError}
  onSubmit={async ({ email, password }) => {
    await signIn(email, password);
  }}
/>`,
    },
    {
        name: "chat-bot",
        description: "Streaming RAG chat with citations, over the backend's SSE answer endpoint.",
        needsApi: true,
        usage: `import { ChatBot } from "@ewb/cli";

// Reads NEXT_PUBLIC_EWB_API_URL by default.
<ChatBot
  topK={8}
  onSourceClick={(source) =>
    router.push(
      \`/search?documentId=\${source.documentId}&section=\${source.sectionId}\`,
    )
  }
/>`,
    },
    {
        name: "search",
        description: "Full-text search over indexed sections, with highlights and match badges.",
        needsApi: true,
        usage: `import { Search } from "@ewb/cli";

<Search
  pageSize={10}
  onResultClick={(hit) => openDocument(hit.documentId, hit.sectionId)}
/>`,
    },
];

export function findEntry(name: string): RegistryEntry | undefined {
    return REGISTRY.find((entry) => entry.name === name.toLowerCase());
}

export function componentNames(): string[] {
    return REGISTRY.map((entry) => entry.name);
}
