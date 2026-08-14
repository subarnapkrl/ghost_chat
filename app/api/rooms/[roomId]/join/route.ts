import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../db";
import { roomMembers, rooms } from "../../../../../db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "../../../../../auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(roomMembers)
    .where(
      and(
        eq(roomMembers.userId, session.user.id),
        eq(roomMembers.roomId, roomId),
      ),
    )
    .limit(1);
  if (!existing) {
    await db.insert(roomMembers).values({ userId: session.user.id, roomId });
  }
  return NextResponse.json({ ok: true, roomId });
}
