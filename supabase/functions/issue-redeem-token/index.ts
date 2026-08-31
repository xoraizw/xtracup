// Issues a short-lived signed token for a customer's active pass, embedded
// in the QR code they show at checkout. Signed with HMAC-SHA256 using a
// server-only secret so it can't be forged client-side, and time-boxed so a
// screenshot of the QR stops working after ~35 seconds.
import { adminClient, userClient, jsonResponse, corsHeaders, callerUserId } from '../_shared/client.ts';

const TOKEN_TTL_SECONDS = 35;

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const supabase = userClient(authHeader);
  const callerId = await callerUserId(authHeader);
  if (!callerId) return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);

  const { pass_id } = await req.json();
  if (!pass_id) return jsonResponse({ ok: false, message: 'pass_id required' }, 400);

  const { data: pass, error: passError } = await supabase
    .from('passes')
    .select('id, user_id, status, expires_at')
    .eq('id', pass_id)
    .maybeSingle();

  if (passError || !pass) return jsonResponse({ ok: false, message: 'Pass not found' }, 404);
  if (pass.user_id !== callerId) return jsonResponse({ ok: false, message: 'Forbidden' }, 403);

  if (pass.status === 'active' && pass.expires_at && new Date(pass.expires_at) < new Date()) {
    await adminClient().from('passes').update({ status: 'expired' }).eq('id', pass_id);
    return jsonResponse({ ok: false, message: 'This pass has expired' }, 400);
  }

  if (pass.status !== 'active') return jsonResponse({ ok: false, message: 'Pass is not active' }, 400);

  const secret = Deno.env.get('REDEEM_TOKEN_SECRET');
  if (!secret) return jsonResponse({ ok: false, message: 'Server misconfigured' }, 500);

  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${pass_id}.${expiresAt}`;
  const signature = await sign(payload, secret);
  const token = `${expiresAt}.${signature}`;

  return jsonResponse({ ok: true, token });
});
