const admin = require('firebase-admin');
const COLLECTION = 'apiCache';
const TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

class ApiCache {
    constructor() {
        this.stats = { hits: 0, misses: 0, reloads: 0 };
    }

    _col() { return admin.firestore().collection(COLLECTION); }
    _doc(key) { return this._col().doc(key.replace(/\//g, '|')); }

    async get(key) {
        const snap = await this._doc(key).get();
        if (!snap.exists) { this.stats.misses++; return null; }
        const { data, expiresAt } = snap.data();
        if (Date.now() > expiresAt) {
            this.stats.reloads++;
            await this._doc(key).delete();
            return null;
        }
        this.stats.hits++;
        return data;
    }

    async set(key, data) {
        const now = Date.now();
        await this._doc(key).set({ key, data, fetchedAt: now, expiresAt: now + TTL });
    }

    async clear(prefix) {
        const query = prefix
            ? this._col().where('key', '>=', prefix).where('key', '<', prefix + '\uffff')
            : this._col();
        const snap = await query.get();
        const batch = admin.firestore().batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    async getContent() {
        const now = Date.now();
        const snap = await this._col().get();
        const result = {};
        snap.docs.forEach(doc => {
            const { key, data, fetchedAt, expiresAt } = doc.data();
            result[key] = { data, fetchedAt: new Date(fetchedAt).toISOString(), expiresIn: Math.round((expiresAt - now) / 1000) + 's' };
        });
        return result;
    }

    async getStats() {
        const snap = await this._col().get();
        let imdb = 0, lbFilm = 0, lbMember = 0, lbWatchlist = 0;
        snap.docs.forEach(doc => {
            const k = doc.data().key || '';
            if (k.startsWith('imdb:')) imdb++;
            else if (k.startsWith('lb:film:')) lbFilm++;
            else if (k.startsWith('lb:member:')) lbMember++;
            else if (k.startsWith('lb:watchlist:')) lbWatchlist++;
        });
        return { ...this.stats, entries: { total: snap.size, imdb, lbFilm, lbMember, lbWatchlist } };
    }
}

module.exports = new ApiCache();
