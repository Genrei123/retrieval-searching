#!/bin/sh
# Regenerates the workflows and loads them into the running n8n container.
#
#   ./import.sh
#
# n8n registers production webhooks at startup, so the container is restarted at the
# end -- without that, the webhooks keep 404ing even though the workflows are published.
set -e
cd "$(dirname "$0")"

# Git Bash rewrites the container-side paths below into Windows paths without this.
MSYS_NO_PATHCONV=1
export MSYS_NO_PATHCONV

CONTAINER=${N8N_CONTAINER:-jarvis-n8n-1}

node build.mjs

for entry in "jarvis-homepage-briefing.json:gil5JXItoV0Ox4mV" "jarvis-send-reply.json:jrvsReply0000001"; do
  file=${entry%%:*}
  id=${entry##*:}
  docker cp "$file" "$CONTAINER:/tmp/$file"
  # import deactivates by default; publish:workflow is what makes a version live.
  docker exec "$CONTAINER" n8n import:workflow --input="/tmp/$file"
  docker exec "$CONTAINER" n8n publish:workflow --id="$id"
done

docker restart "$CONTAINER" >/dev/null

echo "Imported."
echo "  briefing: http://localhost:5678/webhook/jarvis-briefing"
echo "  reply:    http://localhost:5678/webhook/jarvis-reply"
