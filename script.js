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

// 7 Kategorien mit Scoring-System
// Title-Match = 10 Punkte, Description-Match = 3 Punkte
// Hoechste Punktzahl gewinnt, bei Gleichstand entscheidet Reihenfolge
// Fallback "Lifestyle" wenn nichts matcht (sehr unwahrscheinlich)
function detectTag(title, description) {
    const titleLower = title.toLowerCase();
    const descLower = (description || '').toLowerCase();

    const CATEGORIES = [
        {
            label: 'True Crime', class: 'tag-crime',
            keys: [
                // Direkte Crime-Begriffe
                'truecrime', 'true crime', 'mord', 'kriminal', 'tatwort', 'verbrechen',
                'tatort', 'krimi', 'cold case', 'serienkiller', 'serienmord',
                'entf\u00fchr', 'vermisst', 'mysterium', 'mystery', 'unaufgekl\u00e4rt',
                // Justiz
                'polizei', 'gericht', 'justiz', 'zeugenschutz', 'schuldig', 'unschuldig',
                'urteil', 'verd\u00e4chtig', 'angeklagt', 'gefangen', 'gef\u00e4ngnis',
                'inhaft', 'verurteilt', 'freispruch', 'plaedoyer', 'staatsanwalt',
                'verteidiger', 'forensi', 'spurensicherung', 'dna-spur', 'fingerabdruck',
                'profile', 'zeuge', 'verbrecher', 't\u00e4ter', 'opfer',
                // Spezifische Verbrechen
                '\u00fcberfall', 'raub', 'betrug', 'stalking', 'erpress', 'entf\u00fchrung',
                'vergewaltig', 'gewalt', 'verschollen', 'leiche', 'tot aufgefunden',
                'amoklauf', 'attentat', 'anschlag', 'massaker', 'familientrag\u00f6die',
                'kindesmissbrauch', 'femizid', 'totschlag', 'h\u00e4usliche gewalt',
                'organisierte kriminalit\u00e4t', 'mafia', 'drogenkartell',
                // Investigative
                'ermittl', 'investigativ', 'aufkl\u00e4rung', 'fall ungel\u00f6st',
                'akte x', 'verschw\u00f6rung', 'cover up', 'vertuschung',
                // Bekannte Faelle
                'jack the ripper', 'ted bundy', 'zodiac', 'ng-fall'
            ]
        },
        {
            label: 'Psychologie', class: 'tag-psychology',
            keys: [
                // Mental Health
                'psycholog', 'mental health', 'mentale gesundheit', 'mindset',
                'depression', 'angstst\u00f6rung', 'angst', 'panikattack', 'panik',
                'trauma', 'ptbs', 'burnout', 'stress', 'erschoepf',
                'adhs', 'autismus', 'asperger', 'neurodivergen', 'hochsensibel',
                'borderline', 'narzissmus', 'narzisst', 'soziopath', 'psychopath',
                'phobi', 'zwangsst\u00f6rung', 'ocd', 'essst\u00f6rung', 'bipolar',
                'sucht', 'abh\u00e4ngigkeit', 'co-abh\u00e4ngig',
                // Psyche & Verhalten
                'verhalten', 'verhaltensmuster', 'gedanken', 'gef\u00fchle', 'emotion',
                'pers\u00f6nlichkeit', 'pers\u00f6nlichkeitstyp', 'pers\u00f6nlichkeitsst\u00f6rung',
                'selbstwert', 'selbstvertrauen', 'selbstliebe', 'selbstreflexion',
                'selbstsabotage', 'selbstzweifel', 'unbewusst', 'unterbewusst',
                'manipulation', 'gaslighting', 'love bombing', 'toxisch',
                'beziehungsmuster', 'attachment', 'bindungstyp', 'bindungsangst',
                'verlustangst', 'kindheitstrauma', 'innere kind', 'inneres kind',
                // Kognition
                'gehirn', 'neuro', 'nervensystem', 'gedaechtnis', 'ged\u00e4chtnis',
                'wahrnehmung', 'kognitive', 'kognition', 'intelligenz', 'iq', 'eq',
                'aufmerksamkeit', 'fokus', 'konzentration', 'achtsamkeit', 'mindful',
                'meditation', 'embodiment', 'k\u00f6rpergef\u00fchl',
                // Therapie
                'therapie', 'psychotherapie', 'verhaltenstherapie', 'systemische',
                'gespraech', 'coaching', 'hypnose', 'emdr',
                // Reaktion & Theorien
                'reaktanz', 'kognitive dissonanz', 'placebo', 'nocebo', 'effekt',
                'maslow', 'big five', 'mbti', 'enneagramm',
                // Beziehung & Soziales (psychologische Aspekte)
                'red flag', 'green flag', 'grenzen setzen', 'overthink', 'overthinking',
                'people pleas', 'ghosting', 'breadcrumbing', 'situationship',
                'introvert', 'extrovert', 'ambivert', 'empath', 'narzisst',
                // Hormonen
                'dopamin', 'serotonin', 'cortisol', 'oxytocin', 'adrenalin', 'endorphin'
            ]
        },
        {
            label: 'Wissenschaft', class: 'tag-science',
            keys: [
                // Natur-Wissenschaften
                'wissenschaft', 'forschung', 'studie', 'experiment', 'labor',
                'hypothese', 'theorie', 'erkenntnis', 'beweis', 'evidenz',
                'biolog', 'chemie', 'physik', 'mathematik', 'statistik',
                'astronom', 'astrophysik', 'quantenphysik', 'teilchen',
                'evolution', 'darwin', 'gen', 'genetik', 'dna', 'erbgut',
                'zelle', 'mikrobiom', 'bakterie', 'virus', 'pilze',
                // Medizin & Koerper
                'medizin', 'medizinisch', 'arzt', 'pharma', 'medikament', 'wirkstoff',
                'k\u00f6rper', 'koerper', 'organ', 'gehirn', 'herz', 'leber', 'niere',
                'krankheit', 'krebs', 'tumor', 'diabetes', 'alzheimer', 'parkinson',
                'symptom', 'diagnose', 'syndrom', 'epidemie', 'pandemie',
                'impf', 'antikörper', 'immunsystem', 'allergie', 'autoimmun',
                'hormon', 'stoffwechsel', 'vitamin', 'mineralstoff',
                'anatomie', 'physiologie', 'sinne', 'sehen', 'h\u00f6ren', 'schmerz',
                'phaenomen', 'ph\u00e4nomen', 'k\u00f6rperph\u00e4nomen',
                // Tiere & Pflanzen
                'tier', 'tierwelt', 'tierreich', 'pflanze', 'natur', 'biom',
                // Universum & Erde
                'universum', 'planet', 'erde', 'mond', 'sonne', 'weltall',
                'klima', 'klimawandel', 'umwelt', 'oekolog', 'wetter',
                'vulkan', 'erdbeben', 'meer', 'ozean', 'arktis',
                // Drogen & Stoffe
                'drogen', 'alkohol', 'koffein', 'nikotin', 'cannabis'
            ]
        },
        {
            label: 'Digital', class: 'tag-digital',
            keys: [
                // Tech & Internet
                'internet', 'digital', 'online', 'cyber', 'cybersecurity', 'tech',
                'technologie', 'smartphone', 'handy', 'computer', 'laptop',
                'app ', ' app', 'application', 'software', 'hardware', 'algorithmus',
                'algorithmen', 'data', 'daten', 'datenschutz', 'big data',
                // KI & Robotik
                ' ki ', 'ki?', 'k\u00fcnstliche intelligenz', 'chatgpt', 'chatbot',
                'machine learning', 'ai ', ' ai', 'roboter', 'automatisierung',
                'deep fake', 'deepfake', 'fake news',
                // Social Media
                'social media', 'instagram', 'tiktok', 'youtube', 'twitter', 'x ',
                'facebook', 'snapchat', 'whatsapp', 'telegram', 'reddit', 'twitch',
                'influencer', 'creator', 'follower', 'reichweite', 'viral',
                'hashtag', 'trend ', 'algorithmus', 'fyp', 'reel', 'shorts',
                // Gaming & Streaming
                'gaming', 'gamer', 'video game', 'esport', 'streaming', 'streamer',
                'netflix', 'amazon prime', 'disney plus',
                // Sicherheit & Crypto
                'hacker', 'hacking', 'phishing', 'spam', 'passwort', 'sicherheit',
                'darknet', 'dark web', 'tor browser',
                'bitcoin', 'krypto', 'kryptowährung', 'nft', 'blockchain',
                // Cybercrime
                'grooming', 'cybermobbing', 'cybergrooming', 'cyberstalking',
                'sexting', 'doxing', 'troll', 'shitstorm',
                // VR/AR
                'virtual reality', 'vr ', 'augmented reality', 'ar ', 'metaverse',
                'screen', 'bildschirm', 'screen time'
            ]
        },
        {
            label: 'Kultur', class: 'tag-culture',
            keys: [
                // Allgemein Gesellschaft
                'kultur', 'subkultur', 'gegenkultur', 'gesellschaft', 'gesellschaftlich',
                'generation', 'generation z', 'millennials', 'gen z', 'boomer',
                'tradition', 'brauchtum', 'sitte', 'norm', 'gesellschaftsnorm',
                'unspoken', 'small talk', 'etikette', 'h\u00f6flichkeit',
                'vielfalt', 'diversit\u00e4t', 'identit\u00e4t', 'integration',
                // Kunst & Medien
                'kunst', 'k\u00fcnstler', 'gemaelde', 'museum', 'galerie',
                'film', 'kino', 'serie', 'theater', 'oper', 'ballett',
                'literatur', 'buch', 'roman', 'dichter', 'autor',
                'musik', 'song', 'band', 'konzert', 'festival', 'album',
                'pop', 'hiphop', 'rap', 'punk', 'rock', 'klassik', 'jazz',
                'indie', 'metal', 'techno', 'k-pop',
                // Mode & Style
                'mode', 'fashion', 'trend', 'beauty', 'lippenstift', 'makeup',
                'kosmetik', 'parfum', 'parfuem', 'duft', 'styling',
                'streetwear', 'haute couture', 'designer', 'tattoo', 'piercing',
                'retro', 'vintage', 'aesthetic', 'vibe',
                // Sprache
                'sprache', 'dialekt', 'akzent', 'jugendsprache', 'umgangssprache',
                'wortschatz', 'grammatik', 'redensart', 'sprichwort',
                // Religion & Politik
                'religion', 'kirche', 'glaube', 'gott', 'spirituell', 'esoterik',
                'christentum', 'islam', 'judentum', 'buddhismus', 'hinduismus',
                'feiertag', 'weihnacht', 'ostern', 'ramadan',
                'politik', 'wahl', 'demokratie', 'demonstration', 'demo',
                'protest', 'aktivismus', 'feminismus', 'gleichberechtigung',
                'rassismus', 'sexismus', 'lgbtq', 'queer', 'pride',
                'vorurteil', 'tabu', 'kontrovers', 'meinung', 'debatte',
                // Reality / Pop Culture
                'reality tv', 'trash tv', 'gntm', 'sommerhaus', 'bachelor',
                'bachelorette', 'tv-show', 'show', 'casting',
                // Gegenkultur
                'szene', 'subkulturen', 'goth', 'emo', 'hippie', 'punk',
                'mainstream', 'bewegung', 'underground'
            ]
        },
        {
            label: 'Lifestyle', class: 'tag-life',
            keys: [
                // Beziehungen
                'liebe', 'beziehung', 'partner', 'freund', 'partnerin', 'freundin',
                'date ', 'dating', 'angeldate', 'kennenlern', 'flirt', 'verliebt',
                'hochzeit', 'heirat', 'verlobung', 'ehe', 'trennung', 'scheidung',
                'singleleben', 'single', 'beziehung', 'fernbeziehung',
                'freundschaft', 'beste freund', 'familie', 'eltern', 'kinder',
                'mutterschaft', 'vaterschaft', 'schwester', 'bruder', 'oma', 'opa',
                // Reise
                'reise', 'travel', 'urlaub', 'fernweh', 'roadtrip', 'backpack',
                'wandern', 'camping', 'all inclusive', 'au\u00dferhalb',
                // Essen & Trinken
                'kochen', 'rezept', 'essen', 'food', 'foodie', 'gourmet',
                'restaurant', 'caf\u00e9', 'cafe', 'kaffee', 'tee', 'wein',
                'vegan', 'vegetarisch', 'fleisch', 'sn\u00fcll', 'gem\u00fcsechip',
                'fr\u00fchst\u00fcck', 'mittag', 'abend', 'snack',
                // Sport & Fitness
                'fitness', 'sport', 'yoga', 'pilates', 'workout', 'training',
                'lauf', 'joggen', 'gym', 'crossfit', 'kraftsport',
                // Routinen & Selbstoptimierung
                'routine', 'morgenroutine', 'abendroutine', 'produktiv', 'produktivit\u00e4t',
                'motivation', 'ziele', 'goal', 'neujahrsvors\u00e4tze', 'vorsatz',
                'gewohnheit', 'habit', 'discipline', 'disziplin',
                'gl\u00fcck', 'happiness', 'zufriedenheit', 'dankbarkeit', 'gratitude',
                'journal', 'tagebuch', 'manifestation', 'manifest',
                // Wohnen
                'wohnung', 'umzug', 'einrichtung', 'interior', 'deko', 'haus',
                'ordnung', 'aufr\u00e4umen', 'minimalism', 'cleancore',
                'traumhaus', 'eigenheim',
                // Nachhaltigkeit
                'nachhaltigkeit', 'sustainable', 'zero waste', 'secondhand',
                'second hand', 'thrift', 'fair fashion',
                // Geld & Karriere
                'geld', 'finanzen', 'sparen', 'investier', 'aktien', 'etf',
                'job', 'karriere', 'beruf', 'bewerbung', 'studium', 'uni',
                'ausbildung', 'praktikum', 'work-life',
                // Selbstentwicklung
                'selbst', 'selfcare', 'self care', 'selbstliebe', 'selbstfindung',
                'erwachsen', 'adulting', 'quarter life', 'quarterlife',
                // Frauenleben
                'weiblich', 'feminin', 'periode', 'menstruation', 'schwanger',
                'mutterschaft', 'wechseljahre', 'pms',
                // Sonstiges Lifestyle
                'sternzeichen', 'horoskop', 'astrologie', 'tarot',
                'longevity', 'jung bleiben', 'anti aging',
                'halbwahrheit', 'l\u00fcge', 'ehrlichkeit',
                'sommer', 'winter', 'fr\u00fchling', 'herbst', 'jahreszeit',
                'silvester', 'geburtstag', 'geschenk', 'jubiläum',
                'alltag', 'feierabend', 'me time'
            ]
        },
        {
            label: 'Kurioses', class: 'tag-curious',
            keys: [
                // Sekten & Verschwoerung
                'sekte', 'sekten', 'kult', 'cult', 'verschw\u00f6rung',
                'verschw\u00f6rungstheorie', 'illuminati', 'reichsb\u00fcrger',
                'flat earth', 'flacherde',
                // Wettbewerbe & Skurriles
                'wettbewerb', 'wettkampf', 'meisterschaft', 'weltrekord',
                'guinness', 'kastanienkrieg', 'kastanien', 'wife carrying',
                'olympia', 'sonderling', 'skurril', 'verr\u00fcckt',
                'bizarr', 'merkwuerdig', 'merkw\u00fcrdig', 'absurd',
                // Phaenomene
                'mysteri\u00f6s', 'unerklaerlich', 'unerkl\u00e4rlich', 'geheimnisvoll',
                'paranormal', 'geist', 'spuk', 'haunted', 'gespenst',
                'ufo', 'au\u00dferirdisch', 'alien', 'extraterrestrisch',
                // Subkulturen / Randgruppen (kurios)
                'subkultur', 'randgruppe', 'au\u00dfenseiter', 'hobby',
                'sammler', 'sammelleidenschaft',
                // Geschichte & Kuriositaeten
                'historisch', 'geschichte', 'mittelalter', 'antike',
                'r\u00f6mer', 'ritter', 'pirat', 'wikinger', 'ausgestorben',
                'archaeolog', 'arch\u00e4olog', 'fossil', 'mumie', 'pyramide',
                // Mystik
                'magie', 'hexe', 'fluch', 'aberglaube', 'voodoo',
                'ritual', 'rituale',
                // Tiere kurios
                'kurios', 'kuriosit\u00e4t', 'unique', 'einzigartig',
                'bizarre fakten', 'fun fact', 'gewusst',
                // Lebensmittel kurios
                'gem\u00fcsechip', 'gemuesechip', 'kuriose', 'exotisch',
                // Listen
                'top 10', 'top ten', 'die schlimmsten', 'die seltsamsten',
                'die verr\u00fccktesten', 'world record',
                // Specific recurring topics
                'lola', 'haustier-stori', 'dog stuff'
            ]
        }
    ];

    // Scoring: Title-Match = 10 Punkte, Description-Match = 3 Punkte
    const scores = CATEGORIES.map(cat => {
        let score = 0;
        for (const k of cat.keys) {
            if (titleLower.includes(k)) score += 10;
            if (descLower.includes(k)) score += 3;
        }
        return { cat, score };
    });

    // Hoechste Punktzahl finden
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];

    if (winner.score > 0) {
        return { label: winner.cat.label, class: winner.cat.class };
    }

    // Fallback: Lifestyle (sehr unwahrscheinlich, da fast alles matcht)
    return { label: 'Lifestyle', class: 'tag-life' };
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
