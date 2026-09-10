/** The homepage's static reading material: a snackbar of technology reads, the Philippine
 * newsstand, and Wikipedia facts.
 *
 * All three are hand-curated constants rather than a feed. Nothing here is fetched, so the
 * sections render instantly and — unlike the briefing — never wait on the n8n workflow or the
 * backend. Every URL is a stable landing page (a canonical article, a project's docs home, an
 * outlet's section front) rather than a dated permalink, so the list does not rot between
 * edits. Add to these lists freely; keep the links stable ones.
 */

/* -------------------------------------------------------------------------- */
/* Tech snackbar                                                               */
/* -------------------------------------------------------------------------- */

export type TechRead = {
    /** Short topic label, shown as the chip's kicker. */
    topic: string;
    title: string;
    /** Who published it — the reason to trust the tab you are about to open. */
    source: string;
    /** One line on why it is worth the time. */
    why: string;
    url: string;
};

/** Deliberately mixed: what is new (agents, MCP, vector search) next to the practices that
 * make it survivable in production (twelve-factor, SRE, trunk-based, DORA). */
export const TECH_READS: TechRead[] = [
    {
        topic: "AI agents",
        title: "Building effective agents",
        source: "Anthropic",
        why: "Why most agent problems are solved by simpler composition, not a bigger graph.",
        url: "https://www.anthropic.com/engineering/building-effective-agents",
    },
    {
        topic: "AI tooling",
        title: "Model Context Protocol",
        source: "modelcontextprotocol.io",
        why: "The open protocol for handing a model your tools and data over one interface.",
        url: "https://modelcontextprotocol.io",
    },
    {
        topic: "Retrieval",
        title: "Retrieval-Augmented Generation",
        source: "arXiv 2005.11401",
        why: "The paper this app is an implementation of — worth reading once, properly.",
        url: "https://arxiv.org/abs/2005.11401",
    },
    {
        topic: "Retrieval",
        title: "pgvector: embeddings inside Postgres",
        source: "GitHub",
        why: "Vector search without a second database, next to the rows it belongs to.",
        url: "https://github.com/pgvector/pgvector",
    },
    {
        topic: "Search",
        title: "Full-text search in PostgreSQL",
        source: "PostgreSQL docs",
        why: "tsvector, ts_rank_cd and ts_headline — the machinery behind this project's Search tab.",
        url: "https://www.postgresql.org/docs/current/textsearch.html",
    },
    {
        topic: "Foundations",
        title: "Attention Is All You Need",
        source: "arXiv 1706.03762",
        why: "Eight pages that every model you use today is a descendant of.",
        url: "https://arxiv.org/abs/1706.03762",
    },
    {
        topic: "Foundations",
        title: "The Bitter Lesson",
        source: "Rich Sutton",
        why: "A one-page argument about scale that keeps turning out to be right.",
        url: "http://www.incompleteideas.net/IncIdeas/BitterLesson.html",
    },
    {
        topic: "Microservices",
        title: "Microservices",
        source: "Martin Fowler",
        why: "The definition everyone cites and fewer people have actually read.",
        url: "https://martinfowler.com/articles/microservices.html",
    },
    {
        topic: "Microservices",
        title: "Monolith First",
        source: "Martin Fowler",
        why: "The counterweight: split a system you already understand, not one you are guessing at.",
        url: "https://martinfowler.com/bliki/MonolithFirst.html",
    },
    {
        topic: "Distributed systems",
        title: "Patterns of Distributed Systems",
        source: "Martin Fowler",
        why: "Write-ahead logs, leases, quorums — the parts every distributed system rebuilds.",
        url: "https://martinfowler.com/articles/patterns-of-distributed-systems/",
    },
    {
        topic: "Event-driven",
        title: "Turning the database inside out",
        source: "Martin Kleppmann",
        why: "The log-as-source-of-truth idea that event sourcing and CDC both grew out of.",
        url: "https://www.confluent.io/blog/turning-the-database-inside-out-with-apache-samza/",
    },
    {
        topic: "Practice",
        title: "The Twelve-Factor App",
        source: "12factor.net",
        why: "Old, short, and still the fastest way to explain why config belongs in the environment.",
        url: "https://12factor.net",
    },
    {
        topic: "Reliability",
        title: "Site Reliability Engineering",
        source: "Google",
        why: "Error budgets and SLOs: how to argue about reliability with numbers instead of vibes.",
        url: "https://sre.google/sre-book/table-of-contents/",
    },
    {
        topic: "Delivery",
        title: "DORA: the four keys",
        source: "dora.dev",
        why: "Lead time, deploy frequency, change failure rate, restore time — measure these four.",
        url: "https://dora.dev/",
    },
    {
        topic: "Delivery",
        title: "Trunk-based development",
        source: "trunkbaseddevelopment.com",
        why: "The branching model continuous delivery actually depends on.",
        url: "https://trunkbaseddevelopment.com/",
    },
    {
        topic: "Observability",
        title: "What is OpenTelemetry?",
        source: "OpenTelemetry",
        why: "One vendor-neutral way to emit traces, metrics and logs from every service you own.",
        url: "https://opentelemetry.io/docs/what-is-opentelemetry/",
    },
    {
        topic: "Testing",
        title: "Testcontainers",
        source: "testcontainers.com",
        why: "Integration tests against a real, disposable database — how this repo tests search.",
        url: "https://testcontainers.com/",
    },
    {
        topic: "Spring",
        title: "Spring AI reference",
        source: "Spring",
        why: "Chat models, embeddings and vector stores with the Spring idioms the backend already uses.",
        url: "https://docs.spring.io/spring-ai/reference/",
    },
];

/** The card's background image: the publisher's own mark, pulled from the link's domain.
 *
 * Topic photography was the first choice and did not survive contact with reality — Wikipedia
 * has no lead image for `Microservices`, `Observability`, `Continuous delivery` or most of the
 * rest, and stock photos of shipping containers would fight the rest of the page. A publisher's
 * mark is the one image that always exists for a link, and for these topics it is usually the
 * recognisable thing anyway: the Postgres elephant, the Spring leaf, the arXiv logo. */
export function readLogo(url: string): string {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=256`;
}

/** One tint per topic, so the strip reads as grouped even while it is moving. Anything not
 * listed falls back to the neutral card. */
const TOPIC_TINTS: Record<string, string> = {
    "AI agents": "bg-violet-50",
    "AI tooling": "bg-fuchsia-50",
    Retrieval: "bg-sky-50",
    Search: "bg-cyan-50",
    Foundations: "bg-indigo-50",
    Microservices: "bg-emerald-50",
    "Distributed systems": "bg-teal-50",
    "Event-driven": "bg-lime-50",
    Practice: "bg-amber-50",
    Reliability: "bg-orange-50",
    Delivery: "bg-rose-50",
    Observability: "bg-blue-50",
    Testing: "bg-stone-100",
    Spring: "bg-green-50",
};

export function topicTint(topic: string): string {
    return TOPIC_TINTS[topic] ?? "bg-stone-50";
}

/* -------------------------------------------------------------------------- */
/* Philippine newsstand                                                        */
/* -------------------------------------------------------------------------- */

export type NewsOutlet = {
    name: string;
    /** Bare hostname — also the key for the thumbnail lookup. */
    domain: string;
    url: string;
    /** What kind of newsroom it is, so the row is a choice and not just eight logos. */
    kind: string;
    /** Monogram shown while the thumbnail loads, and if it never does. */
    monogram: string;
    /** Tailwind classes for that fallback tile, roughly in the outlet's own colours. */
    tint: string;
};

export const PH_OUTLETS: NewsOutlet[] = [
    {
        name: "Philippine Daily Inquirer",
        domain: "inquirer.net",
        url: "https://newsinfo.inquirer.net/",
        kind: "Broadsheet · national",
        monogram: "PDI",
        tint: "bg-sky-100 text-sky-900",
    },
    {
        name: "Rappler",
        domain: "rappler.com",
        url: "https://www.rappler.com/philippines/",
        kind: "Digital-native · investigations",
        monogram: "R",
        tint: "bg-orange-100 text-orange-900",
    },
    {
        name: "GMA News Online",
        domain: "gmanetwork.com",
        url: "https://www.gmanetwork.com/news/",
        kind: "Network newsroom · breaking",
        monogram: "GMA",
        tint: "bg-emerald-100 text-emerald-900",
    },
    {
        name: "ABS-CBN News",
        domain: "abs-cbn.com",
        url: "https://www.abs-cbn.com/news",
        kind: "Network newsroom · national",
        monogram: "ABS",
        tint: "bg-indigo-100 text-indigo-900",
    },
    {
        name: "The Philippine Star",
        domain: "philstar.com",
        url: "https://www.philstar.com/headlines",
        kind: "Broadsheet · headlines",
        monogram: "PS",
        tint: "bg-rose-100 text-rose-900",
    },
    {
        name: "Manila Bulletin",
        domain: "mb.com.ph",
        url: "https://mb.com.ph/category/news",
        kind: "Broadsheet · oldest daily",
        monogram: "MB",
        tint: "bg-amber-100 text-amber-900",
    },
    {
        name: "BusinessWorld",
        domain: "bworldonline.com",
        url: "https://www.bworldonline.com/",
        kind: "Business daily · markets",
        monogram: "BW",
        tint: "bg-teal-100 text-teal-900",
    },
    {
        name: "Philippine News Agency",
        domain: "pna.gov.ph",
        url: "https://www.pna.gov.ph/",
        kind: "State wire · agencies",
        monogram: "PNA",
        tint: "bg-stone-200 text-stone-800",
    },
];

/** Favicon-as-thumbnail. Google's service is used rather than each outlet's own
 * `/favicon.ico` because those are inconsistently sized and several 404; when this one fails
 * anyway, the monogram tile underneath is what shows. */
export function outletThumbnail(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/* -------------------------------------------------------------------------- */
/* Wikipedia facts                                                             */
/* -------------------------------------------------------------------------- */

export type WikiFact = {
    fact: string;
    /** The article the claim comes from — the link is the citation. */
    article: string;
    url: string;
};

export const WIKI_FACTS: WikiFact[] = [
    {
        fact: "The Philippines has 7,641 islands. The count rose from 7,107 in 2016, when a coastal survey found 534 more.",
        article: "List of islands of the Philippines",
        url: "https://en.wikipedia.org/wiki/List_of_islands_of_the_Philippines",
    },
    {
        fact: "Taal Volcano holds a lake, on an island, in a lake, on an island — one of the few places on Earth nested that deeply.",
        article: "Taal Volcano",
        url: "https://en.wikipedia.org/wiki/Taal_Volcano",
    },
    {
        fact: "The Philippine eagle is among the largest eagles alive, and it hunts by moving through the forest canopy rather than soaring above it.",
        article: "Philippine eagle",
        url: "https://en.wikipedia.org/wiki/Philippine_eagle",
    },
    {
        fact: "The jeepney descends from surplus US military jeeps left behind after the Second World War, stretched and decorated into public transport.",
        article: "Jeepney",
        url: "https://en.wikipedia.org/wiki/Jeepney",
    },
    {
        fact: "Ada Lovelace's 1843 notes on the Analytical Engine include an algorithm for Bernoulli numbers, widely called the first published computer program.",
        article: "Ada Lovelace",
        url: "https://en.wikipedia.org/wiki/Ada_Lovelace",
    },
    {
        fact: "Grace Hopper's team taped a moth into a logbook in 1947 as the first actual case of a bug being found. The word already existed; the moth made it famous.",
        article: "Grace Hopper",
        url: "https://en.wikipedia.org/wiki/Grace_Hopper",
    },
    {
        fact: "The Shannon number puts the possible chess games at around 10^120 — far more than there are atoms in the observable universe.",
        article: "Shannon number",
        url: "https://en.wikipedia.org/wiki/Shannon_number",
    },
    {
        fact: "A day on Venus is longer than its year: it turns once every 243 Earth days and orbits the Sun in 225.",
        article: "Venus",
        url: "https://en.wikipedia.org/wiki/Venus",
    },
    {
        fact: "Sharks predate trees. They have been around roughly 400 million years; the first trees appeared some 50 million years later.",
        article: "Shark",
        url: "https://en.wikipedia.org/wiki/Shark",
    },
    {
        fact: "Octopuses have three hearts and copper-based blue blood, and two of those hearts stop beating while the animal swims.",
        article: "Octopus",
        url: "https://en.wikipedia.org/wiki/Octopus",
    },
    {
        fact: "Tardigrades have survived direct exposure to the vacuum and radiation of open space.",
        article: "Tardigrade",
        url: "https://en.wikipedia.org/wiki/Tardigrade",
    },
    {
        fact: "Botanically a banana is a berry and a strawberry is not — a strawberry's seeds are each a separate fruit.",
        article: "Berry (botany)",
        url: "https://en.wikipedia.org/wiki/Berry_(botany)",
    },
    {
        fact: "Wombats produce cube-shaped droppings, shaped by varying elasticity along the intestinal wall.",
        article: "Wombat",
        url: "https://en.wikipedia.org/wiki/Wombat",
    },
    {
        fact: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid of Giza.",
        article: "Cleopatra",
        url: "https://en.wikipedia.org/wiki/Cleopatra",
    },
    {
        fact: "Teaching at Oxford began by 1096, which makes the university older than the Aztec Empire, founded in 1428.",
        article: "University of Oxford",
        url: "https://en.wikipedia.org/wiki/University_of_Oxford",
    },
    {
        fact: "Honey does not spoil. Edible honey has been recovered from tombs thousands of years old.",
        article: "Honey",
        url: "https://en.wikipedia.org/wiki/Honey",
    },
    {
        fact: "The Puerto Princesa Subterranean River runs for more than eight kilometres under a mountain in Palawan, straight out into the sea.",
        article: "Puerto Princesa Subterranean River National Park",
        url: "https://en.wikipedia.org/wiki/Puerto_Princesa_Subterranean_River_National_Park",
    },
    {
        fact: "QWERTY was laid out for 1870s typewriter mechanics rather than for typists, and every keyboard since has inherited it.",
        article: "QWERTY",
        url: "https://en.wikipedia.org/wiki/QWERTY",
    },
];
