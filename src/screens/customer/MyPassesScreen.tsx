import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Body, Card, EmptyState, Label, ProgressBar, Screen, StatTile, Title } from '../../components/ui';
import { fonts, spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import PassDetailScreen from './PassDetailScreen';
import type { Cafe, Pass, PassStatus, PassTier } from '../../types/database';

type PassRow = Pass & {
  cafes: Pick<Cafe, 'name' | 'city'> | null;
  pass_tiers: Pick<PassTier, 'cups' | 'price_pkr' | 'cup_price_pkr'> | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending confirmation',
  active: 'Active',
  expired: 'Expired',
  depleted: 'Used up',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<PassStatus, 'positive' | 'negative' | 'neutral'> = {
  pending: 'neutral',
  active: 'positive',
  expired: 'neutral',
  depleted: 'neutral',
  rejected: 'negative',
};

// Ever confirmed (as opposed to still pending or rejected) — a pass in one
// of these statuses actually had money change hands, so it counts toward
// "cafés visited" and is eligible to have redeemed cups/savings.
const CONFIRMED_STATUSES: PassStatus[] = ['active', 'expired', 'depleted'];

export default function MyPassesScreen({ onExplore }: { onExplore: () => void }) {
  const { user } = useUser();
  const { supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPassId, setOpenPassId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('passes')
      .select('*, cafes(name, city), pass_tiers(cups, price_pkr, cup_price_pkr)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPasses((data as PassRow[]) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    let cupsRedeemed = 0;
    let moneySaved = 0;
    let activePasses = 0;
    const cafesVisited = new Set<string>();

    for (const pass of passes) {
      const redeemed = pass.cups_total - pass.cups_remaining;
      if (pass.status === 'active') activePasses += 1;
      if (!CONFIRMED_STATUSES.includes(pass.status)) continue;

      cupsRedeemed += redeemed;
      cafesVisited.add(pass.cafe_id);

      const tier = pass.pass_tiers;
      if (tier && tier.cups > 0 && redeemed > 0) {
        const effectivePricePerCup = tier.price_pkr / tier.cups;
        moneySaved += redeemed * (tier.cup_price_pkr - effectivePricePerCup);
      }
    }

    return { cupsRedeemed, moneySaved: Math.max(0, Math.round(moneySaved)), activePasses, cafesVisited: cafesVisited.size };
  }, [passes]);

  if (openPassId) {
    return <PassDetailScreen passId={openPassId} onBack={() => { setOpenPassId(null); load(); }} />;
  }

  return (
    <Screen>
      <Title>My Passes</Title>
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : passes.length === 0 ? (
        <EmptyState
          title="No passes yet"
          subtitle="Explore cafés nearby and grab your first prepaid pass."
          actionLabel="Explore cafés"
          onAction={onExplore}
        />
      ) : (
        <FlatList
          data={passes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.metrics}>
              <View style={styles.metricsRow}>
                <StatTile value={String(metrics.cupsRedeemed)} caption="Cups enjoyed" />
                <StatTile value={`PKR ${metrics.moneySaved.toLocaleString()}`} caption="Saved to date" />
              </View>
              <View style={styles.metricsRow}>
                <StatTile value={String(metrics.activePasses)} caption="Active passes" />
                <StatTile value={String(metrics.cafesVisited)} caption="Cafés visited" />
              </View>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setOpenPassId(item.id)}>
              <Card>
                <View style={styles.headerRow}>
                  <Body style={styles.cafeName}>{item.cafes?.name ?? 'Café'}</Body>
                  <Badge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
                </View>
                <Label>{item.cafes?.city}</Label>
                <View style={styles.progressRow}>
                  <ProgressBar progress={item.cups_total ? item.cups_remaining / item.cups_total : 0} />
                </View>
                <Body style={styles.muted}>
                  {item.cups_remaining}/{item.cups_total} cups remaining
                </Body>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.md },
    gap: { height: spacing.md },
    metrics: { gap: spacing.md, marginBottom: spacing.lg },
    metricsRow: { flexDirection: 'row', gap: spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    cafeName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
    progressRow: { marginTop: spacing.sm, marginBottom: spacing.sm },
  });
}
