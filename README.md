# RAG Library

A focused document dataset manager with full-text retrieval and OpenAI-powered retrieval-augmented generation.
The app contains three views: **Search**, **Ask**, and **Documents**. The root URL redirects to Search.

## Run

Copy `.env.example` to `.env` at the repository root and set `OPENAI_API_KEY` to your OpenAI API key.
The key is backend-only and `.env` is ignored by Git. Never put it in a `NEXT_PUBLIC_*` variable.

```bash
docker compose up -d --build --remove-orphans
```

The stack runs PostgreSQL, the Spring Boot API, and the Next.js UI. Generation uses the OpenAI Responses API.
The automation services and their workflow files have been removed. When upgrading an existing
stack, `--remove-orphans` stops containers no longer declared by Compose; existing data volumes
are not deleted. The Compose project name and retrieval volume names remain unchanged.

| Service | URL |
| --- | --- |
| RAG Library | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| API documentation | http://localhost:8080/swagger-ui.html |

## OpenAI configuration

The default model is `gpt-6-luna`, configurable with `OPENAI_MODEL`. The model must be available
to your OpenAI API project. The application uses the [Responses API](https://developers.openai.com/api/docs/guides/text)
and [streaming events](https://developers.openai.com/api/docs/guides/streaming-responses).
[GPT-6 Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) describes the default model.

| Backend environment variable | Default |
| --- | --- |
| OPENAI_API_KEY | Empty; required to generate answers |
| OPENAI_MODEL | gpt-6-luna |
| OPENAI_REASONING_EFFORT | low (empty omits this setting for models that do not support it) |
| OPENAI_MAX_OUTPUT_TOKENS | 2048 (includes reasoning tokens) |
| OPENAI_TIMEOUT | PT2M |

When running Java directly from your IDE, set these variables in its run configuration;
Spring Boot does not automatically load the root Compose `.env` file. Restart the backend after changing them.
Uploads, chunking, and search work without a key. Ask displays a configuration error when generation needs one.
The question and selected excerpts are sent to OpenAI; original files and the search index remain in your database.
Requests set `store: false` to disable Responses API response storage. Exact-repeat answers are still reused
from backend memory without another API call. Failed or incomplete responses are not cached.
Ollama and its model-download job are no longer required; existing volumes are not deleted by this change.

## Document CRUD and chunk inspection

- **Create:** upload a PDF, Markdown, or HTML file with a title, version, and optional source reference.
- **Read:** open a document from the library to read its original file or indexed chunks and search within it.
- **Update:** choose **Edit / Replace file**. Change metadata only, or select a replacement file to extract,
  chunk, and index it again. Updates keep the document ID. The previous content remains intact if processing fails.
- **Delete:** confirm deletion of the document, original file, and indexed chunks.

Files may be up to 25 MB. PDFs require extractable text; scanned PDFs need OCR before upload.
HTML is converted to visible text with H1-H3 headings retained. Duplicate uploads with the same title
and checksum keep the existing document; different content with an existing title must use Edit / Replace file.

During upload, the UI polls real backend progress: transfer, extraction, chunk creation, and indexing.
Small files can complete between polls; completed stages and chunk output remain visible for inspection.
Chunk cards show order, headings, word counts, relative size, and expandable full text after saving.
Processing previews contain up to 100 chunks with 300-character excerpts; the saved document view loads
all chunks and pages through them. Metadata-only edits explicitly show that existing chunks were retained.
Upload state and polling survive navigation between app tabs, but not a browser reload or backend restart.

Markdown and HTML split at H1-H3 boundaries. Large sections group paragraphs toward 400 words; PDFs group
sentences toward 400 words. Individual oversized paragraphs/sentences are split, and every new chunk is
limited to 800 words. Neighbors under 50 words merge when the combined chunk stays within the limit.
Successful changes clear both browser retrieval state and the backend answer cache.

### API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /api/v1/documents | Multipart upload: file, title, sourceUri (optional), version |
| GET | /api/v1/documents | List documents |
| GET | /api/v1/documents/{id} | Metadata |
| GET | /api/v1/documents/{id}/content | Metadata and ordered chunks |
| GET | /api/v1/documents/{id}/file | Original file |
| PUT | /api/v1/documents/{id} | Multipart title, sourceUri, version; optional replacement file |
| DELETE | /api/v1/documents/{id} | Delete document and associated content |
| GET | /api/v1/documents/jobs/{jobId} | Status, real processing stage, chunk counts and previews |

POST and PUT return HTTP 202 with a jobId. The job reaches DONE, SKIPPED_UNCHANGED, or FAILED.
Job snapshots are process-local and bounded to 128 jobs; completed jobs older than an hour are cleaned
up on subsequent uploads, and older finished jobs may be evicted earlier at capacity.
The historical calendar migration is retained so existing Flyway databases can upgrade unchanged;
its API and UI have been removed.

## Search and answer memory

Search removes conversational framing (for example, "Can you please explain connection pooling?")
before retrieval, while retaining the original question for generation. Quoted phrases, `OR`, and
excluded terms keep their search syntax. Global results retain a three-section limit per document;
searching inside one document can page through all matching sections.

Ask stores completed answers and their sources in backend memory. The **second identical question**
and subsequent repeats replay that answer without another search or model call. Matching includes
the exact submitted text, document scope, source count (`topK`), and answer/topic mode. Case or
punctuation changes are separate questions. JSON and streaming answers share the same cache;
concurrent identical requests share one generation. The UI labels replays as served from memory.

Memory holds up to 256 answers for 30 minutes by default, evicts the least recently used entries,
and resets on backend restart. Configure `ANSWER_CACHE_MAX_ENTRIES` and `ANSWER_CACHE_TTL` (an ISO
duration such as `PT30M`) in the backend environment. A zero capacity or TTL disables retention.
Uploads, re-ingestion, and deletion invalidate answers after successful writes; failed or incomplete
model output is never retained. Memory belongs to one backend process and the shared document
library; it is not durable conversation history or a cache shared between server replicas.

Generation uses a bounded, deduplicated set of excerpts, numbered source citations, and a prompt
that asks the model to acknowledge missing evidence. The displayed source numbers correspond to
the excerpts actually passed to the model.


## Development and verification

The backend requires JDK 21+ and Maven (or the included wrapper). The frontend requires Node.js.

```bash
cd nextjs-frontend
npm ci
npm run dev
npm run lint
npm run build
```

`NEXT_PUBLIC_API_BASE_URL` is baked into the browser bundle. It defaults to
http://localhost:8080/api/v1. Backend configuration is in
`rag-document-search/src/main/resources/application.yaml`. Optional Compose answer-cache settings
are shown in `.env.example`.

```bash
cd rag-document-search
./mvnw '-Dtest=*Test,!SearchIntegrationTest' test
./mvnw -Dtest=SearchIntegrationTest -Dapi.version=1.44 test  # disposable PostgreSQL; Docker required
```

After source changes, rebuild the running stack with
`docker compose up -d --build --remove-orphans`. This repository contains no external workflow
or email integration. OpenAI generates answers from retrieved excerpts of your uploaded documents.
