/*
 * AM 369 Network — Data Service
 * -------------------------------------------------------------
 * Single source of truth for all data access.
 *
 * How it works:
 *  - On first load, seed JSON files in /assets/data are fetched.
 *  - Data is cached in memory (fast) and mirrored to LocalStorage.
 *  - Admin edits write to LocalStorage only (browser demo mode).
 *  - Public site reads the merged view (LocalStorage wins if present).
 *
 * IMPORTANT (GitHub Pages limitation):
 *  The browser cannot write back to repo JSON files without a backend.
 *  So admin changes live in LocalStorage on THIS device/browser.
 *  Use Export JSON in the admin panel to download updated files, then
 *  commit them to the repo to make changes public for everyone.
 *  See README for the Google Apps Script / GitHub API upgrade path.
 * -------------------------------------------------------------
 */
(function (global) {
  "use strict";

  var NS = "am369:v1:";          // LocalStorage namespace (bump to invalidate)
  var CACHE_TTL = 5 * 60 * 1000; // in-memory cache 5 min
  var KEYS = ["apps", "blogs", "directories", "species", "images", "settings", "content", "medicines", "systems"];
  var SEED_PATH = "assets/data/";

  var mem = {};   // { key: { data, ts } }

  function lsKey(k) { return NS + k; }

  function readLS(k) {
    try {
      var raw = localStorage.getItem(lsKey(k));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeLS(k, data) {
    try {
      localStorage.setItem(lsKey(k), JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("LocalStorage write failed for", k, e);
      return false;
    }
  }

  function fetchSeed(k) {
    return fetch(SEED_PATH + k + ".json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("seed fetch failed: " + k);
        return r.json();
      });
  }

  // Returns a promise resolving to the data for a key.
  function get(k) {
    // memory cache hit
    var c = mem[k];
    if (c && (Date.now() - c.ts) < CACHE_TTL) {
      return Promise.resolve(clone(c.data));
    }
    // localStorage overlay
    var ls = readLS(k);
    if (ls !== null) {
      mem[k] = { data: ls, ts: Date.now() };
      return Promise.resolve(clone(ls));
    }
    // fall back to seed file
    return fetchSeed(k).then(function (data) {
      mem[k] = { data: data, ts: Date.now() };
      writeLS(k, data); // prime LS so later reads are instant/offline
      return clone(data);
    });
  }

  // Overwrite a whole collection (admin use). Writes LS + memory.
  function set(k, data) {
    mem[k] = { data: clone(data), ts: Date.now() };
    return writeLS(k, data);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Force reload every key from seed (Reset to sample data).
  function resetToSeed() {
    var jobs = KEYS.map(function (k) {
      return fetchSeed(k).then(function (data) { set(k, data); });
    });
    return Promise.all(jobs);
  }

  // Export every collection as one backup object.
  function exportAll() {
    var jobs = KEYS.map(function (k) {
      return get(k).then(function (data) { return [k, data]; });
    });
    return Promise.all(jobs).then(function (pairs) {
      var out = { _meta: { app: "AM369Network", exportedAt: new Date().toISOString() } };
      pairs.forEach(function (p) { out[p[0]] = p[1]; });
      return out;
    });
  }

  // Import a backup object (partial allowed).
  function importAll(obj) {
    if (!obj || typeof obj !== "object") throw new Error("Invalid backup");
    KEYS.forEach(function (k) {
      if (obj[k] !== undefined) set(k, obj[k]);
    });
    return true;
  }

  function clearCache() { mem = {}; }

  global.DataService = {
    KEYS: KEYS,
    get: get,
    set: set,
    resetToSeed: resetToSeed,
    exportAll: exportAll,
    importAll: importAll,
    clearCache: clearCache
  };

  /* -----------------------------------------------------------
   * ImageCache — multi-level cache for Drive/remote thumbnails
   * L1: in-memory Map (instant, cleared on reload)
   * L2: IndexedDB blob store (persistent across sessions/offline)
   * L3: network fetch (first load only, then written to L1+L2)
   * Usage: ImageCache.getObjectURL(url).then(function(objUrl){ img.src = objUrl; })
   * ----------------------------------------------------------- */
  var DB_NAME = "am369_media_cache", STORE = "images", DB_VERSION = 1;
  var memImg = new Map();
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    if (!("indexedDB" in window)) { dbPromise = Promise.resolve(null); return dbPromise; }
    dbPromise = new Promise(function (resolve) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
    });
    return dbPromise;
  }
  function idbGet(key) {
    return openDb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        tx.onsuccess = function () { resolve(tx.result || null); };
        tx.onerror = function () { resolve(null); };
      });
    });
  }
  function idbSet(key, blob) {
    return openDb().then(function (db) {
      if (!db) return;
      try { db.transaction(STORE, "readwrite").objectStore(STORE).put(blob, key); } catch (e) {}
    });
  }

  function getObjectURL(url) {
    if (!url) return Promise.resolve("");
    if (memImg.has(url)) return Promise.resolve(memImg.get(url));
    return idbGet(url).then(function (blob) {
      if (blob) {
        var objUrl = URL.createObjectURL(blob);
        memImg.set(url, objUrl);
        return objUrl;
      }
      return fetch(url, { mode: "cors" }).then(function (r) {
        if (!r.ok) throw new Error("image fetch failed");
        return r.blob();
      }).then(function (b) {
        idbSet(url, b);
        var objUrl = URL.createObjectURL(b);
        memImg.set(url, objUrl);
        return objUrl;
      }).catch(function () { return url; }); // fall back to direct URL (e.g. CORS-blocked hosts)
    });
  }

  global.ImageCache = { getObjectURL: getObjectURL };
})(window);
