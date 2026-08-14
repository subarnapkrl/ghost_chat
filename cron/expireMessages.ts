import type { Server } from "socket.io";
import { db } from "../db";
import { messages } from "../db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { BURN_DELAY_SECONDS } from "../lib/ttl";

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({ event, ts: new Date().toISOString(), ...fields }),
  );
}

export async function sweepExpiredMessages(io: Server): Promise<void> {
  const now = new Date();
  const expired = await db
    .update(messages)
    .set({ status: "expired" })
    .where(and(eq(messages.status, "active"), lte(messages.expiresAt, now)))
    .returning({ id: messages.id, roomId: messages.roomId });

  for (const exp of expired) {
    io.to(exp.roomId).emit("message:expired", {
      id: exp.id,
      roomId: exp.roomId,
    });
  }
  const burnCutoff = new Date(now.getTime() - BURN_DELAY_SECONDS * 1000);
  const burned = await db
    .update(messages)
    .set({ status: "burned" })
    .where(
      and(
        eq(messages.status, "active"),
        eq(messages.burnAfterRead, true),
        isNotNull(messages.readAt),
        lte(messages.readAt, burnCutoff),
      ),
    )
    .returning({ id: messages.id, roomId: messages.roomId });

  for (const burn of burned) {
    io.to(burn.roomId).emit("messages:burned", {
      id: burn.id,
      roomId: burn.roomId,
    });
  }
  if (expired.length || burned.length) {
    log("expirey:sweep", {
      expiredCount: expired.length,
      burnedCount: burned.length,
    });
  }
}
