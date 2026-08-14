import { describe, it, expect } from "vitest";
import { createMessageSchema } from "../../lib/validation/message";
import { MAX_TTL_SEXONDS, MIN_TTL_SECONDS } from "../../lib/ttl";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    clientMessageId: VALID_UUID,
    content: "k cha",
    ttlSeconds: 300,
    ...overrides,
  };
}

describe("createMessageSchema", () => {
  it("accepts a well-formed message", () => {
    const result = createMessageSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });
  it("defaults burnAfterRead to false when omitted", () => {
    const result = createMessageSchema.safeParse(validInput());
    expect(result.success && result.data.burnAfterRead).toBe(false);
  });

  it("trims whitespace from content", () => {
    const result = createMessageSchema.safeParse(
      validInput({ content: "  hi  " }),
    );
    expect(result.success && result.data.content).toBe("hi");
  });

  it("rejects empty content (after trimming)", () => {
    const result = createMessageSchema.safeParse(
      validInput({ content: "   " }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects content over 2000 characters", () => {
    const result = createMessageSchema.safeParse(
      validInput({ content: "x".repeat(2001) }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts content at exactly the 2000 char boundary", () => {
    const result = createMessageSchema.safeParse(
      validInput({ content: "x".repeat(2000) }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects clientMessageId that is not a valid UUID", () => {
    const result = createMessageSchema.safeParse(
      validInput({ clientMessageId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects ttlSeconds below MIN_TTL_SECONDS", () => {
    const result = createMessageSchema.safeParse(
      validInput({ ttlSeconds: MIN_TTL_SECONDS - 1 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts ttlSeconds exactly at MIN_TTL_SECONDS", () => {
    const result = createMessageSchema.safeParse(
      validInput({ ttlSeconds: MIN_TTL_SECONDS }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects ttlSeconds above MAX_TTL_SECONDS", () => {
    const result = createMessageSchema.safeParse(
      validInput({ ttlSeconds: MAX_TTL_SEXONDS + 1 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts ttlSeconds exactly at MAX_TTL_SECONDS", () => {
    const result = createMessageSchema.safeParse(
      validInput({ ttlSeconds: MAX_TTL_SEXONDS }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer ttlSeconds", () => {
    const result = createMessageSchema.safeParse(
      validInput({ ttlSeconds: 60.5 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts an explicit burnAfterRead: true", () => {
    const result = createMessageSchema.safeParse(
      validInput({ burnAfterRead: true }),
    );
    expect(result.success && result.data.burnAfterRead).toBe(true);
  });
});
