const url = 'https://xndodghcmedkkaurbnab.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZG9kZ2hjbWVka2thdXJibmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTk4MjksImV4cCI6MjA5ODk3NTgyOX0.eL1KLAWTlFJOUNAcgmk96juXIWyvzMpwkVdCfWfvJWo';

async function test() {
  const anonRes = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({}),
  });
  console.log('anonymous signup status', anonRes.status);
  const anonText = await anonRes.text();
  console.log('anonymous signup body', anonText.slice(0, 800));

  let accessToken = null;
  try {
    const parsed = JSON.parse(anonText);
    accessToken = parsed.access_token;
  } catch {
    /* ignore */
  }

  if (!accessToken) return;

  const rpcRes = await fetch(`${url}/rest/v1/rpc/rpc_setup_guest_profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ p_name: '테스트' }),
  });
  console.log('rpc status', rpcRes.status);
  console.log('rpc body', (await rpcRes.text()).slice(0, 800));
}

test().catch(console.error);
