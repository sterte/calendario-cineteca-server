const TTL = 24 * 60 * 60 * 1000; // 24 hours

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
