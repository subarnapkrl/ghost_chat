import { describe, it, expect } from "vitest";
import {
  BURN_DELAY_SECONDS,
  computeBurnAt,
  computeExpiresAt,
  MAX_TTL_SEXONDS,
  MIN_TTL_SECONDS,
} from "../../lib/ttl";

describe("computeExpiresAt", () => {
  it("adds ttlSeconds to the given base time", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(computeExpiresAt(60, from).toISOString()).toBe(
      "2026-01-01T00:01:00.000Z",
    );
  });

  it("handles the minimum TTL bound", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(computeExpiresAt(MIN_TTL_SECONDS, from).getTime()).toBe(
      from.getTime() + MIN_TTL_SECONDS * 1000,
    );
  });

  it("handles the maximum TTL bound (7 days)", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const result = computeExpiresAt(MAX_TTL_SEXONDS, from);
    expect(result.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("defaults to roughly now when no base time is given", () => {
    const before = Date.now();
    const result = computeExpiresAt(10);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 10_000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 10_000);
  });
});

describe("computeBurnAt", () => {
  it("adds the default burn delay to readAt", () => {
    const readAt = new Date("2026-01-01T00:00:00.000Z");
    const result = computeBurnAt(readAt);
    expect(result.getTime() - readAt.getTime()).toBe(BURN_DELAY_SECONDS * 1000);
  });

  it("respects a custom delay override", () => {
    const readAt = new Date("2026-01-01T00:00:00.000Z");
    expect(computeBurnAt(readAt, 5).getTime() - readAt.getTime()).toBe(5000);
  });

  it("produces a time strictly after readAt for any positive delay", () => {
    const readAt = new Date();
    expect(computeBurnAt(readAt, 1).getTime()).toBeGreaterThan(
      readAt.getTime(),
    );
  });
});

describe("TTL bounds constants", () => {
  it("MIN_TTL_SECONDS is 10 seconds", () => {
    expect(MIN_TTL_SECONDS).toBe(10);
  });

  it("MAX_TTL_SECONDS is exactly 7 days", () => {
    expect(MAX_TTL_SEXONDS).toBe(60 * 60 * 24 * 7);
  });

  it("MIN is strictly less than MAX", () => {
    expect(MIN_TTL_SECONDS).toBeLessThan(MAX_TTL_SEXONDS);
  });
});
