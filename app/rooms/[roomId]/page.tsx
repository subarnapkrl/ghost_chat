import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { db } from "../../../db";
import { roomMembers, rooms } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import RoomClient from "./room-client";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) redirect("/dashboard");

  const [membership] = await db
    .select()
    .from(roomMembers)
    .where(
      and(
        eq(roomMembers.userId, session.user.id),
        eq(roomMembers.roomId, roomId),
      ),
    )
    .limit(1);
  if (!membership) redirect("/dashboard");
  return (
    <RoomClient
      roomId={room.id}
      roomName={room.name}
      chatName={session.user.chatName}
      currentUserId={session.user.id}
    />
  );
}
