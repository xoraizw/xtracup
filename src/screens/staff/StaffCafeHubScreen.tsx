import React from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { Body, Card, Screen, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';

type Section = 'tiers' | 'photos' | 'branches' | 'metrics' | 'history' | 'orders';

const SECTIONS: { key: Section; label: string; description: string }[] = [
  { key: 'tiers', label: 'Pass tiers', description: 'Prepay bundles customers can buy' },
  { key: 'photos', label: 'Photos', description: 'Cover photo and menu pictures' },
  { key: 'branches', label: 'Branches', description: 'Locations and their staff invite codes' },
  { key: 'metrics', label: 'Metrics', description: 'Redemption rate, revenue, new vs. repeat customers' },
  { key: 'history', label: 'Pass history', description: 'All passes ever sold, searchable' },
  { key: 'orders', label: 'Order history', description: 'All-time redemptions — refund a mis-scan' },
];

export default function StaffCafeHubScreen({ onSelect }: { onSelect: (section: Section) => void }) {
  return (
    <Screen>
      <Title>Café</Title>
      <Body style={styles.muted}>Manage your café.</Body>
      <View style={styles.list}>
        {SECTIONS.map((s) => (
          <Pressable key={s.key} onPress={() => onSelect(s.key)}>
            <Card style={styles.card}>
              <Text style={styles.cardLabel}>{s.label}</Text>
              <Body style={styles.cardDescription}>{s.description}</Body>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.lg },
  list: { gap: spacing.md },
  card: { marginBottom: 0 },
  cardLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
