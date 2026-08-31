import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';
import { colors, fonts, spacing } from '../theme/theme';

const ROLE_SUBTITLE: Record<string, string> = {
  customer: '',
  staff: 'Café staff',
  owner: 'Owner',
};

function firstName(fullName: string | null): string {
  if (!fullName) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

// Sits at the top of each role's tab shell (above the tab content, outside
// each individual screen's own <Screen> wrapper) so every tab within a
// shell shares one consistent header instead of repeating it per screen.
export default function AppHeader() {
  const { profile } = useAuth();
  const subtitle = profile ? ROLE_SUBTITLE[profile.role] : '';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.row}>
        <Logo size={32} />
        <View style={styles.textCol}>
          <Text style={styles.greeting}>Hi, {firstName(profile?.name ?? null)}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  textCol: {
    flexShrink: 1,
  },
  greeting: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
