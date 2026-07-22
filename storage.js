/* ═══════════════════════════════════════════════════════════════════
   STORAGE.JS — IndexedDB + localStorage persistence layer
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const Storage = (() => {

  const DB_NAME    = 'FlashCardAppDB';
  const DB_VERSION = 1;
  const STORES     = { decks: 'decks', cards: 'cards', sessions: 'sessions', settings: 'settings' };

  let db = null;

  /* ── INIT ──────────────────────────────────────────────────────── */
  function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('decks')) {
          const deckStore = db.createObjectStore('decks', { keyPath: 'id' });
          deckStore.createIndex('name', 'name', { unique: false });
          deckStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('deckId',  'deckId',  { unique: false });
          cardStore.createIndex('dueDate', 'dueDate', { unique: false });
          cardStore.createIndex('state',   'state',   { unique: false });
          cardStore.createIndex('tags',    'tags',    { unique: false, multiEntry: true });
        }

        if (!db.objectStoreNames.contains('sessions')) {
          const sessStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessStore.createIndex('deckId', 'deckId', { unique: false });
          sessStore.createIndex('date',   'date',   { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  /* ── GENERIC IDB HELPERS ───────────────────────────────────────── */
  function tx(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function idbGet(store, key) {
    return new Promise((res, rej) => {
      const req = tx(store).get(key);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  function idbGetAll(store, index, query) {
    return new Promise((res, rej) => {
      const s   = tx(store);
      const req = index ? s.index(index).getAll(query) : s.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  function idbPut(store, value) {
    return new Promise((res, rej) => {
      const req = tx(store, 'readwrite').put(value);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  }

  function idbDelete(store, key) {
    return new Promise((res, rej) => {
      const req = tx(store, 'readwrite').delete(key);
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  function idbClear(store) {
    return new Promise((res, rej) => {
      const req = tx(store, 'readwrite').clear();
      req.onsuccess = () => res();
      req.onerror   = () => rej(req.error);
    });
  }

  /* ── ID GENERATOR ──────────────────────────────────────────────── */
  function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /* ── DECKS ─────────────────────────────────────────────────────── */
  const Decks = {
    getAll:   ()      => idbGetAll('decks'),
    get:      id      => idbGet('decks', id),
    save:     deck    => idbPut('decks', deck),
    delete:   id      => idbDelete('decks', id),

    create(data) {
      const deck = {
        id:          uid(),
        name:        data.name     || 'New Deck',
        description: data.desc     || '',
        color:       data.color    || '#00ff88',
        icon:        data.icon     || '📚',
        tags:        data.tags     || [],
        parentId:    data.parentId || null,   // null = root deck
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
        studyOrder:  data.studyOrder  || 'due-first',
        dailyNew:    data.dailyNew    || 20,
        dailyReview: data.dailyReview || 100,
        pinned:      false,
      };
      return idbPut('decks', deck).then(() => deck);
    },

    update(id, changes) {
      return Decks.get(id).then(deck => {
        if (!deck) throw new Error('Deck not found');
        const updated = { ...deck, ...changes, updatedAt: Date.now() };
        return idbPut('decks', updated).then(() => updated);
      });
    },

    async getChildren(parentId) {
      const all = await Decks.getAll();
      return all.filter(d => d.parentId === parentId);
    },

    async getRoots() {
      const all = await Decks.getAll();
      return all.filter(d => !d.parentId);
    },

    // Returns flat list of a deck + all its descendants
    async getFamily(deckId) {
      const all      = await Decks.getAll();
      const result   = [];
      const queue    = [deckId];
      while (queue.length) {
        const id = queue.shift();
        const d  = all.find(x => x.id === id);
        if (d) {
          result.push(d);
          all.filter(x => x.parentId === id).forEach(child => queue.push(child.id));
        }
      }
      return result;
    },

    async deleteWithCards(id) {
      // Delete deck + all subdecks recursively
      const family = await Decks.getFamily(id);
      for (const d of family) {
        const cards = await Cards.getByDeck(d.id);
        await Promise.all(cards.map(c => Cards.delete(c.id)));
        await Decks.delete(d.id);
      }
    },
  };

  /* ── CARDS ─────────────────────────────────────────────────────── */
  const Cards = {
    get:       id     => idbGet('cards', id),
    getAll:    ()     => idbGetAll('cards'),
    getByDeck: deckId => idbGetAll('cards', 'deckId', deckId),
    save:      card   => idbPut('cards', card),
    delete:    id     => idbDelete('cards', id),

    create(data) {
      const card = {
        id:        uid(),
        deckId:    data.deckId,
        type:      data.type    || 'basic',   // basic | reversed | cloze
        front:     data.front   || '',
        back:      data.back    || '',
        cloze:     data.cloze   || '',
        tags:      data.tags    || [],
        media:     data.media   || [],
        notes:     data.notes   || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        flagged:   false,
        suspended: false,
        // SRS fields
        ...SRS.newCardData(),
      };
      return idbPut('cards', card).then(() => card);
    },

    update(id, changes) {
      return Cards.get(id).then(card => {
        if (!card) throw new Error('Card not found');
        const updated = { ...card, ...changes, updatedAt: Date.now() };
        return idbPut('cards', updated).then(() => updated);
      });
    },

    async getDue(deckId) {
      const cards = deckId
        ? await Cards.getByDeck(deckId)
        : await Cards.getAll();
      return cards.filter(c => !c.suspended && SRS.isDue(c));
    },

    async applyReview(cardId, grade) {
      const card    = await Cards.get(cardId);
      const updated = { ...card, ...SRS.schedule(card, grade), updatedAt: Date.now() };
      await Cards.save(updated);
      return updated;
    },

    async search(query, deckId) {
      const cards = deckId
        ? await Cards.getByDeck(deckId)
        : await Cards.getAll();
      const q = query.toLowerCase();
      return cards.filter(c =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q)  ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      );
    },
  };

  /* ── SESSIONS ──────────────────────────────────────────────────── */
  const Sessions = {
    getAll:    ()     => idbGetAll('sessions'),
    getByDeck: deckId => idbGetAll('sessions', 'deckId', deckId),
    save:      s      => idbPut('sessions', s),

    create(deckId) {
      return {
        id:         uid(),
        deckId,
        date:       Date.now(),
        cards:      [],         // [{ cardId, grade, timeMs }]
        duration:   0,
        again:      0,
        hard:       0,
        good:       0,
        easy:       0,
        newCount:   0,
        reviewCount:0,
      };
    },

    recordReview(session, cardId, grade, timeMs, wasNew) {
      const labels = ['again','hard','good','easy'];
      session.cards.push({ cardId, grade, timeMs });
      session.duration += timeMs;
      session[labels[grade]]++;
      if (wasNew) session.newCount++;
      else        session.reviewCount++;
      return session;
    },

    finish(session) {
      return Sessions.save({ ...session, finishedAt: Date.now() });
    },
  };

  /* ── SETTINGS ──────────────────────────────────────────────────── */
  const Settings = {
    async get(key, def) {
      const row = await idbGet('settings', key);
      return row ? row.value : def;
    },
    set(key, value) {
      return idbPut('settings', { key, value });
    },
    async getAll() {
      const rows = await idbGetAll('settings');
      return Object.fromEntries(rows.map(r => [r.key, r.value]));
    },
  };

  /* ── IMPORT / EXPORT ───────────────────────────────────────────── */
  const IO = {
    async exportDeck(deckId) {
      const deck  = await Decks.get(deckId);
      const cards = await Cards.getByDeck(deckId);
      return JSON.stringify({ version: 1, deck, cards }, null, 2);
    },

    async exportAll() {
      const decks = await Decks.getAll();
      const cards = await Cards.getAll();
      const sessions = await Sessions.getAll();
      return JSON.stringify({ version: 1, decks, cards, sessions }, null, 2);
    },

    async importDeck(jsonStr) {
      const data = JSON.parse(jsonStr);
      if (!data.deck || !data.cards) throw new Error('Invalid format');

      // Remap IDs to avoid collisions
      const oldId = data.deck.id;
      const newDeckId = uid();
      const deck  = { ...data.deck, id: newDeckId, importedAt: Date.now() };
      await Decks.save(deck);

      for (const card of data.cards) {
        await Cards.save({
          ...card,
          id:     uid(),
          deckId: newDeckId,
        });
      }
      return deck;
    },
  };

  /* ── REVIEW HISTORY / HEATMAP ──────────────────────────────────── */
  const History = {
    async getHeatmap(days = 365) {
      const sessions  = await Sessions.getAll();
      const heatmap   = {};
      const cutoff    = Date.now() - days * 86400000;

      sessions.forEach(s => {
        if (s.date < cutoff) return;
        const dayKey = new Date(s.date).toISOString().slice(0, 10);
        heatmap[dayKey] = (heatmap[dayKey] || 0) + s.cards.length;
      });
      return heatmap;
    },

    async getStreak() {
      const heatmap = await History.getHeatmap();
      const keys    = Object.keys(heatmap).sort().reverse();
      if (!keys.length) return 0;

      let streak = 0;
      let cursor = new Date();
      cursor.setHours(0,0,0,0);

      for (let i = 0; i < 365; i++) {
        const key = cursor.toISOString().slice(0, 10);
        if (heatmap[key]) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (i === 0) {
          // Today not studied yet — check yesterday
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    },

    async getTotalReviews() {
      const sessions = await Sessions.getAll();
      return sessions.reduce((sum, s) => sum + s.cards.length, 0);
    },
  };

  /* ── PUBLIC ─────────────────────────────────────────────────────── */
  return { init, uid, Decks, Cards, Sessions, Settings, IO, History };

})();