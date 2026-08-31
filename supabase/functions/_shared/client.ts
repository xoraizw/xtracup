import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'https://deno.land/x/jose@v5.9.6/index.ts';

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

export function userClient(authHeader: string | null) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader ?? '' } },
    }
  );
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Edge Functions are deployed with verify_jwt=false — Supabase's gateway
// JWT check only understands Supabase-native tokens, not third-party
// RS256/JWKS providers like Clerk (returns UNAUTHORIZED_ASYMMETRIC_JWT
// otherwise; see github.com/orgs/supabase/discussions/34988). That means
// this function is the ONLY place Clerk's signature gets checked — every
// admin-privileged function (redeem, confirm-payment, join-staff,
// owner-metrics) trusts whatever this returns, so a decode-only version
// would let a forged Authorization header impersonate any user.
const jwks = createRemoteJWKSet(
  new URL(`https://${Deno.env.get('CLERK_DOMAIN')}/.well-known/jwks.json`)
);

export async function callerUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, jwks);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
