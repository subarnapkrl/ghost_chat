import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "../../../../../db";
import { messages, roomMembers } from "../../../../../db/schema";
import { and, eq } from "drizzle-orm";
import { getIO } from "../../../../../lib/socket-server";
import { computeBurnAt } from "../../../../../lib/ttl";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    );
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this room" },
      { status: 403 },
    );
  }
  if (message.userId === session.user.id) {
    return NextResponse.json({
      ok: true,
      isSender: true,
      content: message.content,
    });
  }

  if (!message.burnAfterRead || message.readAt || message.status !== "active") {
    return NextResponse.json({
      ok: true,
      alreadyRead: !!message.readAt,
      content: message.content,
    });
  }

  const readAt = new Date();
  const [updated] = await db
    .update(messages)
    .set({ readAt })
    .where(eq(messages.id, messageId))
    .returning();

  const io = getIO();
  if (io) {
    io.to(message.roomId).emit("message:read", {
      id: updated.id,
      roomId: message.roomId,
      readAt: updated.readAt,
      burnAt: computeBurnAt(readAt),
    });
  }
  return NextResponse.json({
    ok: true,
    readAt: updated.readAt,
    content: updated.content,
  });
}
