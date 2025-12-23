// packages/rag/src/cache/ttlCache.ts

/**
 * Tiny in-memory TTL cache.
 * - Not persistent (process memory)
 * - Suitable for local dev / single instance
 * - For production multi-instance: use Redis
 */
export type CacheEntry<V> = {
	value: V;
	expiresAt: number;
};

export class TtlCache<K, V> {
	private map = new Map<K, CacheEntry<V>>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxSize: number = 200
	) {}

	get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;

		if (Date.now() > entry.expiresAt) {
			this.map.delete(key);
			return undefined;
		}

		return entry.value;
	}

	set(key: K, value: V): void {
		// Simple eviction: remove oldest insertion
		if (this.map.size >= this.maxSize) {
			const firstKey = this.map.keys().next().value as K | undefined;
			if (firstKey !== undefined) this.map.delete(firstKey);
		}

		this.map.set(key, {
			value,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	clear(): void {
		this.map.clear();
	}
}
