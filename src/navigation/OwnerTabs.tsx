import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ManageCafesScreen from '../screens/owner/ManageCafesScreen';
import MetricsScreen from '../screens/owner/MetricsScreen';
import HistoryScreen from '../screens/owner/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppHeader from '../components/AppHeader';
import TabBarButton from '../components/TabBarButton';
import { colors, spacing } from '../theme/theme';

type Tab = 'cafes' | 'profile';
type CafesSection =
  | { view: 'manage' }
  | { view: 'metrics'; cafe: { id: string; name: string } | null }
  | { view: 'history'; cafe: { id: string; name: string } | null };

// Owner is the platform operator, not tied to any cafe — no Scan/Pending/
// Today (those are cafe-scoped staff tools) and no customer-view toggle
// (owner never buys/holds a pass). Metrics and Pass History are reached
// per-cafe from inside Manage Cafes, or as an all-cafes aggregate from here.
export default function OwnerTabs() {
  const [tab, setTab] = useState<Tab>('cafes');
  const [cafesSection, setCafesSection] = useState<CafesSection>({ view: 'manage' });

  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.content}>
        {tab === 'cafes' && (
          <>
            {cafesSection.view === 'manage' && (
              <ManageCafesScreen
                onOpenCafeMetrics={(cafe) => setCafesSection({ view: 'metrics', cafe })}
                onOpenCafeHistory={(cafe) => setCafesSection({ view: 'history', cafe })}
              />
            )}
            {cafesSection.view === 'metrics' && (
              <MetricsScreen
                onBack={() => setCafesSection({ view: 'manage' })}
                cafeFilter={cafesSection.cafe}
              />
            )}
            {cafesSection.view === 'history' && (
              <HistoryScreen
                onBack={() => setCafesSection({ view: 'manage' })}
                cafeFilter={cafesSection.cafe}
              />
            )}
          </>
        )}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <View style={styles.tabBar}>
        <TabBarButton
          icon="manageCafes"
          label="Manage Cafés"
          active={tab === 'cafes'}
          onPress={() => {
            setTab('cafes');
            setCafesSection({ view: 'manage' });
          }}
        />
        <TabBarButton icon="profile" label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
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
