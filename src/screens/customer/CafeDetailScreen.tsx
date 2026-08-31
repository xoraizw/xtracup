import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { BackLink, Body, Button, Card, Label, Screen, Title } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme/theme';
import PassTierModal from './PassTierModal';
import type { Branch, Cafe, MenuPhoto, PassTier } from '../../types/database';

export default function CafeDetailScreen({ cafe, onBack }: { cafe: Cafe; onBack: () => void }) {
  const { supabase } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tiers, setTiers] = useState<PassTier[]>([]);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {cafe.cover_photo_url ? (
          <Image source={{ uri: cafe.cover_photo_url }} style={styles.cover} />
        ) : null}
        <Title>{cafe.name}</Title>
        <Body style={styles.muted}>{cafe.city}</Body>
        {cafe.description ? <Body style={styles.description}>{cafe.description}</Body> : null}

        <View style={styles.spacer} />
        <Button label={`View Passes (${tiers.length})`} onPress={() => setShowModal(true)} disabled={tiers.length === 0} />

        {loading ? (
          <Body style={styles.muted}>Loading…</Body>
        ) : (
          <>
            {menuPhotos.length > 0 ? (
              <>
                <View style={styles.sectionGap} />
                <Label>Menu</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
                  {menuPhotos.map((photo) => (
                    <Image key={photo.id} source={{ uri: photo.photo_url }} style={styles.menuPhoto} />
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={styles.sectionGap} />
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
          </>
        )}
      </ScrollView>

      <PassTierModal
        visible={showModal}
        cafe={cafe}
        tiers={tiers}
        onClose={() => setShowModal(false)}
        onPurchased={() => setShowModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 180, borderRadius: 16, marginBottom: spacing.md, backgroundColor: colors.surfaceRaised },
  muted: { color: colors.textSecondary },
  description: { color: colors.textPrimary, marginTop: spacing.sm },
  spacer: { height: spacing.md },
  sectionGap: { height: spacing.lg },
  menuScroll: { marginTop: spacing.sm },
  menuPhoto: { width: 140, height: 140, borderRadius: 12, marginRight: spacing.sm, backgroundColor: colors.surfaceRaised },
  branchCard: { marginTop: spacing.sm },
  branchPhoto: { width: '100%', height: 100, borderRadius: 10, marginBottom: spacing.sm, backgroundColor: colors.surfaceRaised },
  branchName: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.textPrimary },
});
