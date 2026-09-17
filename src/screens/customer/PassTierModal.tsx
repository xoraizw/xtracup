import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../../hooks/useAuth';
import { Body, Button, Card, Input, Label, Sheet, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import TierCard from './TierCard';
import type { Cafe, PassTier } from '../../types/database';

// Two-step sheet: pick a tier from the brand's active bundles, then submit
// a payment reference for it. Reused from both ExploreScreen (quick-buy off
// a café card) and CafeDetailScreen (buy after browsing photos/branches).
//
// Signed-out visitors can browse tiers freely; picking one calls
// `onRequireAuth` instead of advancing to payment (there's no user to
// attach the pass to yet) — CustomerTabs resumes this exact tier, at the
// payment step, once they've signed in (see useAuth's `pendingPurchase`).
export default function PassTierModal({
  visible,
  cafe,
  tiers,
  initialTier,
  onClose,
  onPurchased,
  onRequireAuth,
}: {
  visible: boolean;
  cafe: Cafe;
  tiers: PassTier[];
  initialTier?: PassTier | null;
  onClose: () => void;
  onPurchased: () => void;
  onRequireAuth?: (cafe: Cafe, tier: PassTier) => void;
}) {
  const { user } = useUser();
  const { supabase } = useAuth();
  const [selectedTier, setSelectedTier] = useState<PassTier | null>(initialTier ?? null);
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialTier) setSelectedTier(initialTier);
  }, [visible, initialTier]);

  const reset = () => {
    setSelectedTier(null);
    setPaymentRef('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickTier = (tier: PassTier) => {
    if (!user) {
      onRequireAuth?.(cafe, tier);
      return;
    }
    setSelectedTier(tier);
  };

  const submitPayment = async () => {
    if (!user || !selectedTier) return;
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.from('passes').insert({
      user_id: user.id,
      cafe_id: cafe.id,
      pass_tier_id: selectedTier.id,
      cups_total: selectedTier.cups,
      cups_remaining: selectedTier.cups,
      status: 'pending',
      payment_ref: paymentRef,
      purchased_at: new Date().toISOString(),
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    reset();
    onPurchased();
  };

  return (
    <Sheet visible={visible} onRequestClose={close}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>{cafe.name}</Title>
        <Body style={styles.muted}>{cafe.city}</Body>

        {!selectedTier ? (
          tiers.length === 0 ? (
            <Body style={styles.muted}>No passes available right now.</Body>
          ) : (
            tiers.map((tier) => <TierCard key={tier.id} tier={tier} onPress={() => pickTier(tier)} />)
          )
        ) : (
          <Card style={styles.tierCard}>
            <Label>Pay via</Label>
            <Body style={styles.payAccount}>{selectedTier.payment_account_label || 'Ask café staff'}</Body>
            <Body style={styles.muted}>
              Send PKR {selectedTier.price_pkr.toLocaleString()} for the "{selectedTier.name}" pass, then enter
              the transaction reference below. Café staff will confirm your payment and activate your pass.
            </Body>
            <View style={styles.spacer} />
            <Label>Transaction reference</Label>
            <Input
              value={paymentRef}
              onChangeText={setPaymentRef}
              placeholder="e.g. JC-4471829"
              autoCapitalize="characters"
            />
            <View style={styles.spacer} />
            <Button label="I've paid — submit" onPress={submitPayment} loading={loading} disabled={!paymentRef} />
            <View style={styles.spacer} />
            <Button label="Back to passes" variant="secondary" onPress={() => setSelectedTier(null)} disabled={loading} />
            {error ? <Body style={styles.error}>{error}</Body> : null}
          </Card>
        )}

        <View style={styles.spacer} />
        <Button label="Close" variant="secondary" onPress={close} disabled={loading} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.md },
  tierCard: { marginBottom: spacing.md },
  payAccount: { fontSize: 18, color: colors.textPrimary, marginBottom: spacing.sm, fontFamily: fonts.displayMedium },
  spacer: { height: spacing.md },
  error: { color: colors.negative, marginTop: spacing.md },
});
