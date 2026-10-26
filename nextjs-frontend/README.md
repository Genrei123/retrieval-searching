# RAG Library frontend

Next.js UI for the sibling Spring Boot backend. Run `npm ci` and `npm run dev` after starting
the backend. The browser calls `NEXT_PUBLIC_API_BASE_URL` directly (default http://localhost:8080/api/v1).

| Route | Purpose |
| --- | --- |
| / | Redirect to Search |
| /search | Search and read documents, original files, and indexed chunks |
| /ask | Stream document-grounded answers and replay exact questions from memory |
| /documents | Upload, inspect real chunking output, edit metadata, replace files, delete |

Root providers retain searches, answers, draft uploads, and upload polling across tab switches.
Document changes invalidate cached document content and search results and reset the visible answer.
Job progress comes from the backend, not animation timers. Completed uploads show full chunk text.

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` to verify changes.
The Docker image must be rebuilt after changes: `docker compose up -d --build frontend`.
See the root README for API routes, chunking rules, and backend tests.
