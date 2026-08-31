// Validates a per-branch invite code and grants the calling user staff
// access to that branch. Runs entirely on the service role so it can set
// role/branch_id on the users row — the client-side RLS policies
// deliberately forbid a direct client insert/update from ever setting
// role='staff' (see 0003_staff_invite.sql), so this is the only path to
// becoming staff. A brand can reuse the same invite_code across several of
// its branches if it wants one code covering multiple locations — this
// function doesn't care, it just matches whichever branch row has the code.
import { adminClient, jsonResponse, corsHeaders, callerUserId } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const callerId = await callerUserId(authHeader);
  if (!callerId) return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);

  const { invite_code, name, email } = await req.json();
  if (!invite_code) return jsonResponse({ ok: false, message: 'invite_code required' }, 400);

  const admin = adminClient();

  const { data: branch } = await admin
    .from('branches')
    .select('id, name, cafe_id, cafes(name)')
    .eq('invite_code', invite_code)
    .maybeSingle();

  if (!branch) return jsonResponse({ ok: false, message: 'Invalid invite code' }, 404);

  const { data: existing } = await admin
    .from('users')
    .select('id, role, branch_id')
    .eq('id', callerId)
    .maybeSingle();

  if (existing?.role === 'staff') {
    return jsonResponse({ ok: false, message: 'Already a staff member' }, 400);
  }

  if (existing) {
    const { error } = await admin
      .from('users')
      .update({ role: 'staff', branch_id: branch.id })
      .eq('id', callerId);
    if (error) return jsonResponse({ ok: false, message: 'Could not join as staff' }, 500);
  } else {
    if (!name || !email) {
      return jsonResponse({ ok: false, message: 'name and email required for new accounts' }, 400);
    }
    const { error } = await admin.from('users').insert({
      id: callerId,
      phone: email,
      name,
      role: 'staff',
      branch_id: branch.id,
    });
    if (error) return jsonResponse({ ok: false, message: 'Could not create staff account' }, 500);
  }

  const cafeName = (branch as any).cafes?.name ?? branch.name;
  return jsonResponse({ ok: true, cafe_name: cafeName, branch_name: branch.name });
});
