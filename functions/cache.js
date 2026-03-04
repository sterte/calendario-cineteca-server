const CacheEntry = require('./models/cacheEntry');
const TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

class ApiCache {
    constructor() {
        this.stats = { hits: 0, misses: 0, reloads: 0 };
    }

    async get(key) {
        const entry = await CacheEntry.findOne({ key });
        if (!entry) { this.stats.misses++; return null; }
        if (Date.now() > entry.expiresAt) {
            this.stats.reloads++;
            await CacheEntry.deleteOne({ key });
            return null;
        }
        this.stats.hits++;
        return entry.data;
    }

    async set(key, data) {
        const now = Date.now();
        await CacheEntry.findOneAndUpdate(
            { key },
            { key, data, fetchedAt: now, expiresAt: now + TTL },
            { upsert: true }
        );
    }

    async clear(prefix) {
        if (prefix) {
            const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await CacheEntry.deleteMany({ key: { $regex: '^' + escaped } });
        } else {
            await CacheEntry.deleteMany({});
        }
    }

    async getContent() {
        const now = Date.now();
        const entries = await CacheEntry.find({});
        const result = {};
        entries.forEach(e => {
            result[e.key] = { data: e.data, fetchedAt: new Date(e.fetchedAt).toISOString(), expiresIn: Math.round((e.expiresAt - now) / 1000) + 's' };
        });
        return result;
    }

    async getStats() {
        const entries = await CacheEntry.find({}, 'key');
        let imdb = 0, lbFilm = 0, lbMember = 0, lbWatchlist = 0;
        entries.forEach(e => {
            const k = e.key || '';
            if (k.startsWith('imdb:')) imdb++;
            else if (k.startsWith('lb:film:')) lbFilm++;
            else if (k.startsWith('lb:member:')) lbMember++;
            else if (k.startsWith('lb:watchlist:')) lbWatchlist++;
        });
        return { ...this.stats, entries: { total: entries.length, imdb, lbFilm, lbMember, lbWatchlist } };
    }
}

module.exports = new ApiCache();
