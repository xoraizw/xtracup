// Staff-invoked: marks a pending pass as active after manually verifying the
// customer's JazzCash/Easypaisa payment reference. See playbook Section 3 —
// pilot doesn't integrate a live payment API, staff confirm manually.
import { adminClient, jsonResponse, corsHeaders, callerUserId } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const callerId = await callerUserId(authHeader);
  if (!callerId) return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);

  const admin = adminClient();

  const { data: staffProfile } = await admin
    .from('users')
    .select('id, role, branch_id, branches(cafe_id)')
    .eq('id', callerId)
    .maybeSingle();

  const staffCafeId = (staffProfile as any)?.branches?.cafe_id as string | undefined;

  if (!staffProfile || staffProfile.role !== 'staff' || !staffProfile.branch_id || !staffCafeId) {
    return jsonResponse({ ok: false, message: 'Staff access required' }, 403);
  }

  const { pass_id } = await req.json();
  if (!pass_id) return jsonResponse({ ok: false, message: 'pass_id required' }, 400);

  const { data: pass } = await admin
    .from('passes')
    .select('id, cafe_id, status, pass_tier_id')
    .eq('id', pass_id)
    .maybeSingle();

  if (!pass) return jsonResponse({ ok: false, message: 'Pass not found' }, 404);
  if (pass.cafe_id !== staffCafeId) return jsonResponse({ ok: false, message: 'Pass is for a different cafe' }, 403);
  if (pass.status !== 'pending') return jsonResponse({ ok: false, message: 'Pass is not pending' }, 400);

  // Validity window comes from the purchased tier — falls back to 30 days
  // if the pass has no tier on record (shouldn't happen post-migration, but
  // keeps this function from erroring on stale data).
  let validityDays = 30;
  if (pass.pass_tier_id) {
    const { data: tier } = await admin
      .from('pass_tiers')
      .select('validity_days')
      .eq('id', pass.pass_tier_id)
      .maybeSingle();
    if (tier?.validity_days) validityDays = tier.validity_days;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const { error } = await admin
    .from('passes')
    .update({ status: 'active', confirmed_at: new Date().toISOString(), expires_at: expiresAt.toISOString() })
    .eq('id', pass_id);

  if (error) return jsonResponse({ ok: false, message: 'Could not confirm payment' }, 500);

  return jsonResponse({ ok: true });
});
