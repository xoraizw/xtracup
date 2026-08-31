// Invoked by owner (any cafe, or all cafes aggregated) or staff (their own
// cafe brand only, across all its branches) — aggregates redemption rate,
// revenue, and new-vs-repeat customer split over a window (default 30
// days). Done server-side with the service role because it reads across
// all customers' passes/redemptions for a cafe, which RLS deliberately
// doesn't let a single session do directly — and for the owner's
// all-cafes view, across cafes too.
import { adminClient, jsonResponse, corsHeaders, callerUserId } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const callerId = await callerUserId(authHeader);
  if (!callerId) return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);

  const admin = adminClient();

  const { data: caller } = await admin
    .from('users')
    .select('id, role, branch_id, branches(cafe_id)')
    .eq('id', callerId)
    .maybeSingle();

  if (!caller || (caller.role !== 'owner' && caller.role !== 'staff')) {
    return jsonResponse({ ok: false, message: 'Owner or staff access required' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const windowDays = typeof body.days === 'number' && body.days > 0 ? body.days : 30;

  // Staff is always scoped to their own cafe brand (across all its
  // branches — a pass is brand-wide). Owner may pass cafe_id to drill into
  // one cafe, or omit it for a platform-wide aggregate.
  let cafeIds: string[] | null = null;
  if (caller.role === 'staff') {
    const staffCafeId = (caller as any).branches?.cafe_id as string | undefined;
    if (!staffCafeId) return jsonResponse({ ok: false, message: 'No cafe assigned' }, 400);
    cafeIds = [staffCafeId];
  } else if (body.cafe_id) {
    cafeIds = [body.cafe_id];
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);
  const windowStartIso = windowStart.toISOString();

  let passesQuery = admin
    .from('passes')
    .select('id, user_id, cafe_id, cups_total, status, confirmed_at, purchased_at, pass_tier_id')
    .gte('purchased_at', windowStartIso);
  let redemptionsQuery = admin
    .from('redemptions')
    .select('id, pass_id, redeemed_at, passes!inner(cafe_id)')
    .gte('redeemed_at', windowStartIso)
    .is('refunded_at', null); // a refunded cup wasn't really consumed — exclude from redemption stats
  let allPassesQuery = admin.from('passes').select('user_id, cafe_id, purchased_at');

  if (cafeIds) {
    passesQuery = passesQuery.in('cafe_id', cafeIds);
    redemptionsQuery = redemptionsQuery.in('passes.cafe_id', cafeIds);
    allPassesQuery = allPassesQuery.in('cafe_id', cafeIds);
  }

  const [{ data: passesInWindow }, { data: redemptionsInWindow }, { data: allPasses }] =
    await Promise.all([passesQuery, redemptionsQuery, allPassesQuery]);

  // Revenue/cups-sold come from the tier actually purchased (passes.
  // pass_tier_id), not the cafe's current pricing — so a pass bought under
  // an old tier price stays correctly accounted for historically even if
  // that tier was later repriced or deactivated.
  const tierIds = [...new Set((passesInWindow ?? []).map((p) => p.pass_tier_id).filter(Boolean))];
  const { data: tiers } =
    tierIds.length > 0
      ? await admin.from('pass_tiers').select('id, price_pkr, cups').in('id', tierIds)
      : { data: [] as { id: string; price_pkr: number; cups: number }[] };
  const tierById = new Map((tiers ?? []).map((t) => [t.id, t]));

  const confirmedPasses = (passesInWindow ?? []).filter((p) => p.status !== 'pending' && p.status !== 'rejected');
  const passesSold = confirmedPasses.length;
  let cupsSold = 0;
  let revenuePkr = 0;
  for (const p of confirmedPasses) {
    const tier = p.pass_tier_id ? tierById.get(p.pass_tier_id) : undefined;
    cupsSold += tier?.cups ?? p.cups_total ?? 0;
    revenuePkr += tier?.price_pkr ?? 0;
  }
  const cupsRedeemed = (redemptionsInWindow ?? []).length;
  const redemptionRatePct = cupsSold > 0 ? Math.round((cupsRedeemed / cupsSold) * 1000) / 10 : 0;

  // First-ever purchase date per user (within the selected cafe scope) —
  // determines whether a window purchase was that customer's first (new)
  // or not (repeat).
  const firstPurchaseByUser = new Map<string, string>();
  for (const p of allPasses ?? []) {
    if (!p.user_id || !p.purchased_at) continue;
    const existing = firstPurchaseByUser.get(p.user_id);
    if (!existing || p.purchased_at < existing) firstPurchaseByUser.set(p.user_id, p.purchased_at);
  }

  const customersInWindow = new Set(confirmedPasses.map((p) => p.user_id));
  let newCustomers = 0;
  let repeatCustomers = 0;
  for (const userId of customersInWindow) {
    const firstPurchase = firstPurchaseByUser.get(userId);
    if (firstPurchase && firstPurchase >= windowStartIso) newCustomers++;
    else repeatCustomers++;
  }

  return jsonResponse({
    ok: true,
    window_days: windowDays,
    scope: cafeIds ? 'single_cafe' : 'all_cafes',
    passes_sold: passesSold,
    cups_sold: cupsSold,
    cups_redeemed: cupsRedeemed,
    redemption_rate_pct: redemptionRatePct,
    revenue_pkr: revenuePkr,
    new_customers: newCustomers,
    repeat_customers: repeatCustomers,
  });
});
