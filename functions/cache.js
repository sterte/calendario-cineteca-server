const CacheEntry = require('./models/cacheEntry');
const DailyStat  = require('./models/dailyStat');
const TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

const today = () => new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

const incStat = (field) => {
    DailyStat.updateOne(
        { date: today() },
        { $inc: { [field]: 1 } },
        { upsert: true }
    ).catch(err => console.error('DailyStat update error:', err.message));
};

class ApiCache {
    async get(key) {
        const entry = await CacheEntry.findOne({ key });
        if (!entry) { incStat('misses'); return null; }
        if (Date.now() > entry.expiresAt) {
            incStat('reloads');
            await CacheEntry.deleteOne({ key });
            return null;
        }
        incStat('hits');
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
        const [entries, history] = await Promise.all([
            CacheEntry.find({}, 'key'),
            DailyStat.find({}).sort({ date: -1 }).limit(30).lean(),
        ]);

        let imdb = 0, lbFilm = 0, lbMember = 0, lbWatchlist = 0;
        entries.forEach(e => {
            const k = e.key || '';
            if (k.startsWith('imdb:'))         imdb++;
            else if (k.startsWith('lb:film:'))      lbFilm++;
            else if (k.startsWith('lb:member:'))    lbMember++;
            else if (k.startsWith('lb:watchlist:')) lbWatchlist++;
        });

        return {
            entries: { total: entries.length, imdb, lbFilm, lbMember, lbWatchlist },
            history: history.map(d => ({
                date:    d.date,
                hits:    d.hits,
                misses:  d.misses,
                reloads: d.reloads,
            })),
        };
    }
}

module.exports = new ApiCache();
