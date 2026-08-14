export function isSameOrigin(req: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const origin = req.headers.get("origin");
  if (origin) return origin === expected;

  const referer = req.headers.get("referer");
  if (!referer) return false;

  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}
