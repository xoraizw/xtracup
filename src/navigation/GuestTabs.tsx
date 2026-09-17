import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExploreScreen from '../screens/customer/ExploreScreen';
import CafeDetailScreen from '../screens/customer/CafeDetailScreen';
import AuthScreen from '../screens/AuthScreen';
import Logo from '../components/Logo';
import { Body, Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { colors, fonts, shadows, spacing } from '../theme/theme';
import type { Cafe, PassTier } from '../types/database';

// The signed-out experience: browse cafés and pass tiers freely, no
// account needed. Only picking a specific tier (or tapping "Log in")
// surfaces AuthScreen — Clerk's isSignedIn flipping true is what actually
// advances the app past this shell (see RootNavigator in App.tsx);
// `onCancel` just lets someone back out of AuthScreen to keep browsing.
export default function GuestTabs() {
  const { setPendingPurchase } = useAuth();
  const [openCafe, setOpenCafe] = useState<Cafe | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const requireAuth = (cafe: Cafe, tier: PassTier) => {
    setPendingPurchase({ cafe, tier });
    setShowAuth(true);
  };

  if (showAuth) {
    return (
      <AuthScreen
        onCancel={() => {
          setPendingPurchase(null);
          setShowAuth(false);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Logo size={28} />
            <Body style={styles.wordmark}>XtraCup</Body>
          </View>
          <Button label="Sign up" size="compact" onPress={() => setShowAuth(true)} />
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        {openCafe ? (
          <CafeDetailScreen cafe={openCafe} onBack={() => setOpenCafe(null)} onRequireAuth={requireAuth} />
        ) : (
          <ExploreScreen onOpenCafe={setOpenCafe} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    ...shadows.card,
    shadowOpacity: 0.05,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.textPrimary },
  content: { flex: 1 },
});
