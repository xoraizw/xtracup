import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { Avatar, BackLink, Body, Card, Screen, Subtitle, Title } from '../components/ui';
import { fonts, spacing, type ColorPalette } from '../theme/theme';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { STAFF_OWNER_POV_ENABLED } from '../config/features';
import LegalDocsScreen from './LegalDocsScreen';
import JoinStaffScreen from './JoinStaffScreen';

const ROLE_LABEL: Record<string, string> = {
  customer: 'Customer',
  staff: 'Staff',
  owner: 'Owner',
};

function ProfileRow({ label, onPress, tone }: { label: string; onPress: () => void; tone?: 'negative' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Body style={[styles.rowLabel, tone === 'negative' && styles.rowLabelNegative]}>{label}</Body>
      <Body style={styles.chevron}>›</Body>
    </Pressable>
  );
}

function AppearanceRow() {
  const { mode, setMode, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const options: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];
  return (
    <View style={styles.row}>
      <Body style={styles.rowLabel}>Appearance</Body>
      <View style={styles.segmented}>
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setMode(opt.key)}
            style={[styles.segment, mode === opt.key && styles.segmentActive]}
          >
            <Body style={[styles.segmentLabel, mode === opt.key && styles.segmentLabelActive]}>{opt.label}</Body>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// onBack is present only when nested inside another shell's own tab
// (currently the Owner hub) — CustomerTabs/StaffTabs render this directly
// as a top-level tab and don't pass it.
export default function ProfileScreen({ onBack }: { onBack?: () => void }) {
  const { user } = useUser();
  const { profile, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

      <Card style={styles.identityCard}>
        <Avatar name={profile?.name} size={56} />
        <View style={styles.identityText}>
          <Subtitle>{profile?.name || 'There'}</Subtitle>
          <Body style={styles.muted}>{user?.primaryEmailAddress?.emailAddress || profile?.phone || '—'}</Body>
          <Body style={styles.muted}>{profile ? ROLE_LABEL[profile.role] ?? profile.role : '—'}</Body>
        </View>
      </Card>

      <View style={styles.spacer} />
      <Card style={styles.menuCard}>
        <AppearanceRow />
        <View style={styles.divider} />
        {STAFF_OWNER_POV_ENABLED && profile?.role === 'customer' ? (
          <ProfileRow label="I'm café staff — join with a code" onPress={() => setJoiningStaff(true)} />
        ) : null}
        <ProfileRow label="Legal (Terms, Refunds, Privacy)" onPress={() => setShowLegal(true)} />
        <View style={styles.divider} />
        <ProfileRow label="Sign out" onPress={signOut} tone="negative" />
      </Card>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    identityText: { flexShrink: 1 },
    muted: { color: colors.textSecondary, fontSize: 13 },
    spacer: { height: spacing.md },
    menuCard: { padding: 0, overflow: 'hidden' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rowPressed: { backgroundColor: colors.surfaceRaised },
    rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textPrimary },
    rowLabelNegative: { color: colors.negative },
    chevron: { color: colors.textSecondary, fontSize: 18 },
    divider: { height: 1, backgroundColor: colors.hairline, marginHorizontal: spacing.lg },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceRaised,
      borderRadius: 999,
      padding: 3,
    },
    segment: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    segmentLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    segmentLabelActive: {
      color: colors.onAccent,
    },
  });
}
