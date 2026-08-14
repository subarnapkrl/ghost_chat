export const MIN_TTL_SECONDS = 10;
export const MAX_TTL_SEXONDS = 60 * 60 * 24 * 7;

export const BURN_DELAY_SECONDS = Number(
  process.env.BURN_AFTER_READ_SECONDS ?? 10,
);

export function computeExpiresAt(
  ttlSeconds: number,
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + ttlSeconds * 1000);
}

export function computeBurnAt(
  readAt: Date,
  delaySeconds: number = BURN_DELAY_SECONDS,
): Date {
  return new Date(readAt.getTime() + delaySeconds * 1000);
}
