// ========================================
// DOPPELTGEMOPPELT - Website Scripts
// ========================================

const RSS_FEED_URL = 'https://anchor.fm/s/fe335b68/podcast/rss';
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
];
const EPISODES_TO_SHOW = 6;

// Base URLs for platforms
const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/4ZY12xj8WgAdOBHCcyFTaV';
const H2_RADIO_BASE = 'https://www.h2radio.de';

document.addEventListener('DOMContentLoaded', () => {
    // --- Load Episodes from RSS ---
    loadEpisodes();

    // --- Navigation Scroll Effect ---
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Toggle ---
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Modal ---
    initModal();

    // --- Stars click -> review modal ---
    const statStars = document.getElementById('statStars');
    if (statStars) {
        statStars.addEventListener('click', () => openReviewModal());
        statStars.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') openReviewModal();
        });
    }

    // --- Scroll Reveal Animation ---
    initScrollReveal();

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // --- Parallax blobs on mouse move ---
    const blobs = document.querySelectorAll('.blob');
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        blobs.forEach((blob, i) => {
            const speed = (i + 1) * 8;
            blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });
});

// --- Modal System ---
function initModal() {
    const modal = document.getElementById('listenModal');
    const closeBtn = document.getElementById('modalClose');

    closeBtn.addEventListener('click', () => closeModal());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(episodeTitle, episodeNum) {
    const modal = document.getElementById('listenModal');
    const titleEl = document.getElementById('modalTitle');
    const subtitleEl = document.querySelector('.modal-subtitle');
    const spotifyLink = document.getElementById('modalSpotify');
    const appleLink = document.getElementById('modalApple');
    const h2Link = document.getElementById('modalH2');
    const listenSection = document.getElementById('modalListenSection');
    const reviewSection = document.getElementById('modalReviewSection');

    // Set modal title
    titleEl.textContent = episodeTitle;
    subtitleEl.textContent = 'Wähle eine Plattform:';

    // Show listen options, hide review options
    listenSection.style.display = '';
    reviewSection.style.display = 'none';

    // Build links
    spotifyLink.href = SPOTIFY_SHOW_URL;
    appleLink.href = 'https://podcasts.apple.com/us/podcast/doppeltgemoppelt/id1807094864';
    h2Link.href = H2_RADIO_BASE + '/?s=doppelt+gemoppelt+';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.openReviewModal = function() {
    const modal = document.getElementById('listenModal');
    const titleEl = document.getElementById('modalTitle');
    const subtitleEl = document.querySelector('.modal-subtitle');
    const listenSection = document.getElementById('modalListenSection');
    const reviewSection = document.getElementById('modalReviewSection');

    titleEl.textContent = 'Bewertungen & Rezensionen';
    subtitleEl.textContent = 'W\u00e4hle eine Option:';

    // Hide listen options, show review options
    listenSection.style.display = 'none';
    reviewSection.style.display = '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('listenModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// --- Episode Loader ---
// Strategy: Load cached episodes.json first (instant), fallback to live RSS
async function loadEpisodes() {
    const grid = document.getElementById('episodesGrid');
    const countEl = document.getElementById('episodeCount');

    try {
        let episodeData = null;

        // Try 1: Load pre-built episodes.json (instant, no CORS needed)
        try {
            const jsonResponse = await fetch('/episodes.json');
            if (jsonResponse.ok) {
                const data = await jsonResponse.json();
                if (data.episodes && data.episodes.length > 0) {
                    episodeData = data.episodes;
                    const total = data.totalEpisodes || data.episodes.length;
                    if (countEl) countEl.textContent = (total - 1) + '+';
                    console.log(`Loaded ${data.episodes.length} episodes from cache (fetched: ${data.fetchedAt})`);
                }
            }
        } catch (e) {
            console.log('No cached episodes.json, falling back to live RSS...');
        }

        // Try 2: Fallback to live RSS via CORS proxy
        if (!episodeData) {
            episodeData = await fetchLiveRSS(countEl);
        }

        if (!episodeData || episodeData.length === 0) {
            throw new Error('Keine Episoden gefunden');
        }

        // Render episodes
        renderEpisodes(grid, episodeData);

    } catch (error) {
        console.error('Episode Load Error:', error);
        grid.innerHTML = `
            <div class="episodes-error">
                <p>Episoden konnten nicht geladen werden.</p>
                <a href="https://open.spotify.com/show/4ZY12xj8WgAdOBHCcyFTaV" target="_blank" class="btn btn-outline">
                    Direkt auf Spotify anh&ouml;ren
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
            </div>
        `;
    }
}

// Fetch live RSS as fallback
async function fetchLiveRSS(countEl) {
    let response;
    for (const proxy of CORS_PROXIES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            response = await fetch(proxy + encodeURIComponent(RSS_FEED_URL), {
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (response.ok) {
                const text = await response.text();
                if (text.includes('<item>')) {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(text, 'text/xml');
                    const items = xml.querySelectorAll('item');
                    const totalEpisodes = items.length;

                    if (countEl) countEl.textContent = (totalEpisodes - 1) + '+';

                    // Convert XML items to plain objects and sort
                    const episodes = Array.from(items).map(item => ({
                        title: item.querySelector('title')?.textContent || '',
                        pubDate: item.querySelector('pubDate')?.textContent || '',
                        description: item.querySelector('description')?.textContent || '',
                        link: item.querySelector('link')?.textContent || ''
                    })).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

                    console.log(`Loaded ${episodes.length} episodes from live RSS`);
                    return episodes;
                }
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

// Render episode cards from data array
function renderEpisodes(grid, episodes) {
    const total = episodes.length;
    const toShow = episodes.slice(0, EPISODES_TO_SHOW);
    grid.innerHTML = '';

    toShow.forEach((ep, index) => {
        const title = ep.title || 'Unbekannte Episode';
        const cleanDesc = stripHtml(ep.description || '');
        const shortDesc = cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + '...' : cleanDesc;
        const formattedDate = formatDate(ep.pubDate);
        const tag = detectTag(title, cleanDesc);
        const cleanTitle = title.replace(/\s*\d{2,3}$/, '');

        const numMatch = title.match(/(\d{2,3})$/);
        const displayNum = numMatch ? `#${numMatch[1]}` : `#${String(total - index).padStart(3, '0')}`;
        const numStr = numMatch ? numMatch[1] : String(total - index).padStart(3, '0');

        const card = document.createElement('article');
        card.className = 'episode-card reveal';
        card.style.transitionDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="episode-number">${displayNum}</div>
            <div class="episode-content">
                <div class="episode-meta">
                    <span class="episode-date">${formattedDate}</span>
                    ${tag ? `<span class="episode-tag ${tag.class}">${tag.label}</span>` : ''}
                </div>
                <h3 class="episode-title">${escapeHtml(cleanTitle)}</h3>
                <p class="episode-desc">${escapeHtml(shortDesc)}</p>
                <button class="episode-play" data-title="${escapeAttr(title)}" data-num="${numStr}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Anh&ouml;ren
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    // Attach click handlers
    grid.querySelectorAll('.episode-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(btn.dataset.title, btn.dataset.num);
        });
    });

    initScrollReveal();
    initEpisodeTilt();
}

// --- Helper Functions ---

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${String(date.getDate()).padStart(2, '0')}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Only these 5 categories exist - no new ones will be added
// Strategy: check TITLE first (stronger signal), then fall back to description
function detectTag(title, description) {
    const titleLower = title.toLowerCase();
    const descLower = (description || '').toLowerCase();

    const CATEGORIES = [
        {
            label: 'True Crime', class: 'tag-crime',
            titleKeys: [
                'truecrime', 'true crime', 'mord', 'kriminal', 'tatwort', 'verbrechen',
                'tatort', 'krimi', 'cold case', 'serienkiller', 'entf\u00fchr',
                'vermisst', 'mysterium', 'mystery', 'unaufgekl\u00e4rt', 'polizei',
                'gericht', 'justiz', 'zeugenschutz', 'schuldig', 'unschuldig',
                '\u00fcberfall', 'raub', 'betrug', 'stalking', 'sekte'
            ],
            descKeys: [
                'truecrime', 'true crime', 'kriminal', 'tatwort', 'ermittl',
                'verbrechen', 'polizei', 'gericht', 'verd\u00e4chtig', 'urteil',
                'serienkiller', 'cold case', 'forensi', 'tatort', 'zeug'
            ]
        },
        {
            label: 'Kultur', class: 'tag-culture',
            titleKeys: [
                'subkultur', 'kultur', 'gesellschaft', 'generation', 'tradition',
                'szene', 'musik', 'kunst', 'film', 'kino', 'theater', 'festival',
                'literatur', 'buch', 'trend', 'mode', 'vielfalt', 'diversit\u00e4t',
                'identit\u00e4t', 'sprache', 'dialekt', 'religion', 'feiertag',
                'brauch', 'pop', 'hiphop', 'punk', 'indie', 'retro', 'vintage',
                'streetwear', 'tattoo', 'graffiti', 'protest', 'aktivismus',
                'feminismus', 'gleichberechtigung', 'rassismus', 'vorurteil',
                'politik', 'wahl', 'demo', 'norm', 'tabu', 'kontrovers',
                'meinung', 'debatte', 'reality tv', 'trash tv', 'influencer'
            ],
            descKeys: [
                'subkultur', 'kultur', 'mainstream', 'bewegung', 'gesellschaft',
                'generation', 'vielfalt', 'diversit\u00e4t', 'tradition', 'szene',
                'aktivismus', 'protest', 'politik', 'trend'
            ]
        },
        {
            label: 'Digital', class: 'tag-digital',
            titleKeys: [
                'internet', 'digital', 'online', 'cyber', 'tech', 'app',
                'social media', 'instagram', 'tiktok', 'youtube', 'twitter',
                'smartphone', 'handy', 'gaming', 'gamer', 'ki', 'algorithmus',
                'hacker', 'datenschutz', 'fake news', 'deep fake', 'influencer',
                'streaming', 'netflix', 'podcast', 'bitcoin', 'krypto', 'nft',
                'roboter', 'virtual reality', 'metaverse', 'screen', 'bildschirm',
                'software', 'programmier', 'chatbot', 'chatgpt', 'k\u00fcnstliche intelligenz',
                'darknet', 'passwort', 'spam', 'phishing', 'viral'
            ],
            descKeys: [
                'internet', 'digital', 'cyber', 'grooming', 'social media', 'online',
                'algorithmus', 'datenschutz', 'hacker', 'fake news', 'app',
                'tiktok', 'instagram', 'gaming', 'k\u00fcnstliche intelligenz'
            ]
        },
        {
            label: 'Wissenschaft', class: 'tag-science',
            titleKeys: [
                'k\u00f6rper', 'gehirn', 'neuro', 'wissenschaft', 'ph\u00e4nomen', 'biolog',
                'medizin', 'psycholog', 'chemie', 'physik', 'experiment', 'forschung',
                'evolution', 'dna', 'gen', 'zelle', 'organ', 'krankheit', 'virus',
                'bakterie', 'impf', 'gesundheit', 'symptom', 'diagnose', 'therapie',
                'mental health', 'depression', 'angstst\u00f6rung', 'trauma', 'adhs',
                'autismus', 'schlaf', 'traum', 'ern\u00e4hrung', 'vitamin',
                'hormon', 'adrenalin', 'dopamin', 'serotonin', 'universum',
                'planet', 'weltall', 'klima', 'umwelt', 'natur', 'tier',
                'mathematik', 'statistik', 'studie', 'hypothese', 'labor',
                'anatomie', 'intelligenz', 'ged\u00e4chtnis', 'wahrnehmung',
                'sinne', 'schmerz', 'allergie', 'sucht', 'drogen'
            ],
            descKeys: [
                'k\u00f6rper', 'wissenschaft', 'forschung', 'studie', 'evolution',
                'gehirn', 'neuro', 'psycholog', 'biolog', 'medizin', 'experiment',
                'gesundheit', 'diagnose', 'mental health', 'ph\u00e4nomen'
            ]
        },
        {
            label: 'Lifestyle', class: 'tag-life',
            titleKeys: [
                'phobi', 'liebe', 'beziehung', 'weiblich', 'longevity', 'achtsamkeit',
                'minimalism', 'alltag', 'selbst', 'date', 'dating', 'stress',
                'erwachsen', 'entscheidung', 'freundschaft', 'familie', 'hochzeit',
                'trennung', 'singleleben', 'reise', 'travel', 'urlaub', 'fernweh',
                'kochen', 'rezept', 'essen', 'food', 'fitness', 'sport', 'yoga',
                'meditation', 'routine', 'morgenroutine', 'abendroutine', 'produktiv',
                'motivation', 'ziele', 'neujahrsvors\u00e4tze', 'gewohnheit', 'habit',
                'gl\u00fcck', 'zufriedenheit', 'dankbarkeit', 'journal', 'tagebuch',
                'wohnung', 'umzug', 'einrichtung', 'ordnung', 'aufr\u00e4umen',
                'nachhaltigkeit', 'vegan', 'vegetarisch', 'zero waste', 'secondhand',
                'geld', 'finanzen', 'sparen', 'investier', 'job', 'karriere',
                'bewerbung', 'studium', 'uni', 'ausbildung', 'beruf',
                'selbstliebe', 'selfcare', 'self care', 'grenzen setzen',
                'toxisch', 'red flag', 'green flag', 'attachment', 'bindung',
                'introvert', 'extrovert', 'pers\u00f6nlichkeit', 'sternzeichen',
                'manifestation', 'manifest', 'overthink', 'quarter life',
                'adulting', 'halbwahrheit', 'l\u00fcge', 'ehrlichkeit',
                'bucket list', 'challenge', 'sommer', 'winter', 'jahreszeit',
                'weihnacht', 'silvester', 'geburtstag', 'geschenk'
            ],
            descKeys: [
                'phobi', 'beziehung', 'weiblich', 'longevity', 'achtsamkeit',
                'entscheidung', 'freundschaft', 'selbstliebe', 'selfcare',
                'routine', 'motivation', 'nachhaltigkeit', 'finanzen',
                'dating', 'liebe', 'manifestation', 'overthink'
            ]
        }
    ];

    // Pass 1: Match on TITLE only (strongest signal)
    for (const cat of CATEGORIES) {
        if (cat.titleKeys.some(k => titleLower.includes(k))) {
            return { label: cat.label, class: cat.class };
        }
    }

    // Pass 2: Match on DESCRIPTION only (weaker signal, only use specific keywords)
    for (const cat of CATEGORIES) {
        if (cat.descKeys.some(k => descLower.includes(k))) {
            return { label: cat.label, class: cat.class };
        }
    }

    return null;
}

function initScrollReveal() {
    const revealElements = document.querySelectorAll(
        '.about-card, .episode-card, .host-card, .listen-card, .section-header'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
        if (!el.classList.contains('visible')) {
            observer.observe(el);
        }
    });
}

function initEpisodeTilt() {
    document.querySelectorAll('.episode-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translateX(4px) perspective(800px) rotateX(${-y * 3}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}
