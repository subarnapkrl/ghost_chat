import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { Server } from "socket.io";
import { db } from "../../db";
import { messages, rooms, users } from "../../db/schema";
import { BURN_DELAY_SECONDS } from "../../lib/ttl";
import { sweepExpiredMessages } from "../../cron/expireMessages";

function createMockIO() {
  const emitted: {
    event: string;
    roomId: string;
    payload: { id: string; roomId: string };
  }[] = [];
  const io = {
    to(roomId: string) {
      return {
        emit(event: string, payload: { id: string; roomId: string }) {
          emitted.push({ event, roomId, payload });
        },
      };
    },
  } as unknown as Server;
  return { io, emitted };
}

describe("sweepExpiredMessages (integration)", () => {
  const testEmail = `sweep-test-${crypto.randomUUID()}@example.com`;
  const testChatName = `sweeptest_${crypto.randomUUID().slice(0, 8)}`;

  let userId: string;
  let roomId: string;
  const messageIds: string[] = [];

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        passwordHash: "not-a-real-hash",
        chatName: testChatName,
      })
      .returning({ id: users.id });
    userId = user.id;

    const [room] = await db
      .insert(rooms)
      .values({ name: "sweep-test-room", createdBy: userId })
      .returning({ id: rooms.id });
    roomId = room.id;

    const now = Date.now();

    const rows = await db
      .insert(messages)
      .values([
        {
          roomId,
          userId,
          content: "expires naturally",
          expiresAt: new Date(now - 5_000),
        },
        {
          roomId,
          userId,
          content: "burn me",
          burnAfterRead: true,
          readAt: new Date(now - (BURN_DELAY_SECONDS + 5) * 1000),
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
        {
          roomId,
          userId,
          content: "not yet",
          burnAfterRead: true,
          readAt: new Date(now - 1_000),
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
        {
          roomId,
          userId,
          content: "still fine",
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
      ])
      .returning({ id: messages.id });

    messageIds.push(...rows.map((r) => r.id));
  });

  afterAll(async () => {
    if (messageIds.length) {
      await db.delete(messages).where(inArray(messages.id, messageIds));
    }
    if (roomId) {
      await db.delete(rooms).where(eq(rooms.id, roomId));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("flips naturally-expired messages to expired and emits message:expired", async () => {
    const { io, emitted } = createMockIO();
    await sweepExpiredMessages(io);

    const [expiredMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageIds[0]));

    expect(expiredMsg.status).toBe("expired");
    expect(
      emitted.some(
        (e) => e.event === "message:expired" && e.payload.id === messageIds[0],
      ),
    ).toBe(true);
  });

  it("flips read burn-after-read messages past their delay to burned and emits message:burned", async () => {
    const { io, emitted } = createMockIO();
    await sweepExpiredMessages(io);

    const [burnedMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageIds[1]));

    expect(burnedMsg.status).toBe("burned");
    expect(
      emitted.some(
        (e) => e.event === "message:burned" && e.payload.id === messageIds[1],
      ),
    ).toBe(true);
  });

  it("leaves a recently-read burn-after-read message active (delay not yet elapsed)", async () => {
    const { io } = createMockIO();
    await sweepExpiredMessages(io);

    const [stillActive] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageIds[2]));
    expect(stillActive.status).toBe("active");
  });

  it("leaves an ordinary unexpired message untouched", async () => {
    const { io, emitted } = createMockIO();
    await sweepExpiredMessages(io);

    const [untouched] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageIds[3]));
    expect(untouched.status).toBe("active");
    expect(emitted.some((e) => e.payload.id === messageIds[3])).toBe(false);
  });

  it("never hard-deletes — all fixture rows still exist after the sweep", async () => {
    const remaining = await db
      .select({ id: messages.id })
      .from(messages)
      .where(inArray(messages.id, messageIds));
    expect(remaining).toHaveLength(messageIds.length);
  });
});
