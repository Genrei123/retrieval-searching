# Retrieval Search — frontend

Next.js UI for the `retrieval-search` Spring Boot backend: upload and manage documents, run
full-text search over their sections, and ask questions answered by retrieval-augmented
generation, streamed in as the model writes them.

## Quick start

Start the backend first (see `../README.md` / `../docker-compose.yml`), then:

```bash
npm install
cp .env.example .env.local   # defaults already point at http://localhost:8080/api/v1
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route         | What                                                                |
|---------------|----------------------------------------------------------------------|
| `/`           | Ask a question; the answer streams in token-by-token via SSE, with the retrieved sources listed underneath. |
| `/search`     | Full-text search over document sections, paginated.                  |
| `/documents`  | Upload a PDF/Markdown/HTML file (polls the async ingestion job until it finishes), list uploaded documents, delete one. |

## How streaming works

`GET /api/v1/answer/stream` on the backend is a Server-Sent Events endpoint: it emits a `sources`
event once retrieval finishes, then a `token` event per chunk of generated text, then `done`.
`hooks/use-answer-stream.ts` drives it with the browser's native `EventSource`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · react-markdown + remark-gfm.

No server-side API routes of its own — every backend call happens directly from the browser
against `NEXT_PUBLIC_API_BASE_URL` (see `lib/api.ts`), which requires the backend's CORS config
(`app.cors.allowed-origins` in `../src/main/resources/application.yaml`) to include this app's
origin.
