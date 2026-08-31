import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { invokeFunction } from '../../lib/supabase';
import { BackLink, Body, Button, Card, Input, Label, Screen, Title } from '../../components/ui';
import { spacing, colors } from '../../theme/theme';
import type { Redemption } from '../../types/database';

type OrderRow = Redemption & {
  passes: { users: { name: string | null; phone: string } | null } | null;
};

// All-time redemption log for the staff's own brand (RLS scopes this the
// same way RedemptionsScreen's "today" view does — no client-side cafe_id
// filter needed). Each row can be refunded, which restores the cup to the
// customer's pass via the refund-redemption Edge Function — same
// server-side-only mutation pattern as redeem itself.
export default function OrderHistoryScreen({ onBack }: { onBack: () => void }) {
  const { supabase } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('redemptions')
      .select('*, passes!inner(users(name, phone))')
      .order('redeemed_at', { ascending: false })
      .limit(300);
    setRows((data as unknown as OrderRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const refund = async (redemptionId: string) => {
    setError(null);
    setRefundingId(redemptionId);
    const { data, message } = await invokeFunction(supabase, 'refund-redemption', {
      redemption_id: redemptionId,
    });
    setRefundingId(null);
    if (!data?.ok) {
      setError(message ?? 'Refund failed.');
      return;
    }
    load();
  };

  const filtered = query.trim()
    ? rows.filter((r) => {
        const q = query.trim().toLowerCase();
        return r.passes?.users?.name?.toLowerCase().includes(q) || r.passes?.users?.phone?.toLowerCase().includes(q);
      })
    : rows;

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Order history</Title>
      <Body style={styles.muted}>All-time redemptions for your café.</Body>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search by customer name"
        autoCapitalize="none"
        style={styles.search}
      />
      {error ? <Body style={styles.error}>{error}</Body> : null}
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : filtered.length === 0 ? (
        <Body style={styles.muted}>No redemptions yet.</Body>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Card style={item.refunded_at ? styles.refundedCard : undefined}>
              <Label>{new Date(item.redeemed_at).toLocaleString()}</Label>
              <Body>{item.passes?.users?.name || item.passes?.users?.phone || 'Customer'}</Body>
              <Body style={styles.muted}>
                {item.cups_before} → {item.cups_after} cups remaining
              </Body>
              {item.refunded_at ? (
                <Body style={styles.refundedLabel}>Refunded {new Date(item.refunded_at).toLocaleDateString()}</Body>
              ) : (
                <>
                  <View style={styles.spacer} />
                  <Button
                    label="Refund"
                    variant="secondary"
                    onPress={() => refund(item.id)}
                    loading={refundingId === item.id}
                  />
                </>
              )}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary },
  error: { color: colors.negative, marginBottom: spacing.md },
  gap: { height: spacing.md },
  spacer: { height: spacing.sm },
  search: { marginVertical: spacing.md },
  refundedCard: { opacity: 0.6 },
  refundedLabel: { color: colors.negative, fontSize: 12, marginTop: spacing.xs },
});
