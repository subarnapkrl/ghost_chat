import type { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      chatName: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    chatName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    chatName: string;
  }
}
