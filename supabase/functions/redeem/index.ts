// Staff-invoked: verifies the signed QR token, confirms the pass belongs to
// the staff member's own cafe BRAND (a pass is brand-wide, redeemable at any
// of that brand's branches — see 0007_brand_branch_split.sql), then
// atomically decrements cups_remaining and logs the redemption against the
// specific branch that scanned it. All balance mutation happens here
// (service role), never via a direct client update, so a modified client
// can't redeem without a valid signed token.
import { adminClient, jsonResponse, corsHeaders, callerUserId } from '../_shared/client.ts';

async function verify(pass_id: string, token: string, secret: string) {
  const [expiresAtStr, signature] = token.split('.');
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !signature) return false;
  if (Math.floor(Date.now() / 1000) > expiresAt) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = `${pass_id}.${expiresAt}`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expectedSignature === signature;
}

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

  const { pass_id, token, preview } = await req.json();
  if (!pass_id || !token) return jsonResponse({ ok: false, message: 'pass_id and token required' }, 400);

  const secret = Deno.env.get('REDEEM_TOKEN_SECRET');
  if (!secret) return jsonResponse({ ok: false, message: 'Server misconfigured' }, 500);

  const validToken = await verify(pass_id, token, secret);
  if (!validToken) return jsonResponse({ ok: false, message: 'Code expired — ask customer to refresh' }, 400);

  const { data: pass } = await admin
    .from('passes')
    .select('id, cafe_id, status, cups_remaining, user_id, expires_at, pass_tier_id')
    .eq('id', pass_id)
    .maybeSingle();

  if (!pass) return jsonResponse({ ok: false, message: 'Pass not found' }, 404);
  if (pass.cafe_id !== staffCafeId) return jsonResponse({ ok: false, message: 'Pass is for a different cafe' }, 403);

  // Lazily transition an expired pass on first touch rather than running a
  // cron job — nothing reads passes.status except through this or the
  // customer-facing screens, both of which can apply this same check.
  if (pass.status === 'active' && pass.expires_at && new Date(pass.expires_at) < new Date()) {
    await admin.from('passes').update({ status: 'expired' }).eq('id', pass_id);
    return jsonResponse({ ok: false, message: 'This pass has expired' }, 400);
  }

  if (pass.status !== 'active') return jsonResponse({ ok: false, message: 'Pass is not active' }, 400);
  if (pass.cups_remaining <= 0) return jsonResponse({ ok: false, message: 'No cups remaining on this pass' }, 400);

  // Visit-based redemption limits, set per tier (see
  // 0012_visit_based_redemption_rules.sql). Redemptions on this pass within
  // visit_window_minutes of the CURRENT visit's first redemption count as
  // the same visit, capped at max_cups_per_visit; once that window has
  // passed, a new visit can't start until cooldown_hours have elapsed since
  // the previous visit's first redemption. Refunded redemptions are
  // excluded throughout so an undone mis-scan doesn't count against either
  // limit.
  if (pass.pass_tier_id) {
    const { data: tier } = await admin
      .from('pass_tiers')
      .select('visit_window_minutes, max_cups_per_visit, cooldown_hours')
      .eq('id', pass.pass_tier_id)
      .maybeSingle();

    if (tier && (tier.visit_window_minutes > 0 || tier.cooldown_hours > 0)) {
      const { data: recentRedemptions } = await admin
        .from('redemptions')
        .select('redeemed_at')
        .eq('pass_id', pass_id)
        .is('refunded_at', null)
        .order('redeemed_at', { ascending: false })
        .limit(50);

      const mostRecent = recentRedemptions?.[0];
      const withinCurrentVisit =
        mostRecent && tier.visit_window_minutes > 0
          ? (Date.now() - new Date(mostRecent.redeemed_at).getTime()) / 60000 <= tier.visit_window_minutes
          : false;

      if (withinCurrentVisit) {
        // Still inside the visit window — find when this visit started by
        // walking back through consecutive redemptions each within
        // visit_window_minutes of the next, then enforce the per-visit cap.
        let visitStart = new Date(mostRecent!.redeemed_at).getTime();
        let visitCount = 1;
        for (let i = 1; i < (recentRedemptions?.length ?? 0); i++) {
          const prev = new Date(recentRedemptions![i - 1].redeemed_at).getTime();
          const cur = new Date(recentRedemptions![i].redeemed_at).getTime();
          if ((prev - cur) / 60000 > tier.visit_window_minutes) break;
          visitStart = cur;
          visitCount++;
        }
        if (visitCount >= tier.max_cups_per_visit) {
          return jsonResponse(
            { ok: false, message: `Visit limit reached (max ${tier.max_cups_per_visit} cup${tier.max_cups_per_visit === 1 ? '' : 's'} per visit)` },
            400
          );
        }
      } else if (mostRecent && tier.cooldown_hours > 0) {
        // Starting a new visit — enforce the cooldown since the previous
        // visit's first redemption (found the same way as above).
        let visitStart = new Date(mostRecent.redeemed_at).getTime();
        for (let i = 1; i < (recentRedemptions?.length ?? 0); i++) {
          const prev = new Date(recentRedemptions![i - 1].redeemed_at).getTime();
          const cur = new Date(recentRedemptions![i].redeemed_at).getTime();
          if ((prev - cur) / 60000 > tier.visit_window_minutes) break;
          visitStart = cur;
        }
        const elapsedHours = (Date.now() - visitStart) / 3600000;
        if (elapsedHours < tier.cooldown_hours) {
          const waitHours = tier.cooldown_hours - elapsedHours;
          const waitLabel =
            waitHours < 1 ? `${Math.ceil(waitHours * 60)} minutes` : `${Math.ceil(waitHours * 10) / 10} hours`;
          return jsonResponse({ ok: false, message: `Come back in ${waitLabel}` }, 400);
        }
      }
    }
  }

  // Preview mode: token/pass are validated above but nothing is mutated —
  // lets staff confirm who they're about to redeem for before committing.
  if (preview) {
    const { data: previewCustomer } = await admin
      .from('users')
      .select('name, phone')
      .eq('id', pass.user_id)
      .maybeSingle();
    return jsonResponse({
      ok: true,
      preview: true,
      cups_remaining: pass.cups_remaining,
      customer_name: previewCustomer?.name || previewCustomer?.phone || 'Customer',
    });
  }

  const cupsBefore = pass.cups_remaining;
  const cupsAfter = cupsBefore - 1;
  const newStatus = cupsAfter === 0 ? 'depleted' : 'active';

  const { error: updateError } = await admin
    .from('passes')
    .update({ cups_remaining: cupsAfter, status: newStatus })
    .eq('id', pass_id)
    .eq('cups_remaining', cupsBefore); // optimistic lock: fails if another redemption raced in first

  if (updateError) return jsonResponse({ ok: false, message: 'Redemption failed, try again' }, 409);

  await admin.from('redemptions').insert({
    pass_id,
    staff_user_id: staffProfile.id,
    branch_id: staffProfile.branch_id,
    cups_before: cupsBefore,
    cups_after: cupsAfter,
  });

  const { data: customer } = await admin
    .from('users')
    .select('name, phone')
    .eq('id', pass.user_id)
    .maybeSingle();

  return jsonResponse({
    ok: true,
    cups_remaining: cupsAfter,
    customer_name: customer?.name || customer?.phone || 'Customer',
  });
});
