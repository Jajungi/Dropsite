/** 로컬 전용 비밀번호 해시 (백엔드 연동 전 클라이언트 저장) */
const SALT = 'drop-dgist-badmin-v1';

export const DEFAULT_DEMO_PASSWORD = 'dgist1234';

export function hashPassword(password: string): string {
  const normalized = password.trim();
  let hash = 5381;
  const input = `${SALT}:${normalized}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return `v1_${(hash >>> 0).toString(36)}_${normalized.length}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

export function seedDemoCredentials(
  studentIds: string[],
  existing: Record<string, string> = {}
): Record<string, string> {
  const next = { ...existing };
  const demoHash = hashPassword(DEFAULT_DEMO_PASSWORD);
  studentIds.forEach((id) => {
    if (!next[id]) next[id] = demoHash;
  });
  return next;
}
