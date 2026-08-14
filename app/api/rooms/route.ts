import z from "zod";
import { auth } from "../../../auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { roomMembers, rooms, users } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";

const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Room name is required")
    .max(50, "Room name must be at most 50 characters long"),
});

export async function GET() {
  const session = await auth();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomList = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      createdAt: rooms.createdAt,
      creatorChatName: users.chatName,
      memberCount: sql<number>`count(distinct ${roomMembers.id})::int`,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.createdBy, users.id))
    .leftJoin(roomMembers, eq(roomMembers.roomId, rooms.id))
    .groupBy(rooms.id, users.chatName)
    .orderBy(sql`${rooms.createdAt} desc`);

  const memberships = await db
    .select({ roomId: roomMembers.roomId })
    .from(roomMembers)
    .where(eq(roomMembers.userId, session.user.id));

  const memberRoomIds = new Set(memberships.map((m) => m.roomId));
  return NextResponse.json({
    rooms: roomList.map((r) => ({ ...r, isMember: memberRoomIds.has(r.id) })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [room] = await db
    .insert(rooms)
    .values({ name: parsed.data.name, createdBy: session.user.id })
    .returning();
  await db
    .insert(roomMembers)
    .values({ userId: session.user.id, roomId: room.id });
  return NextResponse.json({ room }, { status: 201 });
}
