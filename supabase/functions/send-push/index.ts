// Supabase Edge Function: send-push
// notifications 테이블 insert 시(트리거/웹훅) 호출되어, 해당 유저의
// Expo 푸시 토큰들로 원격 푸시를 발송한다.
//
// 배포:
//   supabase functions deploy send-push
// 시크릿(선택, Expo 푸시 보안 강화 시):
//   supabase secrets set EXPO_ACCESS_TOKEN=xxxx
//
// 이 함수는 service_role 키로 DB에 접근하므로 트리거/웹훅에서만 호출하세요.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN'); // optional

interface Payload {
  user_id?: string;
  title?: string;
  message?: string;
  kind?: string;
  // Database Webhook 형식 지원
  record?: { user_id?: string; title?: string; message?: string; kind?: string };
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json()) as Payload;
    const rec = body.record ?? body;
    const userId = rec.user_id;
    const title = rec.title ?? '알림';
    const message = rec.message ?? '';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id 없음' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title,
      body: message,
      priority: 'high',
      channelId: rec.kind === 'coach' ? 'coach' : 'default',
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });
    const result = await expoRes.json();

    return new Response(JSON.stringify({ sent: messages.length, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
