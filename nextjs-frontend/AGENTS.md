# RAG Library frontend guidance

Next.js App Router UI for the sibling Spring Boot backend. The only views are Search, Ask,
and Documents; `/` redirects to `/search`. All data requests go directly from the browser to
`NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8080/api/v1`.

## Architecture

- `app/search/page.tsx`: full-text search and document reader. Build document/section links with
  `documentHref()` from `lib/links.ts`.
- `app/ask/page.tsx`: streaming document-grounded answers. Exact repeats are cached by the backend.
- `app/documents/page.tsx`: document CRUD and visualization of the real ingestion/chunking process.
- `components/providers.tsx`: root Ask, Search, and Documents providers retain work across tab switches.
- `components/documents-store.tsx`: create/edit draft, file selection, sequential job polling,
  preview loading, and invalidation after successful document changes.
- `components/document-upload.tsx`: create or edit title/source/version, optionally replace a file.
- `components/chunking-progress.tsx`: actual backend stages and chunk cards with word counts,
  headings, relative sizes, and full-text inspection. Never simulate stages with timers.
- `components/document-list.tsx`: library, reader links, edit/replace, confirmed deletion.
- `components/search-store.tsx`: search slots per scope plus fetched-document cache. Document
  mutations invalidate these and reset the visible answer to prevent stale citations.
- `components/document-view.tsx`: section reader and cached loader. Never cache a cancelled fetch.
- `components/document-original.tsx`: original file reader; uploaded HTML uses a sandboxed iframe.
- `hooks/use-answer-stream.ts`: native EventSource for sources, token, cache, and done events.
- `lib/api.ts`: typed backend requests. Multipart POST creates; multipart PUT updates by ID.
- `lib/theme.ts` and `lib/local-store.ts`: preferences through useSyncExternalStore.

## Invariants

- The backend owns retrieval, generation, extraction, and chunking. No frontend API routes.
- Page-level state that should survive tab changes belongs in the root providers.
- React 19 lint rejects copying external state synchronously into state from effects.
- Keep EventSource for the GET SSE endpoint; its protocol is not the AI SDK protocol.
- Snippets are untrusted text. Only their mark tags become highlights; never render them as raw HTML.
- Dark mode inverts the CSS palette in globals.css. Use normal stone/white utility classes.
- Upload previews are bounded; after successful completion fetch the actual saved sections.
- Metadata-only edits retain chunks. Replacements keep the ID and atomically replace file/sections.
- Existing database migrations remain immutable for Flyway compatibility.

## Verification and runtime

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
The Docker image must be rebuilt after source/config changes:
`docker compose up -d --build --remove-orphans`.
The public API URL is baked into the browser bundle at build time.