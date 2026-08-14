import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { registerSchema } from "../../../../lib/validation/auth";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { hashPassword } from "../../../../lib/password";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password, chatName } = parsed.data;

  const existing = await db
    .select({ id: users.id, email: users.email, chatName: users.chatName })
    .from(users)
    .where(or(eq(users.email, email), eq(users.chatName, chatName)));

  const emailTaken = existing.some((u) => u.email === email);
  const chatNameTaken = existing.some((u) => u.chatName === chatName);

  if (emailTaken || chatNameTaken) {
    return NextResponse.json(
      {
        error: "Account already exists",
        issues: {
          email: emailTaken ? "Email is already taken" : undefined,
          chatName: chatNameTaken ? "ChatName is already taken" : undefined,
        },
      },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, chatName })
    .returning({ id: users.id, email: users.email, chatName: users.chatName });
  return NextResponse.json({ user }, { status: 201 });
}
