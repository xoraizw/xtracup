// Staff/Owner shells and their entry points, gated behind a single flag so
// they can be pulled again with one change if needed. Signed-out visitors
// always land in the customer-facing GuestTabs regardless of this flag —
// it only affects which shell a *signed-in* account routes to, based on
// profile.role (see SignedInNavigator in App.tsx).
export const STAFF_OWNER_POV_ENABLED = true;
