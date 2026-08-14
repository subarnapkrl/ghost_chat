export function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({ event, ts: new Date().toISOString(), ...fields }),
  );
}

export function getCorrelationId(req: Request): string {
  return req.headers.get("x-correlation-id") ?? crypto.randomUUID();
}
