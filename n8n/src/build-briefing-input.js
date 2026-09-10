// Weather and email are pulled from their nodes by name rather than from this node's
// input, because "Get Documents" now sits between Gmail and here.
const w = $('Get Weather').first().json;
const d = w.daily ?? {};
const c = w.current ?? {};

const CODES = {0:'clear',1:'mainly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'fog',
  51:'light drizzle',53:'drizzle',55:'heavy drizzle',61:'light rain',63:'rain',65:'heavy rain',
  80:'rain showers',81:'rain showers',82:'heavy rain showers',95:'thunderstorm',96:'thunderstorm',99:'thunderstorm'};

const weather = [
  `Condition: ${CODES[d.weather_code?.[0]] ?? 'unknown'}`,
  `High ${d.temperature_2m_max?.[0]}C, low ${d.temperature_2m_min?.[0]}C`,
  `Right now ${c.temperature_2m}C, feels like ${c.apparent_temperature}C, humidity ${c.relative_humidity_2m}%`,
  `Chance of rain today: ${d.precipitation_probability_max?.[0]}%`,
  `Sunrise ${d.sunrise?.[0]?.slice(11)}, sunset ${d.sunset?.[0]?.slice(11)}`,
].join('\n');

// Marketing mail pads subjects and snippets with invisible characters. Strip them,
// otherwise they eat a large share of a small model's context.
const clean = (s) => String(s ?? '')
  .replace(/[\u034f\u200b-\u200d\ufeff\u00ad]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// @include repliable-emails.js

// No-reply senders are dropped here rather than in the prompt, so the numbering the agent
// sees already matches what Shape Response resolves against.
//
// The cap keeps a busy inbox from crowding out the instructions in the model's 8192-token
// window. It MUST stay a prefix of repliableEmails(): Shape Response resolves email number
// N against the uncapped list, so anything but `slice(0, N)` shifts the mapping and replies
// to the wrong person.
const PROMPT_LIMIT = 20;
const raw = repliableEmails().slice(0, PROMPT_LIMIT);

const emails = raw.map((e, n) => {
  const from = clean(e.From ?? e.from ?? e.headers?.from) || '(unknown sender)';
  const subject = clean(e.Subject ?? e.subject ?? e.headers?.subject) || '(no subject)';
  const preview = clean(e.snippet).slice(0, 140);
  return `${n + 1}. From: ${from}\n   Subject: ${subject}\n   Preview: ${preview}`;
});

const emailBlock = emails.length
  ? emails.join('\n')
  : 'No new emails in the last 24 hours.';

// The calendar: the user's planner entries and the Philippine holidays they sit among, from
// the backend's /calendar/upcoming. Pulled by node name because Pick Channels and Get Video
// Feed sit between it and here. The node is allowed to fail (the backend may be restarting),
// in which case there is simply nothing to say about the week.
const calendarRows = (() => {
  try {
    return $('Get Calendar').all().map((item) => item.json).filter((row) => row && row.title);
  } catch {
    return [];
  }
})();

const calendar = calendarRows
  .map((row) => {
    const when = row.startTime ? `${row.date} ${String(row.startTime).slice(0, 5)}` : `${row.date} (all day)`;
    const what = row.kind === 'HOLIDAY' ? `${row.title} — holiday` : row.title;
    return `- ${when}: ${what}${row.notes ? ` (${row.notes})` : ''}`;
  })
  .join('\n');

const calendarBlock = calendar || 'Nothing on the calendar for the next seven days.';

// The date grounds the agent's follow-up question: its Postgres chat memory holds the
// briefings it wrote on earlier days, and without a date it cannot tell which was "yesterday".
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

return [{ json: { briefing_input:
  `TODAY IS ${today}\n\nTODAY'S WEATHER (Quezon City)\n${weather}\n\nTHE WEEK AHEAD (calendar and Philippine holidays)\n${calendarBlock}\n\nRECENT EMAILS (${emails.length})\n${emailBlock}` } }];
