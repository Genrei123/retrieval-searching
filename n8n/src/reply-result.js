// Turns whatever the Gmail node produced into a small, always-200 result the homepage can
// read. The Gmail node is set to continue on error, so a rejected send arrives here as an
// item carrying `error` rather than as a failed execution -- and a failed execution would
// skip "Respond to Sender", stripping the CORS header and leaving the browser with an
// opaque network error instead of a reason.
const r = $json ?? {};

// A successful reply comes back as the sent Gmail message resource, which always has an id.
const sent = Boolean(r.id) && !r.error;

const reason = (e) => {
  if (!e) return 'Gmail did not confirm the reply was sent.';
  if (typeof e === 'string') return e;
  return String(e.message ?? e.description ?? JSON.stringify(e));
};

return [{ json: {
  sent,
  message_id: sent ? String(r.id) : null,
  thread_id: sent ? String(r.threadId ?? '') : null,
  error: sent ? null : reason(r.error),
} }];
