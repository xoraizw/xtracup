import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { resolveCafeIdForBranch } from '../../lib/supabase';
import { BackLink, Body, Button, Card, Input, Label, Screen, Title } from '../../components/ui';
import { fonts, spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import type { Branch } from '../../types/database';

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// Staff-managed — branches are the physical locations under the brand.
// Each has its own invite code (staff join a specific branch); reusing a
// sibling branch's code across branches is left as a manual copy-paste
// here rather than a special "link branches" feature, since the underlying
// model doesn't require codes to be unique across branches — only unique
// where set (see 0007_brand_branch_split.sql's branches_invite_code_idx).
export default function BranchesScreen({ onBack }: { onBack: () => void }) {
  const { supabase, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    if (!profile?.branch_id) {
      setLoading(false);
      return;
    }
    const { cafeId: resolvedCafeId, error: resolveError } = await resolveCafeIdForBranch(
      supabase,
      profile.branch_id
    );
    if (resolveError) {
      setLoadError(resolveError);
      setLoading(false);
      return;
    }
    setCafeId(resolvedCafeId);
    if (resolvedCafeId) {
      const { data, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('cafe_id', resolvedCafeId)
        .order('name');
      if (branchesError) {
        setLoadError(branchesError.message);
      } else {
        setBranches((data as Branch[]) ?? []);
      }
    }
    setLoading(false);
  }, [supabase, profile?.branch_id]);

  useEffect(() => {
    load();
  }, [load]);

  if (editing) {
    return (
      <BranchForm
        cafeId={cafeId!}
        branch={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Branches</Title>
      <Body style={styles.muted}>Physical locations where staff can scan and redeem.</Body>
      <Button label="+ New branch" onPress={() => setEditing('new')} />
      <View style={styles.gap} />
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : loadError ? (
        <Body style={styles.error}>{loadError}</Body>
      ) : branches.length === 0 ? (
        <Body style={styles.muted}>No branches yet.</Body>
      ) : (
        branches.map((branch) => (
          <Pressable key={branch.id} onPress={() => setEditing(branch)}>
            <Card style={styles.branchCard}>
              <Body style={styles.branchName}>{branch.name}</Body>
              {branch.address ? <Body style={styles.muted}>{branch.address}</Body> : null}
              <Label>Invite code</Label>
              <Body>{branch.invite_code ?? '—'}</Body>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function BranchForm({
  cafeId,
  branch,
  onBack,
  onSaved,
}: {
  cafeId: string;
  branch: Branch | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [inviteCode, setInviteCode] = useState(branch?.invite_code ?? randomInviteCode());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!name) {
      setError('Branch name is required.');
      return;
    }
    setSaving(true);
    const payload = { cafe_id: cafeId, name, address, invite_code: inviteCode.trim() || null };
    const { error: err } = branch
      ? await supabase.from('branches').update(payload).eq('id', branch.id)
      : await supabase.from('branches').insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>{branch ? 'Edit branch' : 'New branch'}</Title>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="DHA Branch" />
          <View style={styles.spacer} />
          <Label>Address</Label>
          <Input value={address} onChangeText={setAddress} placeholder="123 Main St" />
          <View style={styles.spacer} />
          <Label>Staff invite code</Label>
          <Input value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
          <Body style={styles.hint}>
            Share this with staff who work at this branch. Reuse the same code across branches if you want one
            team covering multiple locations.
          </Body>
          <View style={styles.spacer} />
          <Button label="Save" onPress={save} loading={saving} />
          {error ? <Body style={styles.error}>{error}</Body> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.lg },
    gap: { height: spacing.lg },
    spacer: { height: spacing.md },
    hint: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
    error: { color: colors.negative, marginTop: spacing.md },
    branchCard: { marginBottom: spacing.md },
    branchName: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
  });
}
