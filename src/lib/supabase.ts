import 'react-native-url-polyfill/auto';
import { createClient, FunctionsFetchError, FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env file.'
  );
}

// Clerk owns the session, not Supabase Auth — every request's identity comes
// from accessToken() below, which the caller wires to Clerk's
// session.getToken(). Configure Clerk as a third-party auth provider in
// Supabase Dashboard > Authentication > Sign In / Providers (see README);
// RLS policies then read auth.jwt()->>'sub' for the Clerk user id.
export function createSupabaseClient(getToken: () => Promise<string | null>): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: getToken,
  });
}

export type FunctionResult<T = any> = { ok: true; message?: string } & T;

// supabase-js's functions.invoke() does NOT parse the response body into
// `data` when the function returns a non-2xx status — `data` is null and
// `error` is a FunctionsHttpError whose .message is just the generic
// "Edge Function returned a non-2x status code", not whatever the function
// actually sent back in its own { ok: false, message } JSON body. Every one
// of our functions returns that shape on failure, so unwrap it here once
// instead of re-parsing error.context in every call site.
export async function invokeFunction<T = any>(
  supabase: SupabaseClient,
  name: string,
  body: Record<string, unknown>
): Promise<{ data: FunctionResult<T> | null; message: string | null; transient: boolean }> {
  let data, error;
  try {
    ({ data, error } = await supabase.functions.invoke(name, { body }));
  } catch {
    // Network-level throw before a response was ever received.
    return { data: null, message: 'Connection problem — check your network and try again.', transient: true };
  }
  if (!error) return { data, message: null, transient: false };

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return { data: null, message: body?.message ?? error.message, transient: false };
    } catch {
      return { data: null, message: error.message, transient: false };
    }
  }
  // FunctionsFetchError / FunctionsRelayError: the request never got a
  // real response from our function — worth retrying, unlike a business
  // rejection which returns a real (non-2xx) response with a message.
  const transient = error instanceof FunctionsFetchError || error.name === 'FunctionsRelayError';
  return { data: null, message: error.message, transient };
}

// Resolves a staff member's brand (cafe_id) from their already-known
// branch_id (from useAuth()'s profile, which AppHeader already proves loads
// correctly) via one plain, explicitly-filtered query. Deliberately avoids
// two things that both turned out to throw "Cannot coerce the result to a
// single JSON object" here despite correct underlying data: PostgREST's
// embedded-resource syntax (`branches(cafe_id)` nested in a select), and an
// unfiltered `.single()` relying purely on RLS to scope to one row.
export async function resolveCafeIdForBranch(
  supabase: SupabaseClient,
  branchId: string
): Promise<{ cafeId: string | null; error: string | null }> {
  const { data: branch, error } = await supabase
    .from('branches')
    .select('cafe_id')
    .eq('id', branchId)
    .maybeSingle();
  if (error) return { cafeId: null, error: error.message };
  return { cafeId: branch?.cafe_id ?? null, error: null };
}
