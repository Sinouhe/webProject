// packages/rag/src/cache/cache.ts

export type CacheKey = string;

export type CacheGetResult<T> = {
	hit: boolean;
	value: T | null;
};

export type CacheOptions = {
	defaultTtlMs?: number;
	maxEntries: number;
};

type Entry<T> = {
	value: T;
	expiresAt: number | null;
};

export type CacheStats = {
	hits: number;
	misses: number;
	coldMisses: number;
	expiredMisses: number;
	sets: number;
	evictions: number;
};

export interface Cache {
	get<T>(key: CacheKey): CacheGetResult<T>;
	set<T>(key: CacheKey, value: T, ttlMs?: number): void;
	delete(key: CacheKey): void;
	clear(): void;

	deletePrefix(prefix: string): number;
	size(): number;
	stats(): CacheStats;

	getOrSet<T>(key: CacheKey, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
}

export class MemoryCache implements Cache {
	private readonly defaultTtlMs?: number;
	private readonly maxEntries: number;

	private readonly store = new Map<CacheKey, Entry<unknown>>();
	private readonly inflight = new Map<CacheKey, Promise<unknown>>();

	private _hits = 0;
	private _misses = 0;
	private _coldMisses = 0;
	private _expiredMisses = 0;
	private _sets = 0;
	private _evictions = 0;

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

		if (!entry) {
			this._misses += 1;
			this._coldMisses += 1;
			return { hit: false, value: null };
		}

		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			this.store.delete(key);
			this._misses += 1;
			this._expiredMisses += 1;
			return { hit: false, value: null };
		}

		// LRU touch
		this.store.delete(key);
		this.store.set(key, entry);

		this._hits += 1;
		return { hit: true, value: entry.value };
	}

	set<T>(key: CacheKey, value: T, ttlMs?: number): void {
		const ttl = ttlMs ?? this.defaultTtlMs;
		const expiresAt = ttl === undefined || ttl === 0 ? null : Date.now() + Math.max(1, ttl);

		// Set + MRU touch
		this.store.delete(key);
		this.store.set(key, { value, expiresAt });

		this._sets += 1;
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

	deletePrefix(prefix: string): number {
		let deleted = 0;
		for (const key of this.store.keys()) {
			if (key.startsWith(prefix)) {
				this.store.delete(key);
				this.inflight.delete(key);
				deleted += 1;
			}
		}
		return deleted;
	}

	size(): number {
		return this.store.size;
	}

	stats(): CacheStats {
		return {
			hits: this._hits,
			misses: this._misses,
			coldMisses: this._coldMisses,
			expiredMisses: this._expiredMisses,
			sets: this._sets,
			evictions: this._evictions,
		};
	}

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
				this.inflight.delete(key);
			}
		})();

		this.inflight.set(key, p as Promise<unknown>);
		return p;
	}

	private evictIfNeeded(): void {
		while (this.store.size > this.maxEntries) {
			const lruKey = this.store.keys().next().value as CacheKey | undefined;
			if (!lruKey) return;
			this.store.delete(lruKey);
			this._evictions += 1;
		}
	}
}
