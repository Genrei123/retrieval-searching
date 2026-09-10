// Shared by "Build Briefing Input" and "Shape Response", inlined into both by build.mjs's
// `@include`. The two Code nodes run in separate sandboxes but are bound by a contract:
// the agent names an action item by the email's position in the prompt list, and Shape
// Response resolves that number back to a real message by index. Filtering in one node
// only would shift the numbering and reply to the wrong person, so the filter lives here
// once and both sides get the identical copy.

// Automated senders that discard whatever is sent back. Replying is a dead letter, so
// they never earn a slot on the "Needs a reply" card -- and dropping them before the
// prompt is built keeps a 3B model's small context on mail that can actually be answered.
const NO_REPLY =
  /(^|[^a-z0-9])(no[._-]?reply|do[._-]?not[._-]?reply|donotreply|mailer[-_]?daemon|postmaster|bounces?)([^a-z0-9]|$)/i;

// `Genrey <no-reply@example.com>` -> `no-reply`. Matching only the local part keeps a
// domain like `noreply.example.com` from disqualifying a human sender there.
const localPart = (from) => {
  const angled = /<([^>]*)>/.exec(String(from ?? ''));
  const addr = (angled ? angled[1] : String(from ?? '')).trim();
  return addr.split('@')[0] ?? '';
};

const senderOf = (e) => e.From ?? e.from ?? e.headers?.from;

// "Always Output Data" on the Gmail node can emit one empty item; drop that too.
const repliableEmails = () => $('Get Emails').all()
  .map(i => i.json)
  .filter(e => e && (e.id || e.Subject || e.subject || e.snippet))
  .filter(e => !NO_REPLY.test(localPart(senderOf(e))));
