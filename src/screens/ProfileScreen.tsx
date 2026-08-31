import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { BackLink, Body, Button, Card, Label, Screen, Title } from '../components/ui';
import { colors, spacing } from '../theme/theme';
import LegalDocsScreen from './LegalDocsScreen';
import JoinStaffScreen from './JoinStaffScreen';

const ROLE_LABEL: Record<string, string> = {
  customer: 'Customer',
  staff: 'Staff',
  owner: 'Owner',
};

// onBack is present only when nested inside another shell's own tab
// (currently the Owner hub) — CustomerTabs/StaffTabs render this directly
// as a top-level tab and don't pass it.
export default function ProfileScreen({ onBack }: { onBack?: () => void }) {
  const { user } = useUser();
  const { profile, refreshProfile, signOut } = useAuth();
  const [showLegal, setShowLegal] = useState(false);
  const [joiningStaff, setJoiningStaff] = useState(false);

  if (showLegal) {
    return <LegalDocsScreen onBack={() => setShowLegal(false)} />;
  }

  if (joiningStaff) {
    return (
      <JoinStaffScreen
        needsName={false}
        onJoined={refreshProfile}
        onCancel={() => setJoiningStaff(false)}
      />
    );
  }

  return (
    <Screen>
      {onBack ? <BackLink onPress={onBack} /> : null}
      <Title>Profile</Title>
      <Card style={styles.card}>
        <Label>Name</Label>
        <Body>{profile?.name || '—'}</Body>
        <View style={styles.gap} />
        <Label>Email</Label>
        <Body>{user?.primaryEmailAddress?.emailAddress || profile?.phone || '—'}</Body>
        <View style={styles.gap} />
        <Label>Role</Label>
        <Body>{profile ? ROLE_LABEL[profile.role] ?? profile.role : '—'}</Body>
      </Card>

      {profile?.role === 'customer' ? (
        <>
          <View style={styles.spacer} />
          <Button
            label="I'm café staff — join with a code"
            variant="secondary"
            onPress={() => setJoiningStaff(true)}
          />
        </>
      ) : null}
      <View style={styles.spacer} />
      <Button label="Legal (Terms, Refunds, Privacy)" variant="secondary" onPress={() => setShowLegal(true)} />
      <View style={styles.spacer} />
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  gap: { height: spacing.md },
  spacer: { height: spacing.md },
});
