import * as ImagePicker from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';

// Picks a single image and uploads it to the cafe-photos bucket at the
// given path, returning its public URL. RLS on storage.objects (see
// 0008_photo_storage.sql) requires the path's first segment to equal the
// uploader's own cafe_id, so callers must build paths as `${cafeId}/...`.
export async function pickAndUploadPhoto(
  supabase: SupabaseClient,
  bucketPath: string
): Promise<{ url: string | null; error: string | null }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { url: null, error: 'Photo library access is required to upload a picture.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets[0]) {
    return { url: null, error: null };
  }

  const asset = result.assets[0];
  const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${bucketPath}.${extension}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('cafe-photos')
    .upload(path, arrayBuffer, {
      contentType: asset.mimeType ?? `image/${extension}`,
      upsert: true,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from('cafe-photos').getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}
