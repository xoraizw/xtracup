export type UserRole = 'customer' | 'staff' | 'owner';
export type PassStatus = 'pending' | 'active' | 'expired' | 'depleted' | 'rejected';

// The customer-facing brand — photos, description, pass tiers, and a
// roster of branches. All pricing lives on PassTier, not here.
export interface Cafe {
  id: string;
  name: string;
  city: string;
  description: string;
  cover_photo_url: string | null;
  hours_text: string | null;
  created_at: string;
}

// A physical location under a Cafe brand — where staff actually work and
// redemption happens. A pass bought for the brand redeems at any branch.
export interface Branch {
  id: string;
  cafe_id: string;
  name: string;
  address: string;
  photo_url: string | null;
  invite_code: string | null;
  created_at: string;
}

// A prepay bundle a brand offers — a brand can have several (e.g. Starter,
// Standard, Bulk), each with its own cup count/price/discount.
export interface PassTier {
  id: string;
  cafe_id: string;
  name: string;
  cups: number;
  price_pkr: number;
  cup_price_pkr: number;
  discount_pct: number;
  payment_account_label: string;
  // How many days after activation the pass stays valid (used to set
  // passes.expires_at when staff confirm payment).
  validity_days: number;
  // Visit-based redemption limits, enforced server-side in the redeem Edge
  // Function: redemptions within visit_window_minutes of a visit's first
  // redemption count as the same visit, capped at max_cups_per_visit; a NEW
  // visit can't start until cooldown_hours have passed since the previous
  // visit's first redemption.
  visit_window_minutes: number;
  max_cups_per_visit: number;
  cooldown_hours: number;
  active: boolean;
  created_at: string;
}

export interface MenuPhoto {
  id: string;
  cafe_id: string;
  photo_url: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  phone: string;
  name: string | null;
  age: number | null;
  role: UserRole;
  branch_id: string | null;
  legal_accepted_at: string | null;
  created_at: string;
}

export interface Pass {
  id: string;
  user_id: string;
  cafe_id: string;
  pass_tier_id: string | null;
  cups_total: number;
  cups_remaining: number;
  status: PassStatus;
  payment_ref: string | null;
  purchased_at: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Redemption {
  id: string;
  pass_id: string;
  staff_user_id: string;
  branch_id: string | null;
  redeemed_at: string;
  cups_before: number;
  cups_after: number;
  refunded_at: string | null;
  refunded_by: string | null;
}

export interface Database {
  public: {
    Tables: {
      cafes: { Row: Cafe; Insert: Partial<Cafe>; Update: Partial<Cafe>; Relationships: [] };
      branches: { Row: Branch; Insert: Partial<Branch>; Update: Partial<Branch>; Relationships: [] };
      pass_tiers: { Row: PassTier; Insert: Partial<PassTier>; Update: Partial<PassTier>; Relationships: [] };
      menu_photos: { Row: MenuPhoto; Insert: Partial<MenuPhoto>; Update: Partial<MenuPhoto>; Relationships: [] };
      users: { Row: AppUser; Insert: Partial<AppUser>; Update: Partial<AppUser>; Relationships: [] };
      passes: { Row: Pass; Insert: Partial<Pass>; Update: Partial<Pass>; Relationships: [] };
      redemptions: {
        Row: Redemption;
        Insert: Partial<Redemption>;
        Update: Partial<Redemption>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
