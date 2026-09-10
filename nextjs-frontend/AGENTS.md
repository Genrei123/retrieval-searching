# Retrieval search — agent guidance

Next.js (App Router) frontend for the `retrieval-search` Spring Boot backend (sibling directory,
`../rag-document-search`). It talks to the backend's REST API directly from the browser — see
`NEXT_PUBLIC_API_BASE_URL` in `.env.example` (defaults to `http://localhost:8080/api/v1`). The
backend allows CORS from `http://localhost:3000` by default (`app.cors.allowed-origins` in
`../rag-document-search/src/main/resources/application.yaml`).

It has a second data source: the two n8n workflows in `../n8n/`. The homepage reads its briefing
from `Jarvis Homepage Briefing` (`NEXT_PUBLIC_N8N_BRIEFING_URL`) and sends email replies through
`Jarvis Send Reply` (`NEXT_PUBLIC_N8N_REPLY_URL`).

## Architecture

- `app/page.tsx` — Home: the morning briefing as a bento grid. Weather, inbox summary, emails
  needing a reply (each one openable into a composer that sends through Gmail), today's tasks,
  Jarvis's follow-up question about yesterday, a YouTube player, and three random documents from
  the library. Around that briefing sit three static sections that need no workflow: the tech
  snackbar above it, and the Philippine newsstand and a Wikipedia fact below.
- `app/ask/page.tsx` — Ask: streaming RAG chat over ingested documents.
- `app/search/page.tsx` — Search: full-text search over document sections, and the app's document
  reader. `?documentId=<id>` opens a document with the search box scoped to it; `&section=<id>`
  highlights and scrolls to one passage. Build those URLs with `documentHref()` from
  `lib/links.ts` rather than by hand. The reader has two views: the original uploaded file, and
  the indexed sections (the only view that can highlight a cited passage, so a `section` link
  opens there).
- `app/documents/page.tsx` — Documents: upload (with async ingestion job polling), list, delete.
  Clicking a document opens it in the Search tab.
- `lib/api.ts` — typed fetch wrappers for every backend endpoint, plus `answerStreamUrl` for SSE.
- `lib/briefing.ts` — the briefing's wire type, the `fetch` that runs the workflow, the
  `localStorage` cache holding its result, and `runBriefing()`. The snake_case field names mirror
  the workflow's `Shape Response` node; changing one means changing the other.
- `lib/local-store.ts` — turns a `localStorage` key into a `useSyncExternalStore` source. Both
  browser-held things (the cached briefing, the task ticks) go through it.
- `lib/reply.ts` — `sendReply()` plus the set of message ids already replied to from this browser,
  which is what puts the "Replied" badge on an action item and stops an accidental second send.
- `lib/task-log.ts` — which of Jarvis's daily tasks were ticked off, per calendar day. Browser-only:
  it is a personal checklist, not retrieval data.
- `lib/day.ts` — local calendar days as `YYYY-MM-DD`, plus the date and clock formatting the
  homepage uses.
- `lib/calendar.ts` — month-grid arithmetic for the homepage calendar, in `YYYY-MM-DD` strings
  and local `Date` parts. Never UTC: the backend stores a day as a `DATE` with no timezone, and
  `toISOString()` in Manila moves a late-evening entry to the next day.
- `lib/theme.ts` — the light/dark/system preference, in `localStorage` under `jarvis.theme`, plus
  `applyTheme()` which is the only place the `dark` class is written from React.
- `lib/discover.ts` — the homepage's hand-curated reading lists: `TECH_READS` (the snackbar),
  `PH_OUTLETS` (the Philippine newsstand, with `outletThumbnail()` for its favicons) and
  `WIKI_FACTS`. Constants, not a feed — nothing here is fetched. Keep the URLs canonical landing
  pages rather than dated permalinks so the lists do not rot.
- `components/briefing-store.tsx` — subscribes to the cache and the run; `components/home-bento.tsx`
  is the grid and its tiles.
- `components/discover.tsx` — the three briefing-independent homepage sections built from
  `lib/discover.ts`: `TechSnackbar`, `PhilippineNewsTile` and `WikipediaFactTile`. They render
  outside the `briefing ? … : …` branch in `home-bento.tsx`, so the homepage is never blank while
  the workflow runs.
- `components/calendar-panel.tsx` — the right-rail calendar: a month grid with the user's planner
  entries and Philippine holidays on it, and add/edit/delete for the planner. Reads and writes the
  backend's `/calendar` endpoints (see `lib/api.ts`), so the data lives in the stack's Postgres and
  the briefing workflow can read the same rows.
- `components/theme-toggle.tsx` — cycles system → light → dark, in the nav.
- `components/tile.tsx` — `Tile` and `Eyebrow`, the bento primitives, shared by `home-bento.tsx`
  and `discover.tsx` so neither has to import the other.
- `hooks/use-mounted.ts` — `false` until hydration finishes, then `true`. Gate anything derived
  from the clock or `Math.random()` on it (the header's date, the fact tile's opening pick), or
  the server markup and the first client render disagree.
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
  in client components. The n8n webhook is called the same way, which is why the CORS header
  lives on the workflow's `Respond to Homepage` node rather than on a proxy route here.
- The briefing workflow runs a local 3B model end to end, so a call costs a minute or two. It is
  run exactly twice at most per browser per day: once when nothing is cached, and again if the
  user presses Refresh. A cached briefing from an earlier day is shown and labelled stale rather
  than silently re-fetched — never add a staleness-based auto-refetch.
- n8n answers no CORS preflight — an `OPTIONS` to a webhook 500s with no
  `Access-Control-Allow-Origin` — so every browser call to it must stay CORS-simple. The briefing
  is a bare `GET` with no custom headers; the reply is a `POST` whose body is a `URLSearchParams`,
  so `fetch` sets a form content type on its own. Adding a header, or switching the reply to a
  JSON body, makes the call unsendable.
- An action item carries a real Gmail `message_id`, resolved in the workflow from the email number
  the model gave. Never reply against a subject line the model wrote — a 3B model garbles them,
  and Gmail needs the id to thread the reply and address it.
- Browser-held state is read through `useSyncExternalStore` (`lib/local-store.ts`), never with an
  effect that copies `localStorage` into `useState`. React 19's rules reject a synchronous
  `setState` in an effect body (`react-hooks/set-state-in-effect`), and `npm run lint` enforces it.
- Page-level state that a user would be annoyed to lose belongs in `components/providers.tsx`, not
  in the page component: App Router unmounts a page on every tab switch, which is what used to
  clear the question and the search results.
- Dark mode is a palette inversion, not a second set of classes. `app/globals.css` redefines
  Tailwind's `--color-*` ramp under `.dark` (50 takes 950's value, and so on), so every existing
  `stone-*`, `bg-white` and accent utility flips at once and new components are themed for free —
  keep writing plain light-theme classes. Anything that must stay light in both themes needs an
  arbitrary value (`bg-[#fff]`), which compiles to a literal instead of a variable. The class is
  put on `<html>` before first paint by the inline script in `app/layout.tsx`, which is why the
  root element carries `suppressHydrationWarning`.
- `/answer/stream` is a GET SSE endpoint, so streaming is driven by `EventSource`, not
  fetch+ReadableStream — don't reach for the `ai` SDK's `useChat` here, the wire format doesn't
  match its data-stream protocol.
- Changing anything in this directory does **not** change what the stack serves until the image is
  rebuilt: `docker compose up -d` reuses an existing `jarvis-frontend:latest` and only builds one
  that is missing. Use `docker compose up -d --build frontend`, or `docker compose watch` (the
  `develop.watch` block on the frontend service rebuilds on every edit). The three
  `NEXT_PUBLIC_*` values are build args baked into the client bundle, so changing one is also a
  rebuild, not a restart.
