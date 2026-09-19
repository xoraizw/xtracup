import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { Body, Button, Card, Input, Label, Screen, Title } from '../components/ui';
import { spacing, type ColorPalette } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { STAFF_OWNER_POV_ENABLED } from '../config/features';
import JoinStaffScreen from './JoinStaffScreen';

export default function CompleteProfileScreen() {
  const { user } = useUser();
  const { supabase, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningStaff, setJoiningStaff] = useState(false);
  const autoSubmitted = useRef(false);

  const save = async (nameValue: string) => {
    if (!user) return;
    setError(null);
    setLoading(true);
    const age = user.unsafeMetadata?.age;
    const { error: err } = await supabase.from('users').insert({
      id: user.id,
      phone: user.primaryEmailAddress?.emailAddress ?? '',
      name: nameValue,
      age: typeof age === 'number' ? age : null,
      role: 'customer',
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
  };

  // Sign-up (see AuthScreen) already collects name (and age, via
  // unsafeMetadata) up front — when it's there, finish silently instead of
  // asking again. The manual form below only shows for the rare account
  // that reached here without a name already on file.
  useEffect(() => {
    if (autoSubmitted.current) return;
    if (user?.firstName) {
      autoSubmitted.current = true;
      save(user.firstName);
    }
  }, [user?.firstName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (joiningStaff) {
    return (
      <JoinStaffScreen
        needsName
        onJoined={refreshProfile}
        onCancel={() => setJoiningStaff(false)}
      />
    );
  }

  if (user?.firstName) {
    return (
      <Screen includeTopInset>
        <View style={styles.settingUp}>
          <ActivityIndicator color={colors.accent} />
          <Body style={styles.muted}>Setting up your account…</Body>
          {error ? <Body style={styles.error}>{error}</Body> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen includeTopInset scroll>
      <Title>Almost there</Title>
      <Body style={styles.muted}>What should we call you?</Body>
      <Card>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="Your name" />
        <View style={styles.spacer} />
        <Button label="Continue" onPress={() => save(name)} loading={loading} disabled={!name} />
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </Card>
      {STAFF_OWNER_POV_ENABLED ? (
        <>
          <View style={styles.spacer} />
          <Button label="I'm café staff — join with a code" variant="secondary" onPress={() => setJoiningStaff(true)} />
        </>
      ) : null}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.lg },
    spacer: { height: spacing.md },
    error: { color: colors.negative, marginTop: spacing.md },
    settingUp: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  });
}
