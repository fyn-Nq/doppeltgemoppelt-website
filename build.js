// ========================================
// Build Script - Fetches RSS and creates episodes.json
// Runs at build time on Netlify (Mo+Di 9:30)
// ========================================

const RSS_FEED_URL = 'https://anchor.fm/s/fe335b68/podcast/rss';

async function fetchRSS() {
    console.log('Fetching RSS feed...');

    const response = await fetch(RSS_FEED_URL);
    if (!response.ok) throw new Error(`Feed error: ${response.status}`);

    const text = await response.text();
    console.log('RSS feed fetched successfully.');

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

    console.log(`Parsed ${items.length} episodes.`);

    // Also extract podcast cover image
    const imageMatch = text.match(/<itunes:image\s+href="([^"]+)"/);
    const coverImage = imageMatch ? imageMatch[1] : null;

    const data = {
        totalEpisodes: items.length,
        coverImage,
        fetchedAt: new Date().toISOString(),
        episodes: items
    };

    // Write to episodes.json
    const fs = require('fs');
    fs.writeFileSync('episodes.json', JSON.stringify(data, null, 2));
    console.log('episodes.json written successfully.');
    console.log(`Total episodes: ${items.length}`);
    console.log(`Cover image: ${coverImage ? 'found' : 'not found'}`);
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

fetchRSS().catch(err => {
    console.error('Build error:', err.message);
    // Don't fail the build - frontend will fallback to live RSS
    const fs = require('fs');
    if (!fs.existsSync('episodes.json')) {
        fs.writeFileSync('episodes.json', JSON.stringify({ totalEpisodes: 0, episodes: [], fetchedAt: null }));
    }
});
