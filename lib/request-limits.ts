export const MAX_BODY_BYTES = 10 * 1024;

export function isBodyTooLarge(req: Request): boolean {
  const len = req.headers.get("content-length");
  if (!len) return false;
  return Number(len) > MAX_BODY_BYTES;
}
