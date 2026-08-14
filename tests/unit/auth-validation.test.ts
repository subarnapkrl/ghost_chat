import { describe, it, expect } from "vitest";
import {
  chatNameSchema,
  loginSchema,
  registerSchema,
} from "../../lib/validation/auth";

describe("chatNameSchema", () => {
  it("accepts a valid chat name", () => {
    expect(chatNameSchema.safeParse("ghost_writer_22").success).toBe(true);
  });
  it("rejects names under 3 characters", () => {
    expect(chatNameSchema.safeParse("ab").success).toBe(false);
  });
  it("accepts a name at exactly 3 characters", () => {
    expect(chatNameSchema.safeParse("abc").success).toBe(true);
  });
  it("rejects names over 20 characters", () => {
    expect(chatNameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("accepts a name at exactly 20 characters", () => {
    expect(chatNameSchema.safeParse("a".repeat(20)).success).toBe(true);
  });

  it("rejects spaces", () => {
    expect(chatNameSchema.safeParse("ghost writer").success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(chatNameSchema.safeParse("ghost@writer").success).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    const result = chatNameSchema.safeParse("  ghost  ");
    expect(result.success && result.data).toBe("ghost");
  });
});

describe("registerSchema", () => {
  const valid = {
    email: "test@test.com",
    password: "password123",
    chatName: "testUser",
  };

  it("accepts a fully valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("lowercases and trims email", () => {
    const result = registerSchema.safeParse({
      ...valid,
      email: "  Test@Example.COM  ",
    });
    expect(result.success && result.data.email).toBe("test@example.com");
  });

  it("rejects an invalid email", () => {
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "ab1" }).success,
    ).toBe(false);
  });

  it("rejects a password with no letters", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "12345678" }).success,
    ).toBe(false);
  });

  it("rejects a password with no numbers", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "abcdefgh" }).success,
    ).toBe(false);
  });

  it("rejects a password over the 72-byte bcrypt limit", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "a1".repeat(40) }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password (strength is only enforced at registration)", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "nope", password: "x" });
    expect(result.success).toBe(false);
  });
});
