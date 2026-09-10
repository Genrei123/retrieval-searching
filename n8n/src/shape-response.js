// The webhook's response body -- this is the contract the homepage renders against
// (see nextjs-frontend/lib/briefing.ts).
//
// Anything the model should not be paraphrasing is copied straight from the source
// nodes: llama3.2:3b reliably invents temperatures, so only prose comes from the agent.

// The agent has no output parser, so its answer arrives as the raw JSON string the
// Ollama grammar produced. A model that still manages to emit something unparseable
// must not take the whole briefing down -- the weather, inbox count and documents below
// are all real data, and a briefing missing only its prose is still worth showing.
let b = {};
try {
  const answer = $json.output ?? $json.text ?? $json;
  b = (typeof answer === 'string' ? JSON.parse(answer) : answer) ?? {};
  // The grammar wraps the briefing in `output`; unwrap it if it is still there.
  if (b.output && typeof b.output === 'object') b = b.output;
} catch {
  b = {};
}

const w = $('Get Weather').first().json;
const d = w.daily ?? {};
const c = w.current ?? {};

const CODES = {0:'clear',1:'mainly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'fog',
  51:'light drizzle',53:'drizzle',55:'heavy drizzle',61:'light rain',63:'rain',65:'heavy rain',
  80:'rain showers',81:'rain showers',82:'heavy rain showers',95:'thunderstorm',96:'thunderstorm',99:'thunderstorm'};

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const clean = (s) => String(s ?? '')
  .replace(/[͏​-‍﻿­]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// @include repliable-emails.js

// The identical filter Build Briefing Input applied, so email number N in the prompt is
// emails[N - 1] here. That is what lets the model refer to an email by number and still
// produce an action item the homepage can actually reply to.
const emails = repliableEmails();

// The card shows this many. Every one of them is repliable, so a slot spent on an
// automated sender is a slot wasted -- hence the filter above rather than a bigger cap.
const CARD_SIZE = 5;

const toActionItem = (e, why) => ({
  message_id: str(e.id),
  thread_id: str(e.threadId),
  subject: clean(e.Subject ?? e.subject ?? e.headers?.subject) || '(no subject)',
  from: clean(e.From ?? e.from ?? e.headers?.from) || '(unknown sender)',
  snippet: clean(e.snippet).slice(0, 200),
  why,
});

// Action items are resolved back to the real message rather than trusted as the model
// wrote them: a 3B model garbles long subject lines, and a reply needs a genuine Gmail
// message id. An out-of-range or repeated number simply drops the item.
const flagged = arr(b.action_items)
  .map(a => ({ n: Number(a?.email_number), why: str(a?.why) }))
  .filter(a => Number.isInteger(a.n) && a.n >= 1 && a.n <= emails.length)
  .filter((a, i, all) => all.findIndex(x => x.n === a.n) === i)
  .slice(0, CARD_SIZE);

const flaggedIndexes = new Set(flagged.map(a => a.n));

// The agent decides what is urgent, but it routinely flags one or two and the card then
// looks empty next to a full inbox. The remaining slots are filled with the newest
// repliable mail it did not pick, in Gmail's own order. Those carry no `why` -- the
// homepage renders that line only when there is one -- so an agent-flagged email still
// reads as the one that needs attention.
const backfill = emails
  .map((e, i) => ({ e, n: i + 1 }))
  .filter(({ n }) => !flaggedIndexes.has(n))
  .slice(0, Math.max(0, CARD_SIZE - flagged.length))
  .map(({ e }) => toActionItem(e, ''));

const actionItems = flagged
  .map(({ n, why }) => toActionItem(emails[n - 1], why))
  .concat(backfill)
  .filter(a => a.message_id);

// "Get Documents" continues on error, so a backend that is down arrives as an item
// with no id rather than taking the whole briefing with it.
const library = $('Get Documents').all()
  .map(i => i.json)
  .filter(x => x && x.id);

// Fisher-Yates, used for both the library and the videos: every refresh surfaces a
// different slice rather than the same rows again.
const shuffle = (items) => {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// YouTube Atom feeds, one item per channel. Parsed by hand because the payload is small
// and predictable, and pulling an XML library into the Code node sandbox is not.
const unescapeXml = (s) => String(s ?? '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

const videos = [];
for (const item of $('Get Video Feed').all()) {
  const xml = typeof item.json?.data === 'string' ? item.json.data : '';
  // Everything before the first <entry> is the feed header, hence slice(1).
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = /<yt:videoId>([^<]+)</.exec(entry)?.[1];
    if (!id) continue;
    videos.push({
      id,
      title: unescapeXml(/<title>([^<]*)</.exec(entry)?.[1]),
      channel: unescapeXml(/<name>([^<]*)</.exec(entry)?.[1]),
      published: /<published>([^<]*)</.exec(entry)?.[1] ?? null,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }
}

return [{ json: {
  generated_at: new Date().toISOString(),
  greeting: str(b.greeting) || 'Good morning, Genrey.',
  weather: {
    location: 'Quezon City',
    condition: CODES[d.weather_code?.[0]] ?? (str(b.weather?.condition) || 'unknown'),
    high_c: num(d.temperature_2m_max?.[0]),
    low_c: num(d.temperature_2m_min?.[0]),
    current_c: num(c.temperature_2m),
    feels_like_c: num(c.apparent_temperature),
    humidity_percent: num(c.relative_humidity_2m),
    rain_chance_percent: num(d.precipitation_probability_max?.[0]),
    sunrise: d.sunrise?.[0] ?? null,
    sunset: d.sunset?.[0] ?? null,
    advice: str(b.weather?.advice),
  },
  email_summary: str(b.email_summary),
  email_count: emails.length,
  action_items: actionItems,
  tasks: arr(b.tasks).slice(0, 3).map(t => ({
    task: str(t?.task),
    reason: str(t?.reason),
  })).filter(t => t.task),
  followup_question: str(b.followup_question),
  documents: shuffle(library).slice(0, 3).map(x => ({
    id: x.id,
    title: str(x.title) || 'Untitled',
    contentType: str(x.contentType),
    ingestedAt: x.ingestedAt ?? null,
  })),
  document_count: library.length,
  videos: shuffle(videos).slice(0, 4),
} }];
