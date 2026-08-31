import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, View, Pressable } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Body, Button, Card, Screen, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import PassTierModal from './PassTierModal';
import type { Cafe, PassTier } from '../../types/database';

type CafeWithTiers = Cafe & { pass_tiers: PassTier[] };

export default function ExploreScreen({ onOpenCafe }: { onOpenCafe: (cafe: Cafe) => void }) {
  const { supabase } = useAuth();
  const [cafes, setCafes] = useState<CafeWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCafe, setModalCafe] = useState<CafeWithTiers | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('cafes')
      .select('*, pass_tiers(*)')
      .order('created_at', { ascending: true });
    setCafes((data as CafeWithTiers[])?.map((c) => ({ ...c, pass_tiers: c.pass_tiers.filter((t) => t.active) })) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Title>Explore</Title>
      <Body style={styles.muted}>Cafés offering prepaid passes.</Body>
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : cafes.length === 0 ? (
        <Body style={styles.muted}>No cafés yet — check back soon.</Body>
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpenCafe(item)}>
              <Card style={styles.cafeCard}>
                {item.cover_photo_url ? (
                  <Image source={{ uri: item.cover_photo_url }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder} />
                )}
                <View style={styles.cafeInfo}>
                  <Body style={styles.cafeName}>{item.name}</Body>
                  <Body style={styles.muted}>{item.city}</Body>
                  {item.pass_tiers.length > 0 ? (
                    <Button
                      label={`View Passes (${item.pass_tiers.length})`}
                      variant="secondary"
                      onPress={() => setModalCafe(item)}
                    />
                  ) : (
                    <Body style={styles.muted}>No passes available yet</Body>
                  )}
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      {modalCafe ? (
        <PassTierModal
          visible
          cafe={modalCafe}
          tiers={modalCafe.pass_tiers}
          onClose={() => setModalCafe(null)}
          onPurchased={() => {
            setModalCafe(null);
            load();
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.lg },
  gap: { height: spacing.md },
  cafeCard: { padding: 0, overflow: 'hidden' },
  coverImage: { width: '100%', height: 140, backgroundColor: colors.surfaceRaised },
  coverPlaceholder: { width: '100%', height: 140, backgroundColor: colors.surfaceRaised },
  cafeInfo: { padding: spacing.lg },
  cafeName: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.textPrimary, marginBottom: spacing.xs },
});
