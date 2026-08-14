import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { Server, type Socket } from "socket.io";
import { authenticateSocket, SocketUser } from "./lib/socket-auth";
import { randomUUID } from "crypto";
import { db } from "./db";
import { roomMembers } from "./db/schema";
import { and, eq } from "drizzle-orm";
import { setIO } from "./lib/socket-server";
import cron from "node-cron";
import { sweepExpiredMessages } from "./cron/expireMessages";
import { cleanStaleRateLimitBuckets } from "./lib/rate-limit";

const dev = process.env.NODE_ENV !== "production";

const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({ event, ts: new Date().toISOString(), ...fields }),
  );
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedURL = parse(req.url ?? "/", true);
    handle(req, res, parsedURL);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });
  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      if (!user) {
        return next(new Error("unauthorized"));
      }
      socket.data.user = user;
      socket.data.correlationId = randomUUID();
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    const correlationId = socket.data.correlationId as string;
    log("socket:connect", { userId: user.id, correlationId });

    socket.on(
      "room:join",
      async (
        roomId: string,
        ack?: (res: { ok: boolean; error?: string }) => void,
      ) => {
        if (typeof roomId !== "string" || !roomId) {
          ack?.({ ok: false, error: "invalid roomId" });
          return;
        }
        try {
          const [membership] = await db
            .select()
            .from(roomMembers)
            .where(
              and(
                eq(roomMembers.userId, user.id),
                eq(roomMembers.roomId, roomId),
              ),
            )
            .limit(1);
          if (!membership) {
            log("room:join:denied", { userId: user.id, roomId, correlationId });
            ack?.({ ok: false, error: "not a member of this room" });
            return;
          }

          socket.join(roomId);
          log("room:join", { userId: user.id, roomId, correlationId });
          ack?.({ ok: true });

          socket.to(roomId).emit("room:presence", {
            userId: user.id,
            chatName: user.chatName,
            joined: true,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          log("room:join:error", {
            userId: user.id,
            roomId,
            correlationId,
            error: message,
          });
          ack?.({ ok: false, error: "server error joining room" });
        }
      },
    );

    socket.on("room:leave", (roomId: string) => {
      socket.leave(roomId);
      log("room:leave", { userId: user.id, roomId, correlationId });
      socket.to(roomId).emit("room:presence", {
        userId: user.id,
        chatName: user.chatName,
        joined: false,
      });
    });
    socket.on("disconnect", (reason) => {
      log("socket:disconnect", { userId: user.id, correlationId, reason });
    });
  });
  httpServer.listen(port, () => {
    log("server:ready", { port });
  });
  setIO(io);
  console.log(
    "[server] setIO() called — io is now available to API routes in this process",
  );
  cron.schedule("*/30 * * * * *", () => {
    sweepExpiredMessages(io).catch((err) => {
      log("expiry:sweep:error", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });
  cron.schedule("*/5 * * * *", () => {
    cleanStaleRateLimitBuckets();
  });
});
