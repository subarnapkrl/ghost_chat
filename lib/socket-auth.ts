import type { Socket } from "socket.io";
import { getToken } from "next-auth/jwt";

export interface SocketUser {
  id: string;
  chatName: string;
}

export async function authenticateSocket(
  socket: Socket,
): Promise<SocketUser | null> {
  const req = socket.request as never;
  const cookieHeader = (socket.request as { headers?: Record<string, string> })
    .headers?.cookie;
  console.log("[socket-auth] handshake cookie header present:", !!cookieHeader);
  console.log("[socket-auth] AUTH_SECRET set:", !!process.env.AUTH_SECRET);

  let token;
  try {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
  } catch (err) {
    console.error("[socket-auth] getToken() threw:", err);
    return null;
  }

  console.log(
    "[socket-auth] token decoded:",
    token ? { id: token.id, chatName: token.chatName } : null,
  );

  if (!token?.id || !token?.chatName) return null;

  return { id: token.id as string, chatName: token.chatName as string };
}
