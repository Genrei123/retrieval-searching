# Retrieval search — agent guidance

Next.js (App Router) frontend for the `retrieval-search` Spring Boot backend (sibling directory,
`../src`). It talks to the backend's REST API directly from the browser — see
`NEXT_PUBLIC_API_BASE_URL` in `.env.example` (defaults to `http://localhost:8080/api/v1`). The
backend allows CORS from `http://localhost:3000` by default (`app.cors.allowed-origins` in
`../src/main/resources/application.yaml`).

## Architecture

- `app/page.tsx` — Ask: streaming RAG chat over ingested documents.
- `app/search/page.tsx` — Search: full-text search over document sections, and the app's document
  reader. `?documentId=<id>` opens a document with the search box scoped to it; `&section=<id>`
  highlights and scrolls to one passage. Build those URLs with `documentHref()` from
  `lib/links.ts` rather than by hand. The reader has two views: the original uploaded file, and
  the indexed sections (the only view that can highlight a cited passage, so a `section` link
  opens there).
- `app/documents/page.tsx` — Documents: upload (with async ingestion job polling), list, delete.
  Clicking a document opens it in the Search tab.
- `lib/api.ts` — typed fetch wrappers for every backend endpoint, plus `answerStreamUrl` for SSE.
- `hooks/use-answer-stream.ts` — drives `GET /answer/stream` via `EventSource`. The backend emits
  a `sources` event once retrieval finishes, then one `token` event per generated chunk, then
  `done`.
- `components/markdown.tsx` — renders the streamed answer; safe to re-render on every token since
  react-markdown tolerates incomplete syntax mid-stream.
- `components/providers.tsx` — mounted in the root layout, so the Ask conversation and every search
  (per scope) survive a tab switch. `components/ask-store.tsx` owns the question, draft input and
  live stream; `components/search-store.tsx` owns one search slot per scope (`ALL_SCOPE` or a
  document id) plus a session cache of fetched documents.
- `components/document-view.tsx` — `useDocumentContent` (cached loader for
  `GET /documents/{id}/content`) and `DocumentSections`, which renders the sections and highlights
  the cited one.
- `components/document-original.tsx` — the file as uploaded, from `GET /documents/{id}/file`: PDFs
  in an iframe, markdown re-rendered from source, HTML in a `sandbox=""` iframe (uploaded HTML is
  untrusted). `content.original` is null for documents ingested before the backend kept originals
  — re-uploading the same file backfills one.
- `components/snippet.tsx` — renders `ts_headline` snippets: `<mark>` tags become real highlights,
  everything else stays text (Postgres does not escape the document body, so never use
  `dangerouslySetInnerHTML` on a snippet).

## Invariants

- The backend is the source of truth for retrieval and generation; this app has no server-side
  API routes of its own (no `app/api/**`) — all backend calls happen client-side or via `fetch`
  in client components.
- Page-level state that a user would be annoyed to lose belongs in `components/providers.tsx`, not
  in the page component: App Router unmounts a page on every tab switch, which is what used to
  clear the question and the search results.
- `/answer/stream` is a GET SSE endpoint, so streaming is driven by `EventSource`, not
  fetch+ReadableStream — don't reach for the `ai` SDK's `useChat` here, the wire format doesn't
  match its data-stream protocol.
