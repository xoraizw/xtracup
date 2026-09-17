import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { invokeFunction } from '../lib/supabase';
import { Body, Button, Card, Input, Label, Screen, Title } from '../components/ui';
import { spacing, colors } from '../theme/theme';

// Reached either from CompleteProfileScreen (brand-new sign-up going
// straight to staff) or a "Become staff" link for existing customers —
// needsName controls whether the name field renders.
export default function JoinStaffScreen({
  needsName,
  onJoined,
  onCancel,
}: {
  needsName: boolean;
  onJoined: () => void;
  onCancel: () => void;
}) {
  const { user } = useUser();
  const { supabase, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { data, message } = await invokeFunction(supabase, 'join-staff', {
      invite_code: inviteCode.trim(),
      name: needsName ? name : undefined,
      email: needsName ? user.primaryEmailAddress?.emailAddress : undefined,
    });
    setLoading(false);
    if (!data?.ok) {
      setError(message ?? 'Could not join as staff.');
      return;
    }
    await refreshProfile();
    onJoined();
  };

  return (
    <Screen includeTopInset={needsName} scroll>
      <Title>Join as staff</Title>
      <Body style={styles.muted}>Enter the invite code your café manager gave you.</Body>
      <Card>
        {needsName ? (
          <>
            <Label>Name</Label>
            <Input value={name} onChangeText={setName} placeholder="Your name" />
            <View style={styles.spacer} />
          </>
        ) : null}
        <Label>Invite code</Label>
        <Input
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g. PILOT-STAFF-2026"
          autoCapitalize="characters"
        />
        <View style={styles.spacer} />
        <Button
          label="Join"
          onPress={join}
          loading={loading}
          disabled={!inviteCode || (needsName && !name)}
        />
        <View style={styles.spacer} />
        <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={loading} />
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.lg },
  spacer: { height: spacing.md },
  error: { color: colors.negative, marginTop: spacing.md },
});
