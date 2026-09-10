#!/bin/sh
# First-run seeding for a fresh machine, run by the `n8n-import` compose service
# before `n8n` itself starts. Importing before startup is deliberate: n8n registers
# production webhooks as it boots, so workflows that appear afterwards keep 404ing
# until a restart (which is why ./import.sh restarts the container and this does not).
#
# This runs ONCE per n8n data volume. A marker file in the volume makes every later
# `docker compose up` a no-op, so workflows edited in the n8n UI are never clobbered.
# To push changed workflow definitions to a running n8n, use ./import.sh instead.
set -e

MARKER=/home/node/.n8n/.jarvis-seeded

if [ -f "$MARKER" ]; then
    echo "n8n already seeded — skipping (use ./n8n/import.sh to push workflow changes)."
    exit 0
fi

echo "Fresh n8n detected — seeding workflows and local credentials..."

# The two credentials that point at other containers in this stack. Both are
# local-only, so they can be recreated from config; the Gmail credential is an
# OAuth grant against a real Google account and has to be added by hand in the UI.
cat > /tmp/jarvis-credentials.json <<EOF
[
  {
    "id": "pzpQke7yc1q3hNGz",
    "name": "Ollama account",
    "type": "ollamaApi",
    "data": { "baseUrl": "http://ollama:11434" }
  },
  {
    "id": "5XBq8dDbpRxVOz24",
    "name": "Postgres account",
    "type": "postgres",
    "data": {
      "host": "n8n-postgres",
      "port": 5432,
      "database": "${DB_POSTGRESDB_DATABASE}",
      "user": "${DB_POSTGRESDB_USER}",
      "password": "${DB_POSTGRESDB_PASSWORD}",
      "ssl": "disable",
      "allowUnauthorizedCerts": false,
      "maxQueryExecutionTime": 0
    }
  }
]
EOF

n8n import:credentials --input=/tmp/jarvis-credentials.json
rm -f /tmp/jarvis-credentials.json

# `import:workflow` loads a definition but leaves it unpublished; `publish:workflow`
# is what makes a version live and its webhook resolvable.
for entry in "jarvis-homepage-briefing.json:gil5JXItoV0Ox4mV" "jarvis-send-reply.json:jrvsReply0000001"; do
    file=${entry%%:*}
    id=${entry##*:}
    n8n import:workflow --input="/seed/$file"
    n8n publish:workflow --id="$id"
done

touch "$MARKER"

echo "Seeded. Add the Gmail credential in the n8n UI to finish setup:"
echo "  http://localhost:5678  ->  Credentials  ->  Gmail account"
