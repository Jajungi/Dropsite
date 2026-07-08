const LOCAL_PREFIXES = [
  'att-',
  'pt-',
  'match-',
  'clean-',
  'net-',
  'cock-',
  'lq-',
  'fr-',
  'ca-',
  'room-',
  'log-',
];

export function isLocalId(id: string): boolean {
  return LOCAL_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/** 원격 insert 후 uuid 로 치환될 때까지 짧게 대기 */
export async function resolveRemoteId(
  getId: () => string,
  options?: { maxMs?: number; intervalMs?: number }
): Promise<string> {
  const maxMs = options?.maxMs ?? 8000;
  const intervalMs = options?.intervalMs ?? 150;
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const id = getId();
    if (!isLocalId(id)) return id;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return getId();
}

/** 로컬 임시 id 가 서버 uuid 로 바뀐 뒤 원격 작업 실행 */
export function runWhenRemoteId(
  getId: () => string,
  fn: (remoteId: string) => void | Promise<void>
): void {
  void (async () => {
    const id = await resolveRemoteId(getId);
    if (isLocalId(id)) {
      console.warn('[sync] remote id not ready:', getId());
      return;
    }
    try {
      await fn(id);
    } catch (err) {
      console.warn('[sync] remote action failed', err);
    }
  })();
}
