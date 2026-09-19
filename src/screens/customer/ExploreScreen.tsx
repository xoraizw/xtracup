import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, View, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Body, EmptyState, Screen } from '../../components/ui';
import { colors, fonts, radii, shadows, spacing } from '../../theme/theme';
import type { Cafe, PassTier } from '../../types/database';

type CafeWithTiers = Cafe & { pass_tiers: PassTier[] };

export default function ExploreScreen({ onOpenCafe }: { onOpenCafe: (cafe: Cafe) => void }) {
  const { supabase } = useAuth();
  const [cafes, setCafes] = useState<CafeWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('cafes')
      .select('*, pass_tiers(*)')
      .order('created_at', { ascending: true });
    setCafes((data as CafeWithTiers[])?.map((c) => ({ ...c, pass_tiers: c.pass_tiers.filter((t) => t.active) })) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const cheapestPrice = (tiers: PassTier[]) =>
    tiers.length ? Math.min(...tiers.map((t) => t.price_pkr)) : null;

  return (
    <Screen>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>XtraCup</Text>
        <Text style={styles.heading}>Find your{'\n'}next favorite café</Text>
        <Body style={styles.muted}>Browse and grab a prepaid pass — no account needed to look around.</Body>
      </View>
      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : cafes.length === 0 ? (
        <EmptyState title="No cafés yet" subtitle="Check back soon — new cafés join the pilot regularly." />
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => {
            const from = cheapestPrice(item.pass_tiers);
            return (
              <Pressable onPress={() => onOpenCafe(item)}>
                <View style={styles.cafeCard}>
                  <View style={styles.coverWrap}>
                    {item.cover_photo_url ? (
                      <Image source={{ uri: item.cover_photo_url }} style={styles.coverImage} />
                    ) : (
                      <View style={styles.coverPlaceholder} />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(43,30,18,0.05)', 'rgba(20,13,7,0.88)']}
                      locations={[0, 0.45, 1]}
                      style={styles.coverScrim}
                    />
                    {item.pass_tiers.length > 0 ? (
                      <View style={styles.coverBadge}>
                        <Badge label={`${item.pass_tiers.length} pass${item.pass_tiers.length === 1 ? '' : 'es'}`} variant="onPhoto" />
                      </View>
                    ) : null}
                    <View style={styles.coverText}>
                      <Text style={styles.cafeName}>{item.name}</Text>
                      <Text style={styles.cafeCity}>{item.city}</Text>
                      {from !== null ? (
                        <Text style={styles.fromPrice}>from PKR {from.toLocaleString()}</Text>
                      ) : (
                        <Text style={styles.fromPriceMuted}>No passes yet</Text>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: { marginBottom: spacing.lg },
  kicker: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textSecondary, marginBottom: 0 },
  // The tab bar isn't part of this screen's own scroll container (it's a
  // sibling rendered by CustomerTabs below `content`), so without extra
  // bottom padding here the last card's lower edge lands flush against the
  // screen edge instead of clearing the floating tab bar visually.
  listContent: { paddingBottom: spacing.xl * 2 },
  gap: { height: spacing.lg },
  skeletonList: { gap: spacing.lg },
  skeletonCard: { height: 280, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised },
  cafeCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  coverWrap: { position: 'relative', height: 280, justifyContent: 'flex-end' },
  coverImage: { ...StyleSheet.absoluteFill, backgroundColor: colors.surfaceRaised },
  coverPlaceholder: { ...StyleSheet.absoluteFill, backgroundColor: colors.surfaceRaised },
  coverScrim: { ...StyleSheet.absoluteFill },
  coverBadge: { position: 'absolute', top: spacing.md, right: spacing.md },
  coverText: { padding: spacing.lg },
  cafeName: { fontFamily: fonts.display, fontSize: 24, color: colors.onPhoto, marginBottom: 2 },
  cafeCity: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  fromPrice: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onPhoto },
  fromPriceMuted: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
