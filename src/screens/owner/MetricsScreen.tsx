import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { invokeFunction } from '../../lib/supabase';
import { BackLink, Body, Button, Screen, StatTile, Title } from '../../components/ui';
import { colors, spacing } from '../../theme/theme';

type Metrics = {
  window_days: number;
  scope: 'single_cafe' | 'all_cafes';
  passes_sold: number;
  cups_sold: number;
  cups_redeemed: number;
  redemption_rate_pct: number;
  revenue_pkr: number;
  new_customers: number;
  repeat_customers: number;
};

const WINDOWS = [7, 30, 90];

// Used by both roles: staff always sees their own cafe (the function scopes
// this server-side from their profile); owner sees all cafes, optionally
// narrowed to one via cafeFilter (drill-down from Manage Cafes).
export default function MetricsScreen({
  onBack,
  cafeFilter,
}: {
  onBack: () => void;
  cafeFilter?: { id: string; name: string } | null;
}) {
  const { profile, supabase } = useAuth();
  const [windowDays, setWindowDays] = useState(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, message } = await invokeFunction<Metrics>(supabase, 'owner-metrics', {
      days: windowDays,
      cafe_id: cafeFilter?.id,
    });
    setLoading(false);
    if (!data?.ok) {
      setError(message ?? 'Could not load metrics.');
      return;
    }
    setMetrics(data);
  }, [supabase, windowDays, cafeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Metrics</Title>
      {profile?.role === 'owner' ? (
        <Body style={styles.muted}>{cafeFilter ? cafeFilter.name : 'All cafés'}</Body>
      ) : null}
      <View style={styles.windowRow}>
        {WINDOWS.map((d) => (
          <View key={d} style={styles.windowButtonWrap}>
            <Button
              label={`${d}d`}
              variant={windowDays === d ? 'primary' : 'secondary'}
              onPress={() => setWindowDays(d)}
            />
          </View>
        ))}
      </View>

      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : error ? (
        <Body style={styles.error}>{error}</Body>
      ) : metrics ? (
        <>
          <View style={styles.statRow}>
            <StatTile value={`${metrics.redemption_rate_pct}%`} caption="Redemption rate" />
            <StatTile value={`₨${metrics.revenue_pkr.toLocaleString()}`} caption="Revenue collected" />
          </View>
          <View style={styles.statRow}>
            <StatTile value={String(metrics.cups_redeemed)} caption="Cups redeemed" />
            <StatTile value={String(metrics.cups_sold)} caption="Cups sold" />
          </View>
          <View style={styles.statRow}>
            <StatTile value={String(metrics.new_customers)} caption="New customers" />
            <StatTile value={String(metrics.repeat_customers)} caption="Repeat customers" />
          </View>
          <View style={styles.statRow}>
            <StatTile value={String(metrics.passes_sold)} caption="Passes sold" />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary },
  error: { color: colors.negative },
  windowRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  windowButtonWrap: { flex: 1 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
});
