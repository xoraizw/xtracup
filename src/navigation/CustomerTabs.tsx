import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ExploreScreen from '../screens/customer/ExploreScreen';
import CafeDetailScreen from '../screens/customer/CafeDetailScreen';
import MyPassesScreen from '../screens/customer/MyPassesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppHeader from '../components/AppHeader';
import TabBarButton from '../components/TabBarButton';
import RedemptionCelebration from '../components/RedemptionCelebration';
import { colors, spacing } from '../theme/theme';
import type { Cafe } from '../types/database';

type Tab = 'passes' | 'explore' | 'profile';

export default function CustomerTabs() {
  const [tab, setTab] = useState<Tab>('passes');
  const [openCafe, setOpenCafe] = useState<Cafe | null>(null);

  const goExplore = () => {
    setOpenCafe(null);
    setTab('explore');
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.content}>
        {tab === 'passes' && <MyPassesScreen onExplore={goExplore} />}
        {tab === 'explore' &&
          (openCafe ? (
            <CafeDetailScreen cafe={openCafe} onBack={() => setOpenCafe(null)} />
          ) : (
            <ExploreScreen onOpenCafe={setOpenCafe} />
          ))}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <View style={styles.tabBar}>
        <TabBarButton icon="pass" label="My Passes" active={tab === 'passes'} onPress={() => setTab('passes')} />
        <TabBarButton icon="explore" label="Explore" active={tab === 'explore'} onPress={goExplore} />
        <TabBarButton icon="profile" label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
      <RedemptionCelebration />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});
