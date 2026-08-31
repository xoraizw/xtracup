import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Body, Card, Label, Screen, StatTile, Title } from '../../components/ui';
import { spacing, colors } from '../../theme/theme';
import type { Redemption } from '../../types/database';

type RedemptionRow = Redemption & { passes: { users: { name: string | null; phone: string } | null } | null };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function RedemptionsScreen() {
  const { supabase } = useAuth();
  const [rows, setRows] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // RLS ("staff read own brand redemptions") already scopes this to the
  // caller's own cafe brand — no client-side cafe_id filter needed.
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('redemptions')
      .select('*, passes!inner(users(name, phone))')
      .gte('redeemed_at', startOfToday())
      .is('refunded_at', null)
      .order('redeemed_at', { ascending: false });
    setRows((data as unknown as RedemptionRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Title>Today's redemptions</Title>
      <StatTile value={String(rows.length)} caption="Cups redeemed today" />
      <View style={styles.gap} />
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : rows.length === 0 ? (
        <Body style={styles.muted}>No redemptions yet today.</Body>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gapSm} />}
          renderItem={({ item }) => (
            <Card>
              <Label>{new Date(item.redeemed_at).toLocaleTimeString()}</Label>
              <Body>{item.passes?.users?.name || item.passes?.users?.phone || 'Customer'}</Body>
              <Body style={styles.muted}>
                {item.cups_before} → {item.cups_after} cups remaining
              </Body>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary },
  gap: { height: spacing.lg },
  gapSm: { height: spacing.md },
});
