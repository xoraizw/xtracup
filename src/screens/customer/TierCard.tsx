import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Body, Card, Label, Subtitle } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import type { PassTier } from '../../types/database';

// Shared tier-selection card — used both inline on CafeDetailScreen's
// "Passes" section and inside PassTierModal's tier-list step, so the two
// places a person picks a tier from look and behave identically.
export default function TierCard({ tier, onPress }: { tier: PassTier; onPress: () => void }) {
  const totalPayPerCup = tier.cup_price_pkr * tier.cups;
  const savings = totalPayPerCup - tier.price_pkr;
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Subtitle>{tier.name}</Subtitle>
          {savings > 0 ? <Badge label={`Save PKR ${savings.toLocaleString()}`} variant="positive" /> : null}
        </View>
        <View style={styles.statsRow}>
          <Label>Cups</Label>
          <Body style={styles.statValue}>{tier.cups}</Body>
        </View>
        <View style={styles.statsRow}>
          <Label>Price</Label>
          <Body style={styles.priceValue}>PKR {tier.price_pkr.toLocaleString()}</Body>
        </View>
        <Body style={styles.muted}>Valid for {tier.validity_days} days after activation</Body>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  statValue: { fontFamily: fonts.bodyMedium },
  priceValue: { color: colors.accent, fontFamily: fonts.bodyMedium },
  muted: { color: colors.textSecondary },
});
