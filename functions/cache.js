const TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

class ApiCache {
    constructor() {
        this._store = new Map();
        this.stats = { hits: 0, misses: 0, reloads: 0 };
    }

    get(key) {
        if (!this._store.has(key)) {
            this.stats.misses++;
            return null;
        }
        const { data, fetchedAt } = this._store.get(key);
        if (Date.now() - fetchedAt > TTL) {
            this.stats.reloads++;
            return null; // expired — caller will re-fetch and set()
        }
        this.stats.hits++;
        return data;
    }

    set(key, data) {
        this._store.set(key, { data, fetchedAt: Date.now() });
    }

    clear(prefix) {
        if (prefix) {
            for (const k of this._store.keys()) {
                if (k.startsWith(prefix)) this._store.delete(k);
            }
        } else {
            this._store.clear();
        }
    }

    getContent() {
        const now = Date.now();
        const result = {};
        for (const [k, { data, fetchedAt }] of this._store.entries()) {
            result[k] = { data, fetchedAt: new Date(fetchedAt).toISOString(), expiresIn: Math.round((TTL - (now - fetchedAt)) / 1000) + 's' };
        }
        return result;
    }

    getStats() {
        let imdb = 0, lbFilm = 0, lbMember = 0, lbWatchlist = 0;
        for (const k of this._store.keys()) {
            if (k.startsWith('imdb:')) imdb++;
            else if (k.startsWith('lb:film:')) lbFilm++;
            else if (k.startsWith('lb:member:')) lbMember++;
            else if (k.startsWith('lb:watchlist:')) lbWatchlist++;
        }
        return {
            ...this.stats,
            entries: { total: this._store.size, imdb, lbFilm, lbMember, lbWatchlist }
        };
    }
}

module.exports = new ApiCache();
