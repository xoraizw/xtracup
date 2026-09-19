import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ExploreScreen from '../screens/customer/ExploreScreen';
import CafeDetailScreen from '../screens/customer/CafeDetailScreen';
import MyPassesScreen from '../screens/customer/MyPassesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppHeader from '../components/AppHeader';
import TabBarButton from '../components/TabBarButton';
import RedemptionCelebration from '../components/RedemptionCelebration';
import { useAuth } from '../hooks/useAuth';
import { radii, spacing, type ColorPalette, type ShadowPalette } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import type { Cafe, PassTier } from '../types/database';

type Tab = 'passes' | 'explore' | 'profile';

export default function CustomerTabs() {
  const { pendingPurchase, setPendingPurchase } = useAuth();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [tab, setTab] = useState<Tab>('explore');
  const [openCafe, setOpenCafe] = useState<Cafe | null>(null);
  const [resumeTier, setResumeTier] = useState<PassTier | null>(null);

  // A signed-out visitor who picked a pass tier lands here right after
  // verifying their email (see useAuth's `pendingPurchase`) — resume them
  // straight onto that tier's payment step instead of the default "My
  // Passes" tab, one shot, then clear it so it doesn't re-trigger later.
  useEffect(() => {
    if (!pendingPurchase) return;
    setOpenCafe(pendingPurchase.cafe);
    setResumeTier(pendingPurchase.tier);
    setTab('explore');
    setPendingPurchase(null);
  }, [pendingPurchase, setPendingPurchase]);

  const goExplore = () => {
    setOpenCafe(null);
    setTab('explore');
  };

  return (
    <View style={styles.container}>
      <AppHeader onProfilePress={() => setTab('profile')} />
      <View style={styles.content}>
        {tab === 'passes' && <MyPassesScreen onExplore={goExplore} />}
        {tab === 'explore' &&
          (openCafe ? (
            <CafeDetailScreen
              cafe={openCafe}
              initialTier={resumeTier}
              onBack={() => {
                setOpenCafe(null);
                setResumeTier(null);
              }}
            />
          ) : (
            <ExploreScreen onOpenCafe={setOpenCafe} />
          ))}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          <TabBarButton icon="explore" label="Explore" active={tab === 'explore'} onPress={goExplore} />
          <TabBarButton icon="pass" label="My Passes" active={tab === 'passes'} onPress={() => setTab('passes')} />
          <TabBarButton icon="profile" label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} />
        </View>
      </View>
      <RedemptionCelebration />
    </View>
  );
}

function makeStyles(colors: ColorPalette, shadows: ShadowPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    tabBarWrap: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      ...shadows.raised,
    },
  });
}
