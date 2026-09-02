# Retrieval search — agent guidance

Next.js (App Router) frontend for the `retrieval-search` Spring Boot backend (sibling directory,
`../src`). It talks to the backend's REST API directly from the browser — see
`NEXT_PUBLIC_API_BASE_URL` in `.env.example` (defaults to `http://localhost:8080/api/v1`). The
backend allows CORS from `http://localhost:3000` by default (`app.cors.allowed-origins` in
`../src/main/resources/application.yaml`).

## Architecture

- `app/page.tsx` — Ask: streaming RAG chat over ingested documents.
- `app/search/page.tsx` — Search: full-text search over document sections.
- `app/documents/page.tsx` — Documents: upload (with async ingestion job polling), list, delete.
- `lib/api.ts` — typed fetch wrappers for every backend endpoint, plus `answerStreamUrl` for SSE.
- `hooks/use-answer-stream.ts` — drives `GET /answer/stream` via `EventSource`. The backend emits
  a `sources` event once retrieval finishes, then one `token` event per generated chunk, then
  `done`.
- `components/markdown.tsx` — renders the streamed answer; safe to re-render on every token since
  react-markdown tolerates incomplete syntax mid-stream.

## Invariants

- The backend is the source of truth for retrieval and generation; this app has no server-side
  API routes of its own (no `app/api/**`) — all backend calls happen client-side or via `fetch`
  in client components.
- `/answer/stream` is a GET SSE endpoint, so streaming is driven by `EventSource`, not
  fetch+ReadableStream — don't reach for the `ai` SDK's `useChat` here, the wire format doesn't
  match its data-stream protocol.
