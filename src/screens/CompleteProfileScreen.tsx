import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { Body, Button, Card, Input, Label, Screen, Title } from '../components/ui';
import { spacing, colors } from '../theme/theme';
import JoinStaffScreen from './JoinStaffScreen';

export default function CompleteProfileScreen() {
  const { user } = useUser();
  const { supabase, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningStaff, setJoiningStaff] = useState(false);

  const save = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.from('users').insert({
      id: user.id,
      phone: user.primaryEmailAddress?.emailAddress ?? '',
      name,
      role: 'customer',
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
  };

  if (joiningStaff) {
    return (
      <JoinStaffScreen
        needsName
        onJoined={refreshProfile}
        onCancel={() => setJoiningStaff(false)}
      />
    );
  }

  return (
    <Screen includeTopInset>
      <Title>Almost there</Title>
      <Body style={styles.muted}>What should we call you?</Body>
      <Card>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="Your name" />
        <View style={styles.spacer} />
        <Button label="Continue" onPress={save} loading={loading} disabled={!name} />
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </Card>
      <View style={styles.spacer} />
      <Button label="I'm café staff — join with a code" variant="secondary" onPress={() => setJoiningStaff(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.lg },
  spacer: { height: spacing.md },
  error: { color: colors.negative, marginTop: spacing.md },
});
