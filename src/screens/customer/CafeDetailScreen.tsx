import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/expo';
import { useAuth } from '../../hooks/useAuth';
import { Body, Card, EmptyState, IconButton, Label, Screen } from '../../components/ui';
import { BackArrowIcon } from '../../components/ChromeIcons';
import Logo from '../../components/Logo';
import { fonts, radii, spacing, type ColorPalette, type ShadowPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import PassTierModal from './PassTierModal';
import TierCard from './TierCard';
import type { Branch, Cafe, MenuPhoto, PassTier } from '../../types/database';

export default function CafeDetailScreen({
  cafe,
  initialTier,
  onBack,
  onRequireAuth,
}: {
  cafe: Cafe;
  initialTier?: PassTier | null;
  onBack: () => void;
  onRequireAuth?: (cafe: Cafe, tier: PassTier) => void;
}) {
  const { user } = useUser();
  const { supabase } = useAuth();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tiers, setTiers] = useState<PassTier[]>([]);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseTier, setPurchaseTier] = useState<PassTier | null>(initialTier ?? null);

  const load = useCallback(async () => {
    const [{ data: branchData }, { data: tierData }, { data: menuData }] = await Promise.all([
      supabase.from('branches').select('*').eq('cafe_id', cafe.id).order('name'),
      supabase.from('pass_tiers').select('*').eq('cafe_id', cafe.id).eq('active', true).order('cups'),
      supabase.from('menu_photos').select('*').eq('cafe_id', cafe.id).order('created_at', { ascending: false }),
    ]);
    setBranches((branchData as Branch[]) ?? []);
    setTiers((tierData as PassTier[]) ?? []);
    setMenuPhotos((menuData as MenuPhoto[]) ?? []);
    setLoading(false);
  }, [supabase, cafe.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialTier) setPurchaseTier(initialTier);
  }, [initialTier]);

  const pickTier = (tier: PassTier) => {
    if (!user) {
      onRequireAuth?.(cafe, tier);
      return;
    }
    setPurchaseTier(tier);
  };

  const primaryBranch = branches[0] ?? null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <IconButton onPress={onBack}>
          <BackArrowIcon size={18} color={colors.textPrimary} />
        </IconButton>

        <View style={styles.heroWrap}>
          {cafe.cover_photo_url ? (
            <Image source={{ uri: cafe.cover_photo_url }} style={styles.hero} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.accentSoft, colors.surfaceRaised]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroPlaceholder}
            >
              <View style={styles.watermark}>
                <Logo size={36} />
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(43,30,18,0.05)', 'rgba(20,13,7,0.85)']}
            locations={[0, 0.45, 1]}
            style={styles.heroScrim}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{cafe.name}</Text>
            <Text style={styles.heroCity}>{cafe.city}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {loading ? (
            <Body style={styles.muted}>Loading…</Body>
          ) : (
            <>
              <Card style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Label>City</Label>
                  <Body>{cafe.city}</Body>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Label>Address</Label>
                  <Body>{primaryBranch?.address || 'Not listed yet'}</Body>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Label>Hours</Label>
                  <Body>{cafe.hours_text || 'Not listed yet'}</Body>
                </View>
              </Card>

              {cafe.description ? <Body style={styles.description}>{cafe.description}</Body> : null}

              {menuPhotos.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Menu</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
                    {menuPhotos.map((photo) => (
                      <Image key={photo.id} source={{ uri: photo.photo_url }} style={styles.menuPhoto} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Passes</Text>
                {tiers.length === 0 ? (
                  <EmptyState title="No passes yet" subtitle="This café hasn't published any prepaid passes yet." />
                ) : (
                  tiers.map((tier) => <TierCard key={tier.id} tier={tier} onPress={() => pickTier(tier)} />)
                )}
              </View>

              <View style={styles.section}>
                <Label>Branches ({branches.length})</Label>
                {branches.length === 0 ? (
                  <Body style={styles.muted}>No branches listed yet.</Body>
                ) : (
                  branches.map((branch) => (
                    <Card key={branch.id} style={styles.branchCard}>
                      {branch.photo_url ? (
                        <Image source={{ uri: branch.photo_url }} style={styles.branchPhoto} />
                      ) : null}
                      <Body style={styles.branchName}>{branch.name}</Body>
                      {branch.address ? <Body style={styles.muted}>{branch.address}</Body> : null}
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <PassTierModal
        visible={Boolean(purchaseTier)}
        cafe={cafe}
        tiers={tiers}
        initialTier={purchaseTier}
        onClose={() => setPurchaseTier(null)}
        onPurchased={() => setPurchaseTier(null)}
        onRequireAuth={onRequireAuth}
      />
    </Screen>
  );
}

function makeStyles(colors: ColorPalette, shadows: ShadowPalette) {
  return StyleSheet.create({
    scrollContent: { paddingBottom: spacing.lg },
    heroWrap: {
      marginTop: spacing.md,
      position: 'relative',
      height: 220,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      ...shadows.raised,
    },
    hero: { ...StyleSheet.absoluteFill, backgroundColor: colors.surfaceRaised },
    heroPlaceholder: { ...StyleSheet.absoluteFill },
    watermark: { position: 'absolute', bottom: spacing.md, right: spacing.md, opacity: 0.35 },
    heroScrim: { ...StyleSheet.absoluteFill },
    heroText: { padding: spacing.lg },
    heroName: { fontFamily: fonts.display, fontSize: 26, color: colors.onPhoto, marginBottom: 2 },
    heroCity: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    body: { paddingTop: spacing.lg },
    muted: { color: colors.textSecondary },
    infoCard: { gap: spacing.md },
    infoRow: { gap: 2 },
    infoDivider: { height: 1, backgroundColor: colors.hairline },
    description: { color: colors.textPrimary, fontSize: 16, lineHeight: 23, marginTop: spacing.lg },
    section: { marginTop: spacing.xl },
    sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginBottom: spacing.md },
    menuScroll: { marginTop: spacing.xs },
    menuPhoto: { width: 160, height: 160, borderRadius: radii.md, marginRight: spacing.sm, backgroundColor: colors.surfaceRaised },
    branchCard: { marginTop: spacing.sm },
    branchPhoto: { width: '100%', height: 100, borderRadius: radii.sm, marginBottom: spacing.sm, backgroundColor: colors.surfaceRaised },
    branchName: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.textPrimary },
  });
}
