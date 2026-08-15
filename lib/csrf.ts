export function isSameOrigin(req: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const origin = req.headers.get("origin");
  if (origin) {
    const matches = origin === expected;
    if (!matches) {
      console.warn(
        JSON.stringify({
          event: "csrf:origin_mismatch",
          receivedOrigin: origin,
          expectedOrigin: expected,
          ts: new Date().toISOString(),
        }),
      );
    }
    return matches;
  }

  const referer = req.headers.get("referer");
  if (!referer) return false;

  try {
    const refererOrigin = new URL(referer).origin;
    const matches = refererOrigin === expected;
    if (!matches) {
      console.warn(
        JSON.stringify({
          event: "csrf:referer_mismatch",
          receivedRefererOrigin: refererOrigin,
          expectedOrigin: expected,
          ts: new Date().toISOString(),
        }),
      );
    }
    return matches;
  } catch {
    return false;
  }
}
