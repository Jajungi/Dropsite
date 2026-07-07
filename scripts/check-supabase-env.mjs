import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');

if (!existsSync(envPath)) {
  console.error('FAIL: .env 파일이 없습니다. .env.example 을 복사해 만드세요.');
  process.exit(1);
}

const raw = readFileSync(envPath, 'utf8');
const url = raw.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim() ?? '';
const key = raw.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim() ?? '';

const problems = [];

if (!url || url.includes('붙여넣기') || !url.includes('supabase.co')) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL 이 비어있거나 placeholder 입니다.');
}
if (!key || key.includes('붙여넣기') || key.length < 20) {
  problems.push('EXPO_PUBLIC_SUPABASE_ANON_KEY 가 비어있거나 placeholder 입니다.');
}

if (problems.length) {
  console.error('FAIL: Supabase env 설정이 필요합니다.\n');
  problems.forEach((p) => console.error(`  - ${p}`));
  console.error('\n→ Supabase Dashboard → Project Settings → API 에서 복사');
  console.error('→ docs/SETUP_NOW.md 참고');
  process.exit(1);
}

console.log('OK: Supabase env looks valid');
console.log(`  URL: ${url}`);
