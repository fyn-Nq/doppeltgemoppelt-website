// ========================================
// Build Script - Fetches RSS and creates episodes.json
// Runs at build time on Cloudflare Pages (every push + deploy hook,
// triggered by cron-job.org Mo+Di 9:30)
//
// Ausfallsicher: RSS wird mehrfach versucht. Klappt es nicht, bleibt die
// zuletzt veroeffentlichte episodes.json der Live-Seite erhalten, statt
// eine leere Liste auszuliefern. Der Build bricht nie ab (Exit-Code 0).
// ========================================

const fs = require('fs');

// URLs per Umgebungsvariable ueberschreibbar (nur fuer lokale Tests)
const RSS_FEED_URL = process.env.RSS_FEED_URL || 'https://anchor.fm/s/fe335b68/podcast/rss';
const LIVE_EPISODES_URL = process.env.LIVE_EPISODES_URL || 'https://doppeltgemoppelt-podcast.de/episodes.json';

const FETCH_TIMEOUT_MS = 15000;
const RSS_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

async function fetchText(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

function parseRSS(text) {
    // Parse XML manually (no dependencies needed)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
        const itemXml = match[1];
        const title = extractTag(itemXml, 'title');
        const pubDate = extractTag(itemXml, 'pubDate');
        const description = extractTag(itemXml, 'description');
        const link = extractTag(itemXml, 'link');

        items.push({ title, pubDate, description, link });
    }

    // Sort by date (newest first)
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Also extract podcast cover image
    const imageMatch = text.match(/<itunes:image\s+href="([^"]+)"/);
    const coverImage = imageMatch ? imageMatch[1] : null;

    return {
        totalEpisodes: items.length,
        coverImage,
        fetchedAt: new Date().toISOString(),
        episodes: items
    };
}

function extractTag(xml, tag) {
    // Handle CDATA sections
    const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    // Handle regular tags
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

async function fetchEpisodesFromRSS() {
    for (let attempt = 1; attempt <= RSS_ATTEMPTS; attempt++) {
        try {
            console.log(`Fetching RSS feed (attempt ${attempt}/${RSS_ATTEMPTS})...`);
            const data = parseRSS(await fetchText(RSS_FEED_URL));
            // Leerer/kaputter Feed (z.B. Fehlerseite mit Status 200) zaehlt als Fehlschlag
            if (data.totalEpisodes === 0) throw new Error('feed contains no episodes');
            return data;
        } catch (err) {
            console.error(`RSS attempt ${attempt} failed: ${err.message}`);
            if (attempt < RSS_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
    }
    return null;
}

async function fetchLastPublishedEpisodes() {
    // Waehrend des Builds ist noch das vorherige Deployment live
    try {
        console.log('Loading last published episodes.json from live site...');
        const data = JSON.parse(await fetchText(LIVE_EPISODES_URL));
        if (data && data.totalEpisodes > 0 && Array.isArray(data.episodes)) return data;
        console.error('Live episodes.json is empty or invalid.');
    } catch (err) {
        console.error(`Could not load live episodes.json: ${err.message}`);
    }
    return null;
}

function writeEpisodes(data) {
    fs.writeFileSync('episodes.json', JSON.stringify(data, null, 2));
}

async function build() {
    const fresh = await fetchEpisodesFromRSS();
    if (fresh) {
        writeEpisodes(fresh);
        console.log(`episodes.json written from RSS: ${fresh.totalEpisodes} episodes, cover image ${fresh.coverImage ? 'found' : 'not found'}.`);
        return;
    }

    const lastPublished = await fetchLastPublishedEpisodes();
    if (lastPublished) {
        writeEpisodes(lastPublished);
        console.warn(`RSS unavailable - kept last published episodes.json (${lastPublished.totalEpisodes} episodes, fetched ${lastPublished.fetchedAt}).`);
        return;
    }

    // Letzter Ausweg: leere Liste, damit der Build trotzdem durchlaeuft
    if (!fs.existsSync('episodes.json')) {
        writeEpisodes({ totalEpisodes: 0, episodes: [], fetchedAt: null });
    }
    console.error('RSS and live episodes.json unavailable - wrote empty fallback.');
}

build().catch(err => {
    console.error('Build error:', err.message);
    if (!fs.existsSync('episodes.json')) {
        writeEpisodes({ totalEpisodes: 0, episodes: [], fetchedAt: null });
    }
});
