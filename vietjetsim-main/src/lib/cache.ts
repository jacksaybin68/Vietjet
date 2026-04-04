/**
 * Simple In-Memory Cache with TTL
 *
 * For production with multiple instances, use Redis instead.
 * This is suitable for single-instance deployments (local dev, small apps).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs: number = 60_000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.stats.size = this.store.size;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.store.delete(key);
    this.stats.size = this.store.size;
    return deleted;
  }

  /**
   * Delete all keys matching a prefix
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }
}

// Singleton instance
export const cache = new SimpleCache();

// ─── Cache Key Generators ───────────────────────────────────────────────────

export const CacheKeys = {
  airports: 'airports:all',
  airportsByCity: (city: string) => `airports:city:${city}`,
  flight: (id: string) => `flight:${id}`,
  flightsSearch: (hash: string) => `flights:search:${hash}`,
  userBookings: (userId: string) => `user:${userId}:bookings`,
  userWallet: (userId: string) => `user:${userId}:wallet`,
  userLoyalty: (userId: string) => `user:${userId}:loyalty`,
  adminStats: 'admin:stats',
  adminStatsOverview: 'admin:stats:overview',
};

// ─── Cache TTLs (in milliseconds) ───────────────────────────────────────────

export const CacheTTL = {
  // Static data - cache for 1 hour
  airports: 60 * 60 * 1000,

  // Semi-static data - cache for 5 minutes
  flights: 5 * 60 * 1000,

  // Dynamic user data - cache for 1 minute
  userBookings: 60 * 1000,
  userWallet: 60 * 1000,
  userLoyalty: 60 * 1000,

  // Admin data - cache for 1 minute
  adminStats: 60 * 1000,
  adminStatsOverview: 60 * 1000,
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Create a hash from search params for caching
 */
export function hashSearchParams(params: Record<string, string | string[] | undefined>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  return Buffer.from(sorted).toString('base64').slice(0, 32);
}

/**
 * Cache-aside pattern helper
 */
export async function cacheAside<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  cache.set(key, value, ttlMs);
  return value;
}
