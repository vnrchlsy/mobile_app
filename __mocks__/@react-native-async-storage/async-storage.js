/**
 * US-X1 · in-memory AsyncStorage for jest.
 *
 * Recent versions no longer ship `jest/async-storage-mock`, which earlier ones did — so
 * without this every test touching the cache fails with "Native module is null".
 *
 * ⚠️ Mirrors the 2.2.0 API (`multiGet`/`multiSet`/`multiRemove`), which is the version Expo
 * SDK 54 expects. A first pass installed 3.1.1 via `pnpm add` — outside Expo's compatibility
 * matrix, with a renamed API (`removeMany`) that `@types/...@4` does not describe. `npx expo
 * install` is what picks an SDK-compatible version; plain `pnpm add` is not. A root
 * `__mocks__` directory adjacent to node_modules is applied automatically for a node_modules
 * package, so no `jest.mock()` call is needed at any call site.
 *
 * Deliberately a REAL implementation over a Map rather than `jest.fn()` stubs. The cache
 * tests assert round-trip behaviour, TTL expiry and prefix-scoped clearing — none of which
 * a stub that records calls can tell you anything about. Asserting on mock behaviour instead
 * of real behaviour is how a test passes while the thing it covers is broken.
 */
const store = new Map();

const AsyncStorage = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async getAllKeys() {
    return [...store.keys()];
  },
  async multiGet(keys) {
    return keys.map((k) => [k, store.has(k) ? store.get(k) : null]);
  },
  async multiSet(entries) {
    for (const [k, v] of entries) store.set(k, String(v));
  },
  async multiRemove(keys) {
    for (const k of keys) store.delete(k);
  },
  async clear() {
    store.clear();
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
