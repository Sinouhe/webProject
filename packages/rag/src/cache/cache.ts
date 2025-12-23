// packages/rag/src/cache/cache.ts

export type CacheKey = string;

export type CacheGetResult<T> = {
	hit: boolean;
	value: T | null;
};

export type CacheOptions = {
	/**
	 * Default TTL in milliseconds.
	 * 0 or undefined means "no expiration" (not recommended for retrieval/answers).
	 */
	defaultTtlMs?: number;

	/**
	 * Maximum number of entries kept in memory.
	 * When exceeded, least-recently-used items are evicted.
	 */
	maxEntries: number;
};

type Entry<T> = {
	value: T;
	expiresAt: number | null;
};

/**
 * Minimal cache interface to allow swapping implementations (in-memory / Redis).
 */
export interface Cache {
	get<T>(key: CacheKey): CacheGetResult<T>;
	set<T>(key: CacheKey, value: T, ttlMs?: number): void;
	delete(key: CacheKey): void;
	clear(): void;

	/**
	 * getOrSet with "singleflight":
	 * - If cache hit: returns cached value
	 * - If miss:
	 *   - If another call is already computing the same key, await it
	 *   - Otherwise compute, store, return
	 */
	getOrSet<T>(key: CacheKey, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
}

/**
 * In-memory LRU + TTL cache with singleflight.
 * - LRU implemented via Map insertion order:
 *   - on hit, we "touch" by deleting + re-setting the key
 * - TTL enforced on read
 */
export class MemoryCache implements Cache {
	private readonly defaultTtlMs?: number;
	private readonly maxEntries: number;

	private readonly store = new Map<CacheKey, Entry<unknown>>();
	private readonly inflight = new Map<CacheKey, Promise<unknown>>();

	constructor(opts: CacheOptions) {
		if (!Number.isFinite(opts.maxEntries) || opts.maxEntries <= 0) {
			throw new Error(
				`MemoryCache: maxEntries must be a positive number, got: ${opts.maxEntries}`
			);
		}
		this.defaultTtlMs = opts.defaultTtlMs;
		this.maxEntries = opts.maxEntries;
	}

	get<T>(key: CacheKey): CacheGetResult<T> {
		const entry = this.store.get(key) as Entry<T> | undefined;
		if (!entry) return { hit: false, value: null };

		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			// Expired: delete and miss.
			this.store.delete(key);
			return { hit: false, value: null };
		}

		// LRU touch: move to most-recently-used
		this.store.delete(key);
		this.store.set(key, entry);

		return { hit: true, value: entry.value };
	}

	set<T>(key: CacheKey, value: T, ttlMs?: number): void {
		const ttl = ttlMs ?? this.defaultTtlMs;
		const expiresAt = ttl === undefined || ttl === 0 ? null : Date.now() + Math.max(1, ttl);

		// Set + touch as MRU
		if (this.store.has(key)) this.store.delete(key);
		this.store.set(key, { value, expiresAt });

		this.evictIfNeeded();
	}

	delete(key: CacheKey): void {
		this.store.delete(key);
		this.inflight.delete(key);
	}

	clear(): void {
		this.store.clear();
		this.inflight.clear();
	}

	/**
	 * getOrSet implements a "singleflight" cache pattern.
	 *
	 * Behavior:
	 * - If the key is already cached, the cached value is returned immediately.
	 * - If the key is NOT cached but another request is already computing it,
	 *   this call will await the same in-flight Promise instead of triggering
	 *   a duplicate computation.
	 * - If the key is NOT cached and NOT in-flight, the provided factory()
	 *   function is executed once, its Promise is stored as "in-flight",
	 *   and the resolved value is cached.
	 *
	 * This prevents:
	 * - Duplicate expensive calls (OpenAI embeddings, vector search, etc.)
	 * - Cache stampede under high concurrency
	 *
	 * Callers always just `await` the result and never need to handle
	 * concurrency or Promise-sharing themselves.
	 */
	async getOrSet<T>(key: CacheKey, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
		const cached = this.get<T>(key);
		if (cached.hit && cached.value !== null) return cached.value;

		const existing = this.inflight.get(key) as Promise<T> | undefined;
		if (existing) return existing;

		const p = (async () => {
			try {
				const value = await factory();
				this.set<T>(key, value, ttlMs);
				return value;
			} finally {
				// Ensure inflight entry is cleared even if factory throws
				this.inflight.delete(key);
			}
		})();

		this.inflight.set(key, p as Promise<unknown>);
		return p;
	}

	private evictIfNeeded(): void {
		while (this.store.size > this.maxEntries) {
			// First key in Map = least-recently-used
			const lruKey = this.store.keys().next().value as CacheKey | undefined;
			if (!lruKey) return;
			this.store.delete(lruKey);
		}
	}
}
