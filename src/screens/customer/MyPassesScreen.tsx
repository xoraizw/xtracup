import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../../hooks/useAuth';
import { Body, Button, Card, Label, Screen, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import PassDetailScreen from './PassDetailScreen';
import type { Cafe, Pass } from '../../types/database';

type PassRow = Pass & { cafes: Pick<Cafe, 'name' | 'city'> | null };

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending confirmation',
  active: 'Active',
  expired: 'Expired',
  depleted: 'Used up',
  rejected: 'Rejected',
};

export default function MyPassesScreen({ onExplore }: { onExplore: () => void }) {
  const { user } = useUser();
  const { supabase } = useAuth();
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPassId, setOpenPassId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('passes')
      .select('*, cafes(name, city)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPasses((data as PassRow[]) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (openPassId) {
    return <PassDetailScreen passId={openPassId} onBack={() => { setOpenPassId(null); load(); }} />;
  }

  return (
    <Screen>
      <Title>My Passes</Title>
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : passes.length === 0 ? (
        <>
          <Body style={styles.muted}>No passes yet. Explore cafés to buy your first one.</Body>
          <Button label="Explore cafés" onPress={onExplore} />
        </>
      ) : (
        <FlatList
          data={passes}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setOpenPassId(item.id)}>
              <Card>
                <View style={styles.headerRow}>
                  <Body style={styles.cafeName}>{item.cafes?.name ?? 'Café'}</Body>
                  <Body style={item.status === 'active' ? styles.statusActive : styles.muted}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Body>
                </View>
                <Label>{item.cafes?.city}</Label>
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

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.md },
  gap: { height: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  cafeName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
  statusActive: { color: colors.positive },
});
