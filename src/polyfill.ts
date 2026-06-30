// Storage Polyfill for restricted sandbox environments (e.g. iFrames blocking third-party storage)
try {
  const testKey = '__test_storage_integrity__';
  window.localStorage.setItem(testKey, 'ok');
  const res = window.localStorage.getItem(testKey);
  window.localStorage.removeItem(testKey);
  if (res !== 'ok') {
    throw new Error('Storage readback failed');
  }
} catch (e) {
  console.warn('[Storage Polyfill] localStorage is disabled or restricted. Polyfilling with in-memory fallback to avoid script crash.', e);

  const mockMemoryStore: Record<string, string> = {};

  const mockStorage: Storage = {
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(mockMemoryStore, key) ? mockMemoryStore[key] : null;
    },
    setItem(key: string, value: string): void {
      mockMemoryStore[key] = String(value);
    },
    removeItem(key: string): void {
      delete mockMemoryStore[key];
    },
    clear(): void {
      for (const k in mockMemoryStore) {
        if (Object.prototype.hasOwnProperty.call(mockMemoryStore, k)) {
          delete mockMemoryStore[k];
        }
      }
    },
    key(index: number): string | null {
      const keys = Object.keys(mockMemoryStore);
      return keys[index] || null;
    },
    get length(): number {
      return Object.keys(mockMemoryStore).length;
    }
  };

  try {
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  } catch (err) {
    // If window.localStorage is read-only or non-configurable, we can polyfill on window itself
    (window as any).localStorage = mockStorage;
  }
}

// Ensure sessionStorage is also safe
try {
  const testKey = '__test_session_integrity__';
  window.sessionStorage.setItem(testKey, 'ok');
  window.sessionStorage.removeItem(testKey);
} catch (e) {
  console.warn('[Storage Polyfill] sessionStorage is restricted. Polyfilling with in-memory fallback.', e);
  const mockMemoryStore: Record<string, string> = {};
  const mockStorage: Storage = {
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(mockMemoryStore, key) ? mockMemoryStore[key] : null;
    },
    setItem(key: string, value: string): void {
      mockMemoryStore[key] = String(value);
    },
    removeItem(key: string): void {
      delete mockMemoryStore[key];
    },
    clear(): void {
      for (const k in mockMemoryStore) {
        if (Object.prototype.hasOwnProperty.call(mockMemoryStore, k)) {
          delete mockMemoryStore[k];
        }
      }
    },
    key(index: number): string | null {
      const keys = Object.keys(mockMemoryStore);
      return keys[index] || null;
    },
    get length(): number {
      return Object.keys(mockMemoryStore).length;
    }
  };

  try {
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  } catch (err) {
    (window as any).sessionStorage = mockStorage;
  }
}
