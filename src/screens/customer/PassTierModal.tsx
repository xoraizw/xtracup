import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../../hooks/useAuth';
import { Body, Button, Card, Input, Label, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import type { Cafe, PassTier } from '../../types/database';

// Two-step modal: pick a tier from the brand's active bundles, then submit
// a payment reference for it. Reused from both ExploreScreen (quick-buy off
// a café card) and CafeDetailScreen (buy after browsing photos/branches).
export default function PassTierModal({
  visible,
  cafe,
  tiers,
  onClose,
  onPurchased,
}: {
  visible: boolean;
  cafe: Cafe;
  tiers: PassTier[];
  onClose: () => void;
  onPurchased: () => void;
}) {
  const { user } = useUser();
  const { supabase } = useAuth();
  const [selectedTier, setSelectedTier] = useState<PassTier | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSelectedTier(null);
    setPaymentRef('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Title>{cafe.name}</Title>
            <Body style={styles.muted}>{cafe.city}</Body>

            {!selectedTier ? (
              tiers.length === 0 ? (
                <Body style={styles.muted}>No passes available right now.</Body>
              ) : (
                tiers.map((tier) => {
                  const totalPayPerCup = tier.cup_price_pkr * tier.cups;
                  const savings = totalPayPerCup - tier.price_pkr;
                  return (
                    <Pressable key={tier.id} onPress={() => setSelectedTier(tier)}>
                      <Card style={styles.tierCard}>
                        <View style={styles.tierHeaderRow}>
                          <Body style={styles.tierName}>{tier.name}</Body>
                          <Body style={styles.tierDiscount}>{tier.discount_pct}% off</Body>
                        </View>
                        <View style={styles.tierStatsRow}>
                          <Label>Cups</Label>
                          <Body>{tier.cups}</Body>
                        </View>
                        <View style={styles.tierStatsRow}>
                          <Label>Price</Label>
                          <Body style={styles.priceValue}>PKR {tier.price_pkr.toLocaleString()}</Body>
                        </View>
                        <Body style={styles.muted}>Save PKR {savings.toLocaleString()} vs. pay-per-cup</Body>
                        <Body style={styles.muted}>Valid for {tier.validity_days} days after activation</Body>
                      </Card>
                    </Pressable>
                  );
                })
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  handleRow: { alignItems: 'center', marginBottom: spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairlineStrong },
  muted: { color: colors.textSecondary, marginBottom: spacing.md },
  tierCard: { marginBottom: spacing.md },
  tierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  tierName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
  tierDiscount: { color: colors.positive, fontFamily: fonts.bodyMedium },
  tierStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  priceValue: { color: colors.accent, fontFamily: fonts.bodyMedium },
  payAccount: { fontSize: 18, color: colors.textPrimary, marginBottom: spacing.sm },
  spacer: { height: spacing.md },
  error: { color: colors.negative, marginTop: spacing.md },
});
