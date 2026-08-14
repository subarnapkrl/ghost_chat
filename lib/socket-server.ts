import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __ghostchat_io: Server | undefined;
}

export function setIO(io: Server) {
  globalThis.__ghostchat_io = io;
}
export function getIO(): Server | null {
  return globalThis.__ghostchat_io ?? null;
}
