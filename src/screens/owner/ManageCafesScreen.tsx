import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { BackLink, Body, Button, Card, Input, Label, Screen, Title } from '../../components/ui';
import { colors, spacing } from '../../theme/theme';
import type { AppUser, Branch, Cafe } from '../../types/database';

type Pane = 'list' | 'create' | 'detail' | 'branchStaff';

export default function ManageCafesScreen({
  onBack,
  onOpenCafeMetrics,
  onOpenCafeHistory,
}: {
  // Optional — this screen is the Owner tab's root, so there's nothing to
  // go back to at the top level. Only used by the create/detail sub-views.
  onBack?: () => void;
  onOpenCafeMetrics: (cafe: { id: string; name: string }) => void;
  onOpenCafeHistory: (cafe: { id: string; name: string }) => void;
}) {
  const { supabase } = useAuth();
  const [view, setView] = useState<Pane>('list');
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const loadCafes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cafes').select('*').order('created_at', { ascending: true });
    setCafes((data as Cafe[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  if (view === 'create') {
    return (
      <CreateCafeForm
        onBack={() => setView('list')}
        onCreated={() => {
          setView('list');
          loadCafes();
        }}
      />
    );
  }

  if (view === 'branchStaff' && selectedBranch) {
    return <BranchStaff branch={selectedBranch} onBack={() => setView('detail')} />;
  }

  if (view === 'detail' && selectedCafe) {
    return (
      <CafeDetail
        cafe={selectedCafe}
        onBack={() => setView('list')}
        onDeleted={() => {
          setView('list');
          loadCafes();
        }}
        onOpenBranchStaff={(branch) => {
          setSelectedBranch(branch);
          setView('branchStaff');
        }}
        onOpenMetrics={() => onOpenCafeMetrics({ id: selectedCafe.id, name: selectedCafe.name })}
        onOpenHistory={() => onOpenCafeHistory({ id: selectedCafe.id, name: selectedCafe.name })}
      />
    );
  }

  return (
    <Screen>
      {onBack ? <BackLink onPress={onBack} /> : null}
      <Title>Manage cafés</Title>
      <Button label="+ New café" onPress={() => setView('create')} />
      <View style={styles.gap} />
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : cafes.length === 0 ? (
        <Body style={styles.muted}>No cafés yet.</Body>
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedCafe(item);
                setView('detail');
              }}
            >
              <Card>
                <Label>{item.city}</Label>
                <Body>{item.name}</Body>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function CreateCafeForm({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const { supabase } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    if (!name || !city) {
      setError('Name and city are required.');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from('cafes').insert({ name, city, description });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated();
  };

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>New café</Title>
      <Body style={styles.muted}>
        Pass pricing, branches, and photos are set up by the café's own staff once they join — this just creates
        the brand.
      </Body>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Label>Name</Label>
          <Input value={name} onChangeText={setName} placeholder="Pilot Cafe" />
          <View style={styles.spacer} />
          <Label>City</Label>
          <Input value={city} onChangeText={setCity} placeholder="Karachi" />
          <View style={styles.spacer} />
          <Label>Description</Label>
          <Input value={description} onChangeText={setDescription} placeholder="A cozy neighborhood café…" />
          <View style={styles.spacer} />
          <Button label="Create café" onPress={create} loading={saving} />
          {error ? <Body style={styles.error}>{error}</Body> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function CafeDetail({
  cafe,
  onBack,
  onDeleted,
  onOpenBranchStaff,
  onOpenMetrics,
  onOpenHistory,
}: {
  cafe: Cafe;
  onBack: () => void;
  onDeleted: () => void;
  onOpenBranchStaff: (branch: Branch) => void;
  onOpenMetrics: () => void;
  onOpenHistory: () => void;
}) {
  const { supabase } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    const { data } = await supabase.from('branches').select('*').eq('cafe_id', cafe.id).order('name');
    setBranches((data as Branch[]) ?? []);
    setLoadingBranches(false);
  }, [supabase, cafe.id]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const deleteCafe = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('cafes').delete().eq('id', cafe.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    onDeleted();
  };

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Title>{cafe.name}</Title>
        <Body style={styles.muted}>{cafe.city}</Body>

        <View style={styles.actionRow}>
          <View style={styles.actionFlex}>
            <Button label="Metrics" variant="secondary" onPress={onOpenMetrics} />
          </View>
          <View style={styles.actionFlex}>
            <Button label="Pass history" variant="secondary" onPress={onOpenHistory} />
          </View>
        </View>

        <View style={styles.gap} />
        <Label>Branches ({branches.length})</Label>
        <View style={styles.gapSm} />
        {loadingBranches ? (
          <Body style={styles.muted}>Loading…</Body>
        ) : branches.length === 0 ? (
          <Body style={styles.muted}>No branches yet — the café's own staff can add one once they join.</Body>
        ) : (
          branches.map((branch) => (
            <Pressable key={branch.id} onPress={() => onOpenBranchStaff(branch)}>
              <Card style={styles.branchCard}>
                <Body>{branch.name}</Body>
                {branch.address ? <Body style={styles.muted}>{branch.address}</Body> : null}
                <Label>Invite code</Label>
                <Body>{branch.invite_code ?? '—'}</Body>
              </Card>
            </Pressable>
          ))
        )}

        <View style={styles.gap} />
        {confirmDelete ? (
          <Card style={styles.dangerCard}>
            <Body style={styles.error}>
              Delete {cafe.name}? This cannot be undone — branches, pass tiers, passes, and redemption history for
              this café will be affected.
            </Body>
            <View style={styles.actionRow}>
              <View style={styles.actionFlex}>
                <Button label="Yes, delete" onPress={deleteCafe} loading={busy} />
              </View>
              <View style={styles.actionFlex}>
                <Button label="Cancel" variant="secondary" onPress={() => setConfirmDelete(false)} />
              </View>
            </View>
          </Card>
        ) : (
          <Button label="Delete café" variant="secondary" onPress={() => setConfirmDelete(true)} />
        )}
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </ScrollView>
    </Screen>
  );
}

function BranchStaff({ branch, onBack }: { branch: Branch; onBack: () => void }) {
  const { supabase } = useAuth();
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('role', 'staff')
      .order('created_at', { ascending: true });
    setStaff((data as AppUser[]) ?? []);
    setLoading(false);
  }, [supabase, branch.id]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (userId: string) => {
    setBusyId(userId);
    await supabase.from('users').update({ role: 'customer' }).eq('id', userId);
    setBusyId(null);
    load();
  };

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>{branch.name} — Staff</Title>
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : staff.length === 0 ? (
        <Body style={styles.muted}>No staff yet — share this branch's invite code.</Body>
      ) : (
        staff.map((s) => (
          <Card key={s.id} style={styles.branchCard}>
            <Body>{s.name || s.phone}</Body>
            <View style={styles.spacer} />
            <Button
              label="Revoke staff access"
              variant="secondary"
              onPress={() => revoke(s.id)}
              loading={busyId === s.id}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.md },
  gap: { height: spacing.lg },
  gapSm: { height: spacing.sm },
  spacer: { height: spacing.md },
  error: { color: colors.negative, marginTop: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionFlex: { flex: 1 },
  branchCard: { marginBottom: spacing.sm },
  dangerCard: { borderColor: colors.negative },
});
