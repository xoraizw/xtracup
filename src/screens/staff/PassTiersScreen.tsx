import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { resolveCafeIdForBranch } from '../../lib/supabase';
import { BackLink, Body, Button, Card, Input, Label, Screen, Title } from '../../components/ui';
import { fonts, spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import type { PassTier } from '../../types/database';

// Staff-managed — a brand can offer several prepay bundles (Starter,
// Standard, Bulk, etc.), each with its own cup count/price/discount. Any
// staff member at any branch of the brand can manage these (RLS scopes by
// cafe_id derived from the staff's branch, see 0007_brand_branch_split.sql).
export default function PassTiersScreen({ onBack }: { onBack: () => void }) {
  const { supabase, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<PassTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PassTier | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (!profile?.branch_id) {
      setLoading(false);
      return;
    }
    const { cafeId: resolvedCafeId, error: resolveError } = await resolveCafeIdForBranch(
      supabase,
      profile.branch_id
    );
    if (resolveError) {
      setLoadError(resolveError);
      setLoading(false);
      return;
    }
    setCafeId(resolvedCafeId);
    if (resolvedCafeId) {
      const { data, error: tiersError } = await supabase
        .from('pass_tiers')
        .select('*')
        .eq('cafe_id', resolvedCafeId)
        .order('cups');
      if (tiersError) {
        setLoadError(tiersError.message);
      } else {
        setTiers((data as PassTier[]) ?? []);
      }
    }
    setLoading(false);
  }, [supabase, profile?.branch_id]);

  useEffect(() => {
    load();
  }, [load]);

  if (editing) {
    return (
      <TierForm
        cafeId={cafeId!}
        tier={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Pass tiers</Title>
      <Body style={styles.muted}>Prepay bundles customers can buy for your café.</Body>
      <Button label="+ New tier" onPress={() => setEditing('new')} />
      <View style={styles.gap} />
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : loadError ? (
        <Body style={styles.error}>{loadError}</Body>
      ) : tiers.length === 0 ? (
        <Body style={styles.muted}>No tiers yet.</Body>
      ) : (
        tiers.map((tier) => (
          <Pressable key={tier.id} onPress={() => setEditing(tier)}>
            <Card style={styles.tierCard}>
              <View style={styles.tierHeaderRow}>
                <Body style={styles.tierName}>{tier.name}</Body>
                {!tier.active ? <Body style={styles.inactive}>Inactive</Body> : null}
              </View>
              <Body style={styles.muted}>
                {tier.cups} cups · PKR {tier.price_pkr.toLocaleString()} · {tier.discount_pct}% off
              </Body>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function TierForm({
  cafeId,
  tier,
  onBack,
  onSaved,
}: {
  cafeId: string;
  tier: PassTier | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState(tier?.name ?? '');
  const [cups, setCups] = useState(tier ? String(tier.cups) : '15');
  const [pricePkr, setPricePkr] = useState(tier ? String(tier.price_pkr) : '');
  const [cupPricePkr, setCupPricePkr] = useState(tier ? String(tier.cup_price_pkr) : '');
  const [discountPct, setDiscountPct] = useState(tier ? String(tier.discount_pct) : '15');
  const [paymentLabel, setPaymentLabel] = useState(tier?.payment_account_label ?? '');
  const [validityDays, setValidityDays] = useState(tier ? String(tier.validity_days) : '30');
  const [visitWindowMinutes, setVisitWindowMinutes] = useState(tier ? String(tier.visit_window_minutes) : '5');
  const [maxCupsPerVisit, setMaxCupsPerVisit] = useState(tier ? String(tier.max_cups_per_visit) : '1');
  const [cooldownHours, setCooldownHours] = useState(tier ? String(tier.cooldown_hours) : '0');
  const [active, setActive] = useState(tier?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!name || !cups || !pricePkr || !cupPricePkr || !validityDays || !maxCupsPerVisit) {
      setError('Name, cups, price, cup price, validity, and max cups per visit are required.');
      return;
    }
    setSaving(true);
    const payload = {
      cafe_id: cafeId,
      name,
      cups: Number(cups),
      price_pkr: Number(pricePkr),
      cup_price_pkr: Number(cupPricePkr),
      discount_pct: Number(discountPct),
      payment_account_label: paymentLabel,
      validity_days: Number(validityDays),
      visit_window_minutes: Number(visitWindowMinutes) || 0,
      max_cups_per_visit: Number(maxCupsPerVisit),
      cooldown_hours: Number(cooldownHours) || 0,
      active,
    };
    const { error: err } = tier
      ? await supabase.from('pass_tiers').update(payload).eq('id', tier.id)
      : await supabase.from('pass_tiers').insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>{tier ? 'Edit tier' : 'New tier'}</Title>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="Standard" />
          <View style={styles.spacer} />
          <Label>Cups</Label>
          <Input value={cups} onChangeText={setCups} keyboardType="number-pad" />
          <View style={styles.spacer} />
          <Label>Price (PKR)</Label>
          <Input value={pricePkr} onChangeText={setPricePkr} keyboardType="decimal-pad" />
          <View style={styles.spacer} />
          <Label>Pay-per-cup price (PKR) — used to show savings</Label>
          <Input value={cupPricePkr} onChangeText={setCupPricePkr} keyboardType="decimal-pad" />
          <View style={styles.spacer} />
          <Label>Discount %</Label>
          <Input value={discountPct} onChangeText={setDiscountPct} keyboardType="decimal-pad" />
          <View style={styles.spacer} />
          <Label>Payment account label</Label>
          <Input value={paymentLabel} onChangeText={setPaymentLabel} placeholder="JazzCash: 0300-0000000" />
          <View style={styles.spacer} />
          <Label>Validity (days from activation)</Label>
          <Input value={validityDays} onChangeText={setValidityDays} keyboardType="number-pad" placeholder="30" />
          <Body style={styles.hint}>How long the pass stays valid after payment is confirmed.</Body>
          <View style={styles.spacer} />
          <Label>Visit window (minutes)</Label>
          <Input
            value={visitWindowMinutes}
            onChangeText={setVisitWindowMinutes}
            keyboardType="number-pad"
            placeholder="5"
          />
          <Body style={styles.hint}>
            Redemptions within this many minutes of each other count as the same visit (e.g. a group ordering
            together). 0 = every redemption is its own visit.
          </Body>
          <View style={styles.spacer} />
          <Label>Max cups per visit</Label>
          <Input value={maxCupsPerVisit} onChangeText={setMaxCupsPerVisit} keyboardType="number-pad" placeholder="1" />
          <Body style={styles.hint}>How many cups can be redeemed within one visit window.</Body>
          <View style={styles.spacer} />
          <Label>Cooldown between visits (hours)</Label>
          <Input value={cooldownHours} onChangeText={setCooldownHours} keyboardType="number-pad" placeholder="0" />
          <Body style={styles.hint}>0 = no cooldown. Minimum time before a new visit can start.</Body>
          <View style={styles.spacer} />
          <Button
            label={active ? 'Active — tap to deactivate' : 'Inactive — tap to activate'}
            variant="secondary"
            onPress={() => setActive((a) => !a)}
          />
          <View style={styles.spacer} />
          <Button label="Save" onPress={save} loading={saving} />
          {error ? <Body style={styles.error}>{error}</Body> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.lg },
    gap: { height: spacing.lg },
    spacer: { height: spacing.md },
    error: { color: colors.negative, marginTop: spacing.md },
    hint: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
    tierCard: { marginBottom: spacing.md },
    tierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    tierName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
    inactive: { color: colors.negative, fontSize: 12 },
  });
}
