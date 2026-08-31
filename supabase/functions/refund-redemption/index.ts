// Staff-invoked: undoes a mis-scanned redemption — restores 1 cup to the
// pass (reactivating it if it had been depleted) and stamps the redemption
// row as refunded. Server-side for the same reason redeem's balance
// mutation is: a modified client shouldn't be able to grant itself cups.
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

  const { redemption_id } = await req.json();
  if (!redemption_id) return jsonResponse({ ok: false, message: 'redemption_id required' }, 400);

  const { data: redemption } = await admin
    .from('redemptions')
    .select('id, pass_id, refunded_at')
    .eq('id', redemption_id)
    .maybeSingle();

  if (!redemption) return jsonResponse({ ok: false, message: 'Redemption not found' }, 404);
  if (redemption.refunded_at) return jsonResponse({ ok: false, message: 'Already refunded' }, 400);

  const { data: pass } = await admin
    .from('passes')
    .select('id, cafe_id, cups_remaining, cups_total, status')
    .eq('id', redemption.pass_id)
    .maybeSingle();

  if (!pass) return jsonResponse({ ok: false, message: 'Pass not found' }, 404);
  if (pass.cafe_id !== staffCafeId) return jsonResponse({ ok: false, message: 'Pass is for a different cafe' }, 403);

  const cupsBefore = pass.cups_remaining;
  const cupsAfter = Math.min(cupsBefore + 1, pass.cups_total);
  // A refund only reactivates a depleted/expired pass — an already-active
  // pass, or one a customer let lapse for other reasons, stays as-is.
  const newStatus = pass.status === 'depleted' || pass.status === 'expired' ? 'active' : pass.status;

  const { error: passError } = await admin
    .from('passes')
    .update({ cups_remaining: cupsAfter, status: newStatus })
    .eq('id', pass.id)
    .eq('cups_remaining', cupsBefore); // optimistic lock

  if (passError) return jsonResponse({ ok: false, message: 'Refund failed, try again' }, 409);

  const { error: redemptionError } = await admin
    .from('redemptions')
    .update({ refunded_at: new Date().toISOString(), refunded_by: staffProfile.id })
    .eq('id', redemption_id)
    .is('refunded_at', null); // optimistic lock: fails if refunded concurrently

  if (redemptionError) {
    // Roll back the cup restore — the redemption itself won the race
    // (already refunded by someone else between our checks), so undo the
    // pass mutation we just made rather than double-crediting the cup.
    await admin.from('passes').update({ cups_remaining: cupsBefore, status: pass.status }).eq('id', pass.id);
    return jsonResponse({ ok: false, message: 'Refund failed, try again' }, 409);
  }

  return jsonResponse({ ok: true, cups_remaining: cupsAfter });
});
