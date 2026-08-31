import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ScanScreen from '../screens/staff/ScanScreen';
import PendingPaymentsScreen from '../screens/staff/PendingPaymentsScreen';
import RedemptionsScreen from '../screens/staff/RedemptionsScreen';
import PassTiersScreen from '../screens/staff/PassTiersScreen';
import PhotosScreen from '../screens/staff/PhotosScreen';
import BranchesScreen from '../screens/staff/BranchesScreen';
import OrderHistoryScreen from '../screens/staff/OrderHistoryScreen';
import StaffCafeHubScreen from '../screens/staff/StaffCafeHubScreen';
import MetricsScreen from '../screens/owner/MetricsScreen';
import HistoryScreen from '../screens/owner/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppHeader from '../components/AppHeader';
import TabBarButton from '../components/TabBarButton';
import { colors, spacing } from '../theme/theme';

type Tab = 'scan' | 'pending' | 'today' | 'cafe' | 'profile';
type CafeSection = 'home' | 'tiers' | 'photos' | 'branches' | 'metrics' | 'history' | 'orders';

export default function StaffTabs() {
  const [tab, setTab] = useState<Tab>('scan');
  const [cafeSection, setCafeSection] = useState<CafeSection>('home');

  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.content}>
        {tab === 'scan' && <ScanScreen />}
        {tab === 'pending' && <PendingPaymentsScreen />}
        {tab === 'today' && <RedemptionsScreen />}
        {tab === 'cafe' && (
          <>
            {cafeSection === 'home' && <StaffCafeHubScreen onSelect={setCafeSection} />}
            {cafeSection === 'tiers' && <PassTiersScreen onBack={() => setCafeSection('home')} />}
            {cafeSection === 'photos' && <PhotosScreen onBack={() => setCafeSection('home')} />}
            {cafeSection === 'branches' && <BranchesScreen onBack={() => setCafeSection('home')} />}
            {cafeSection === 'metrics' && <MetricsScreen onBack={() => setCafeSection('home')} />}
            {cafeSection === 'history' && <HistoryScreen onBack={() => setCafeSection('home')} />}
            {cafeSection === 'orders' && <OrderHistoryScreen onBack={() => setCafeSection('home')} />}
          </>
        )}
        {tab === 'profile' && <ProfileScreen />}
      </View>
      <View style={styles.tabBar}>
        <TabBarButton icon="scan" label="Scan" active={tab === 'scan'} onPress={() => setTab('scan')} />
        <TabBarButton icon="pending" label="Pending" active={tab === 'pending'} onPress={() => setTab('pending')} />
        <TabBarButton icon="today" label="Today" active={tab === 'today'} onPress={() => setTab('today')} />
        <TabBarButton
          icon="cafe"
          label="Café"
          active={tab === 'cafe'}
          onPress={() => {
            setTab('cafe');
            setCafeSection('home');
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
