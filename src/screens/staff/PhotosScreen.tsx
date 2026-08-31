import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../../hooks/useAuth';
import { pickAndUploadPhoto } from '../../lib/photoUpload';
import { resolveCafeIdForBranch } from '../../lib/supabase';
import { BackLink, Body, Button, Card, Label, Screen, Title } from '../../components/ui';
import { colors, spacing } from '../../theme/theme';
import type { Cafe, MenuPhoto } from '../../types/database';

// Staff-managed — cover photo shown on the Explore card, plus a gallery of
// menu photos shown on the café detail page. Uploads go straight to
// Supabase Storage from the client (RLS scopes writes to the uploader's own
// brand — see 0008_photo_storage.sql), no Edge Function needed.
export default function PhotosScreen({ onBack }: { onBack: () => void }) {
  const { supabase, profile } = useAuth();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!profile?.branch_id) {
      setLoading(false);
      return;
    }
    const { cafeId, error: resolveError } = await resolveCafeIdForBranch(supabase, profile.branch_id);
    if (resolveError) {
      setError(resolveError);
      setLoading(false);
      return;
    }
    if (cafeId) {
      const [{ data: cafeData, error: cafeError }, { data: menuData, error: menuError }] = await Promise.all([
        supabase.from('cafes').select('*').eq('id', cafeId).maybeSingle(),
        supabase.from('menu_photos').select('*').eq('cafe_id', cafeId).order('created_at', { ascending: false }),
      ]);
      if (cafeError || menuError) {
        setError(cafeError?.message ?? menuError?.message ?? 'Failed to load photos.');
      } else {
        setCafe(cafeData as Cafe);
        setMenuPhotos((menuData as MenuPhoto[]) ?? []);
      }
    }
    setLoading(false);
  }, [supabase, profile?.branch_id]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadCover = async () => {
    if (!cafe) return;
    setError(null);
    setUploadingCover(true);
    const { url, error: err } = await pickAndUploadPhoto(supabase, `${cafe.id}/cover`);
    setUploadingCover(false);
    if (err) {
      setError(err);
      return;
    }
    if (!url) return; // user cancelled
    const { error: dbErr } = await supabase.from('cafes').update({ cover_photo_url: url }).eq('id', cafe.id);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    load();
  };

  const uploadMenuPhoto = async () => {
    if (!cafe) return;
    setError(null);
    setUploadingMenu(true);
    const photoId = randomUUID();
    const { url, error: err } = await pickAndUploadPhoto(supabase, `${cafe.id}/menu/${photoId}`);
    setUploadingMenu(false);
    if (err) {
      setError(err);
      return;
    }
    if (!url) return;
    const { error: dbErr } = await supabase.from('menu_photos').insert({ id: photoId, cafe_id: cafe.id, photo_url: url });
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    load();
  };

  const removeMenuPhoto = async (photoId: string) => {
    await supabase.from('menu_photos').delete().eq('id', photoId);
    load();
  };

  if (loading) {
    return (
      <Screen>
        <BackLink onPress={onBack} />
        <Body>Loading…</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Photos</Title>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Label>Cover photo</Label>
          <Body style={styles.muted}>Shown on your café's card in Explore.</Body>
          {cafe?.cover_photo_url ? (
            <Image source={{ uri: cafe.cover_photo_url }} style={styles.coverPreview} />
          ) : null}
          <View style={styles.spacer} />
          <Button label="Upload cover photo" variant="secondary" onPress={uploadCover} loading={uploadingCover} />
        </Card>

        <View style={styles.gap} />
        <Card style={styles.card}>
          <Label>Menu photos</Label>
          <Body style={styles.muted}>Shown on your café's detail page.</Body>
          {menuPhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
              {menuPhotos.map((photo) => (
                <View key={photo.id} style={styles.menuPhotoWrap}>
                  <Image source={{ uri: photo.photo_url }} style={styles.menuPhoto} />
                  <Button label="Remove" variant="secondary" onPress={() => removeMenuPhoto(photo.id)} />
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.spacer} />
          <Button label="+ Add menu photo" variant="secondary" onPress={uploadMenuPhoto} loading={uploadingMenu} />
        </Card>

        {error ? <Body style={styles.error}>{error}</Body> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.md },
  card: { marginBottom: 0 },
  gap: { height: spacing.lg },
  spacer: { height: spacing.md },
  coverPreview: { width: '100%', height: 140, borderRadius: 12, backgroundColor: colors.surfaceRaised },
  menuScroll: { marginTop: spacing.sm },
  menuPhotoWrap: { marginRight: spacing.md, width: 120 },
  menuPhoto: { width: 120, height: 120, borderRadius: 10, marginBottom: spacing.sm, backgroundColor: colors.surfaceRaised },
  error: { color: colors.negative, marginTop: spacing.md },
});
