import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "../../../../../lib/with-logging";
import { isSameOrigin } from "../../../../../lib/csrf";
import { auth } from "../../../../../auth";
import { db } from "../../../../../db";
import { messages, roomMembers } from "../../../../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getIO } from "../../../../../lib/socket-server";

export const runtime = "nodejs";

export const POST = withLogging(
  "messages.receipt",
  async (req: NextRequest, { params }: { params: { messageId: string } }) => {
    if (!isSameOrigin(req)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = params;

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const [membership] = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.userId, session.user.id),
          eq(roomMembers.roomId, message.roomId),
        ),
      )
      .limit(1);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this room" },
        { status: 403 },
      );
    }

    // Sender viewing their own message doesn't produce a receipt — you
    // don't get a "read" tick from yourself.
    if (message.userId === session.user.id) {
      return NextResponse.json({ ok: true, isSender: true });
    }

    // Already in readBy — idempotent no-op, don't re-broadcast.
    if (message.readBy.includes(session.user.id)) {
      return NextResponse.json({
        ok: true,
        alreadyRead: true,
        readBy: message.readBy,
      });
    }

    const [updated] = await db
      .update(messages)
      .set({
        readBy: sql`array_append(${messages.readBy}, ${session.user.id}::uuid)`,
      })
      .where(eq(messages.id, messageId))
      .returning({ readBy: messages.readBy });

    const io = getIO();
    if (io) {
      io.to(message.roomId).emit("message:receipt", {
        id: messageId,
        roomId: message.roomId,
        readBy: updated.readBy,
      });
    }

    return NextResponse.json({ ok: true, readBy: updated.readBy });
  },
);
