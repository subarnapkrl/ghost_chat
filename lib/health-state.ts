declare global {
  //eslint-disable-next-line no-var
  var __ghostchat_lastSweepAt: number | undefined;
}

export function markSweepRan(): void {
  globalThis.__ghostchat_lastSweepAt = Date.now();
}

export function getLastSweepAt(): number | null {
  return globalThis.__ghostchat_lastSweepAt ?? null;
}
