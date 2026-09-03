# @ewb/cli

React components for the [retrieval-search](../) RAG backend, plus a CLI that
wires them into your project.

```bash
npm install @ewb/cli
npx ewb add chat-bot
```

## Components

| Component | Needs a backend | What it does |
|---|---|---|
| `<ChatBot />` | yes | Streaming RAG chat with citations, over the backend's SSE answer endpoint |
| `<Search />` | yes | Full-text search over indexed sections, with highlights and match badges |
| `<LoginForm />` | no | Presentational sign-in form — validation and pending state, auth is yours |
| `<Button />` | no | Button with `solid`, `ghost` and `danger` variants |

Run `npx ewb list` to see the same table in your terminal.

## Setup

Import the stylesheet once, anywhere that loads on every page (`ewb add` offers to do this for
you):

```tsx
// app/layout.tsx
import "@ewb/cli/styles.css";
```

Then point the components at your backend:

```bash
# .env.local
NEXT_PUBLIC_EWB_API_URL=http://localhost:8080/api/v1
```

```tsx
import { ChatBot } from "@ewb/cli";

export default function Page() {
  return <ChatBot />;
}
```

## Pointing components at your own data

**One environment variable.** `NEXT_PUBLIC_EWB_API_URL` is the entire configuration surface —
aim it at your own deployment of the retrieval-search backend and the components follow.

```tsx
<ChatBot />                                               // reads NEXT_PUBLIC_EWB_API_URL
<ChatBot apiBaseUrl="https://rag.acme.internal/api/v1" /> // or override per instance
```

The browser never talks to Ollama or Postgres. It calls `GET /api/v1/answer/stream`, and the
Spring backend talks to the model and the database server-side:

```
<ChatBot apiBaseUrl=… />  →  retrieval-search backend  →  Ollama + Postgres
   NEXT_PUBLIC_EWB_API_URL     OLLAMA_BASE_URL, OLLAMA_MODEL, DB_*
```

So changing the model, the database, or the chunking is a change to **your backend deployment**,
not to the component. Those variables (documented in `.env.example`) are:

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where the backend reaches Ollama |
| `OLLAMA_MODEL` | `llama3.2:3b` | Model used for generation |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `5432` / `retrieval_search` / `retrieval` / `retrieval` | Postgres connection |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origins allowed to call the API — **add your app's origin here** |

If your app runs anywhere other than `http://localhost:3000`, the browser's CORS preflight will
block every request until you add that origin to `CORS_ALLOWED_ORIGINS` on the backend.

## Props

### `<ChatBot />`

| Prop | Type | Default |
|---|---|---|
| `apiBaseUrl` | `string` | `NEXT_PUBLIC_EWB_API_URL`, then `http://localhost:8080/api/v1` |
| `topK` | `number` | `8` (backend clamps to 1–10) |
| `documentId` | `string` | — restrict retrieval to one document |
| `onSourceClick` | `(source: SearchResult) => void` | — |
| `sourceHref` | `(source: SearchResult) => string` | — |
| `placeholder`, `className` | `string` | |

Citations are inert unless you give them somewhere to go. The library imports nothing from
`next/*`, so where a citation leads is your app's decision:

```tsx
<ChatBot
  onSourceClick={(source) =>
    router.push(`/search?documentId=${source.documentId}&section=${source.sectionId}`)
  }
/>
```

### `<Search />`

Same `apiBaseUrl` / `documentId` resolution, plus `pageSize`, `placeholder`, `onResultClick`
and `resultHref`.

### `<LoginForm />`

```tsx
<LoginForm
  error={authError}
  onSubmit={async ({ email, password }) => {
    await signIn(email, password);   // your identity provider
  }}
/>
```

The retrieval-search backend has no authentication, so this component is deliberately
presentational: it handles validation, the pending state (derived from your `onSubmit` promise),
error display and ARIA wiring, and leaves the actual sign-in to you.

### `<Button />`

```tsx
<Button onClick={save}>Save</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" loading={deleting}>Delete</Button>
```

## Theming

The look is deliberately plain — a neutral palette and the system UI font, so the components read
as part of your app rather than as a themed widget. Monospace is used only for code inside an
answer.

The palette is **light by default and follows `prefers-color-scheme`**. To pin one scheme, set
`data-theme` on the component or any ancestor:

```tsx
<div data-theme="dark">
  <ChatBot />
</div>
```

Every value is a CSS custom property on `.ewb-root`. Redefine any of them, globally or on one
subtree:

```css
.ewb-root {
  --ewb-accent: #2563eb;      /* solid button background */
  --ewb-accent-fg: #ffffff;   /* text on that background */
  --ewb-radius: 12px;
}
```

Full token list: `--ewb-bg`, `--ewb-surface`, `--ewb-surface-hover`, `--ewb-fg`, `--ewb-muted`,
`--ewb-accent`, `--ewb-accent-fg`, `--ewb-danger`, `--ewb-border`, `--ewb-border-strong`,
`--ewb-focus`, `--ewb-mark-bg`, `--ewb-mark-fg`, `--ewb-radius`, `--ewb-gap`, `--ewb-pad`,
`--ewb-font`, `--ewb-font-mono`, `--ewb-font-size`, `--ewb-line`.

Styles are prebuilt and scoped under `.ewb-root`, so there is no Tailwind requirement and
nothing leaks into the rest of your page.

## CLI

```
ewb list                          list the available components
ewb add <component>               configure a component for this project
  --api-url <url>                 skip the prompt and use this backend URL
  -y, --yes                       accept defaults without prompting (for CI)
ewb config show                   print stored defaults
ewb config set api-url <url>      remember a default for future projects
```

`ewb add` writes no component source — the components are imported from this package. It resolves
the backend URL, checks that the backend is reachable and reports how many documents are indexed,
sets `NEXT_PUBLIC_EWB_API_URL` in `.env.local` (creating or amending it, never overwriting the
rest), makes sure the stylesheet is imported in your root layout, and prints the usage snippet.

## Requirements

React 18 or 19 (peer dependency), Node 18+ for the CLI. Works in Next.js, Vite, Remix and CRA —
the components carry a `"use client"` banner for the Next.js App Router and never touch
`process` unguarded, so a Vite build with no `process` global is fine.

## Publishing to Azure Artifacts

Two `.npmrc` files are involved, and conflating them is the usual reason a publish fails:

| File | Contains | Committed? |
|---|---|---|
| `ewb-cli/.npmrc` | the feed URL for the `@ewb` scope — **no credentials** | yes (from `.npmrc.example`) |
| `~/.npmrc` (user-level) | your access token | **never** — it's gitignored here as a safety net |

**One-time setup:**

```bash
cp .npmrc.example .npmrc          # then fill in your org / project / feed
npm install -g vsts-npm-auth      # Windows
vsts-npm-auth -config .npmrc      # writes a token into ~/.npmrc, not into .npmrc
```

On macOS/Linux there is no `vsts-npm-auth`; use the feed's **Connect to feed → npm → Other**
panel, which prints the base64 token block to paste into `~/.npmrc`.

**Every release:**

```bash
npm version patch    # REQUIRED — Azure feeds are immutable, a version can never be reused
npm publish
```

`prepublishOnly` runs the build first, so `dist/` is always current in the tarball.

**Consumers need the feed too.** `npm install @ewb/cli` only works in a project that has the same
`@ewb:registry` line in its own `.npmrc` (see `.npmrc.consumer.example`) *and* is authenticated.
Without both, npm looks on the public registry and fails with 404. Hand teammates those two steps
along with the package name.

## Local development

```bash
npm install
npm run typecheck
npm run build
npm pack          # produces ewb-cli-0.1.0.tgz for installing into a test app
```
