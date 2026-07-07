/** .env에 실제 Supabase 값이 들어갔는지 확인 */
export function isSupabaseEnvConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) return false;
  if (!url.includes('supabase.co')) return false;
  if (url.includes('붙여넣기') || key.includes('붙여넣기')) return false;
  if (key.length < 20) return false;

  return true;
}

export function getSupabaseSetupHint(): string {
  return 'Project Settings → API에서 URL·anon key를 .env에 넣고 npx expo start -c 로 재시작하세요.';
}
