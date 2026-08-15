import z from "zod";
import {
  computeExpiresAt,
  MAX_TTL_SEXONDS,
  MIN_TTL_SECONDS,
} from "../../../../../lib/ttl";
import { db } from "../../../../../db";
import { messages, roomMembers, users } from "../../../../../db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getIO } from "../../../../../lib/socket-server";
import { checkMessageRateLimit } from "../../../../../lib/rate-limit";
import { withLogging } from "../../../../../lib/with-logging";
import { isSameOrigin } from "../../../../../lib/csrf";
import { isBodyTooLarge } from "../../../../../lib/request-limits";

export const runtime = "nodejs";

const createMsgSchema = z.object({
  clientMessageId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  ttlSeconds: z.number().int().min(MIN_TTL_SECONDS).max(MAX_TTL_SEXONDS),
  burnAfterRead: z.boolean().optional().default(false),
});

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string")
      return null;
    return parsed;
  } catch {
    return null;
  }
}

async function requireMembership(userId: string, roomId: string) {
  const [membership] = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.userId, userId), eq(roomMembers.roomId, roomId)))
    .limit(1);

  return !!membership;
}

export const GET = withLogging<{ roomId: string }>(
  "messages.list",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    const { roomId } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!(await requireMembership(session.user.id, roomId))) {
      return NextResponse.json(
        { error: "Not a member of this room" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    const cursorParam = url.searchParams.get("cursor");
    let cursor: Cursor | null = null;
    if (cursorParam) {
      cursor = decodeCursor(cursorParam);
      if (!cursor) {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
    }

    const conditions = [eq(messages.roomId, roomId)];
    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      conditions.push(
        or(
          lt(messages.createdAt, cursorDate),
          and(eq(messages.createdAt, cursorDate), lt(messages.id, cursor.id)),
        )!,
      );
    }

    const rows = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        userId: messages.userId,
        content: messages.content,
        status: messages.status,
        burnAfterRead: messages.burnAfterRead,
        createdAt: messages.createdAt,
        expiresAt: messages.expiresAt,
        readAt: messages.readAt,
        chatName: users.chatName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: pageRows[pageRows.length - 1].createdAt.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

    const result = pageRows
      .slice()
      .reverse()
      .map((m) => {
        const isOwn = m.userId === session.user.id;
        const isMaskedBurn = m.burnAfterRead && !m.readAt && !isOwn;
        const visible = m.status === "active" && !isMaskedBurn;

        return {
          id: m.id,
          roomId: m.roomId,
          userId: m.userId,
          status: m.status,
          burnAfterRead: m.burnAfterRead,
          createdAt: m.createdAt,
          expiresAt: m.expiresAt,
          readAt: m.readAt,
          chatName: m.chatName,
          content: visible ? m.content : null,
          masked: m.status === "active" && isMaskedBurn,
        };
      });
    return NextResponse.json({ messages: result, nextCursor });
  },
);

export const POST = withLogging<{ roomId: string }>(
  "messages.create",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> },
  ) => {
    if (!isSameOrigin(req)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
    }
    if (isBodyTooLarge(req)) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    const { roomId } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await requireMembership(session.user.id, roomId))) {
      return NextResponse.json(
        { error: "Not a member of this room" },
        { status: 403 },
      );
    }

    const rate = checkMessageRateLimit(session.user.id, roomId);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many messages - slow down man!" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
          },
        },
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createMsgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { clientMessageId, content, ttlSeconds, burnAfterRead } = parsed.data;
    const expiresAt = computeExpiresAt(ttlSeconds);

    const [inserted] = await db
      .insert(messages)
      .values({
        id: clientMessageId,
        roomId,
        userId: session.user.id,
        content,
        burnAfterRead,
        expiresAt,
      })
      .onConflictDoNothing({ target: messages.id })
      .returning();
    let message = inserted;
    let wasDuplicate = false;

    if (!message) {
      wasDuplicate = true;
      const [existing] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, clientMessageId))
        .limit(1);
      if (!existing) {
        return NextResponse.json(
          { error: "Could not create message" },
          { status: 500 },
        );
      }
      message = existing;
    }
    if (!wasDuplicate) {
      const io = getIO();
      console.log(
        "[messages:create] getIO() returned:",
        io ? "a live Server instance" : "null",
      );
      if (io) {
        io.to(roomId).emit("message:new", {
          id: message.id,
          roomId,
          userId: session.user.id,
          chatName: session.user.chatName,
          content: message.content,
          burnAfterRead: message.burnAfterRead,
          status: message.status,
          createdAt: message.createdAt,
          expiresAt: message.expiresAt,
        });
        console.log("[messages:create] emitted message:new to room", roomId);
      } else {
        console.warn(
          "[messages:create] SKIPPED emit — io was null, live update will not happen for this message",
        );
      }
    }

    return NextResponse.json(
      { message, wasDuplicate },
      { status: wasDuplicate ? 200 : 201 },
    );
  },
);
