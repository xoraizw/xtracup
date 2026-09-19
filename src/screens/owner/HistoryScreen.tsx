import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { BackLink, Body, Card, Input, Label, Screen, Title } from '../../components/ui';
import { spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import type { Pass } from '../../types/database';

type PassRow = Pass & {
  users: { name: string | null; phone: string } | null;
  pass_tiers: { name: string } | null;
};

// Used by both roles: staff sees only their own cafe (RLS scopes this
// automatically, no filter needed here); owner sees everything, optionally
// narrowed to one cafe via cafeFilter (drill-down from Manage Cafes).
export default function HistoryScreen({
  onBack,
  cafeFilter,
}: {
  onBack: () => void;
  cafeFilter?: { id: string; name: string } | null;
}) {
  const { profile, supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    let q = supabase
      .from('passes')
      .select('*, users(name, phone), pass_tiers(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (cafeFilter) q = q.eq('cafe_id', cafeFilter.id);
    const { data } = await q;
    setPasses((data as PassRow[]) ?? []);
    setLoading(false);
  }, [supabase, cafeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = query.trim()
    ? passes.filter((p) => {
        const q = query.trim().toLowerCase();
        return p.users?.name?.toLowerCase().includes(q) || p.users?.phone?.toLowerCase().includes(q);
      })
    : passes;

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Pass history</Title>
      {profile?.role === 'owner' ? (
        <Body style={styles.muted}>{cafeFilter ? cafeFilter.name : 'All cafés'}</Body>
      ) : null}
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search by customer name or email"
        autoCapitalize="none"
        style={styles.search}
      />
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : filtered.length === 0 ? (
        <Body style={styles.muted}>No passes found.</Body>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Card>
              <Label>{item.users?.name || item.users?.phone || 'Customer'}</Label>
              <Body>
                {item.pass_tiers?.name ?? 'Pass'} · {item.cups_remaining}/{item.cups_total} cups · {item.status}
              </Body>
              <Body style={styles.muted}>
                {item.purchased_at ? new Date(item.purchased_at).toLocaleDateString() : 'Not purchased yet'}
              </Body>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary },
    gap: { height: spacing.md },
    search: { marginBottom: spacing.lg },
  });
}
