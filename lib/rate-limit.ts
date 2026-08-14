interface Bucket {
  timestamps: number[];
  lastAccess: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 10;

export function checkMessageRateLimit(
  userId: string,
  roomId: string,
): { allowed: boolean; retryAfterMs: number } {
  const key = `${userId}:${roomId}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [], lastAccess: now };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
  bucket.lastAccess = now;

  if (bucket.timestamps.length >= MAX_PER_WINDOW) {
    const oldest = bucket.timestamps[0];
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  bucket.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

export function cleanStaleRateLimitBuckets(maxIdleMs = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastAccess > maxIdleMs) {
      buckets.delete(key);
    }
  }
}
