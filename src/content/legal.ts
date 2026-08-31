// Placeholder legal content for the pilot. Not reviewed by counsel — replace
// before any real launch. Kept as plain text blocks (not markdown) so the
// same content renders identically in the acceptance gate and the
// standalone viewer without a markdown dependency.

export type LegalDoc = {
  key: 'terms' | 'refund' | 'privacy';
  title: string;
  updatedLabel: string;
  body: string;
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    key: 'terms',
    title: 'Terms of Service',
    updatedLabel: 'Draft — pilot placeholder',
    body: `This is placeholder text for XtraCup's Terms of Service, used during the pilot period. Real terms will replace this before public launch.

1. What you're buying
A Brand Pass is a prepaid, fixed quantity of cups redeemable only at the café that issued it. Buying a pass does not create a subscription or recurring charge.

2. Redemption
Each redemption debits one cup from your pass balance. Redemption requires showing a valid QR code to café staff at the time of purchase; balances are not transferable between customers.

3. Expiry
Passes expire a fixed number of days after activation (shown on your pass). Cups remaining on an expired pass are forfeited unless the café decides otherwise at its own discretion.

4. Account
You are responsible for keeping your sign-in access secure. XtraCup is not liable for redemptions made by someone who gains access to your account.

5. Changes
This pilot version of the terms may change without notice while the product is being tested. You'll be asked to accept updated terms if they materially change.`,
  },
  {
    key: 'refund',
    title: 'Refund Policy',
    updatedLabel: 'Draft — pilot placeholder',
    body: `This is placeholder text for XtraCup's Refund Policy, used during the pilot period.

1. Before activation
If your payment hasn't been confirmed by café staff yet, you may request a refund by contacting the café directly. Once confirmed, the pass is considered activated.

2. After activation
Passes are non-refundable once activated, except where required by law or at the issuing café's discretion (for example, a documented service failure).

3. Unused cups
Cups remaining on an expired or otherwise inactive pass are not eligible for cash refund. Cafés may offer goodwill extensions at their discretion — this is not guaranteed.

4. Disputes
If you believe a redemption was made in error (for example, a double-scan), contact the café with your redemption timestamp. Café staff can review the redemption log for your pass.`,
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    updatedLabel: 'Draft — pilot placeholder',
    body: `This is placeholder text for XtraCup's Privacy Policy, used during the pilot period.

1. What we collect
Your email address, name, and purchase/redemption history. If you become café staff or an owner, your account role and associated café are also recorded.

2. How it's used
To operate your pass balance, let café staff confirm payments and redemptions, and let café owners see pilot-level metrics (aggregated, not per-customer identity beyond what's needed to run the café).

3. Where it's stored
Authentication is handled by Clerk. Pass, redemption, and profile data is stored in a Supabase-hosted database. Neither service is used for advertising or sold to third parties.

4. Your choices
You can request a copy of your data or ask for your account to be deleted by contacting the café or XtraCup directly — this pilot doesn't yet have a self-service export/delete flow in the app.`,
  },
];
