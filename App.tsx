import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  useFonts as useSoraFonts,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  useFonts as useJakartaFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import IntroScreen from './src/screens/IntroScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import AcceptLegalScreen from './src/screens/AcceptLegalScreen';
import CustomerTabs from './src/navigation/CustomerTabs';
import GuestTabs from './src/navigation/GuestTabs';
import StaffTabs from './src/navigation/StaffTabs';
import OwnerTabs from './src/navigation/OwnerTabs';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { STAFF_OWNER_POV_ENABLED } from './src/config/features';

SplashScreen.preventAutoHideAsync().catch(() => {});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Check your .env file.');
}

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function RootNavigator() {
  const { isSignedIn, isLoaded } = useClerkAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <GuestTabs />;

  return <SignedInNavigator />;
}

function SignedInNavigator() {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!profile) return <CompleteProfileScreen />;
  if (!profile.legal_accepted_at) return <AcceptLegalScreen />;

  // Staff/Owner POV is temporarily hidden while the app is redesigned as a
  // customer-only experience — see src/config/features.ts.
  if (!STAFF_OWNER_POV_ENABLED) return <CustomerTabs />;

  // Owner is the platform operator (no cafe_id) — never buys/holds a pass,
  // so unlike before there's no customer-view toggle for this role.
  if (profile.role === 'owner') return <OwnerTabs />;
  if (profile.role === 'staff') return <StaffTabs />;
  return <CustomerTabs />;
}

export default function App() {
  const [soraLoaded] = useSoraFonts({ Sora_600SemiBold, Sora_700Bold });
  const [jakartaLoaded] = useJakartaFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });
  // Shown once per app launch, after the native splash (static image) hides
  // and before Clerk/auth routing — this is where the animated pour lives,
  // since the native splash config can't animate.
  const [introDone, setIntroDone] = useState(false);

  const onLayout = useCallback(async () => {
    if (soraLoaded && jakartaLoaded) await SplashScreen.hideAsync();
  }, [soraLoaded, jakartaLoaded]);

  if (!soraLoaded || !jakartaLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }} onLayout={onLayout}>
          {introDone ? (
            <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </ClerkProvider>
          ) : (
            <IntroScreen onDone={() => setIntroDone(true)} />
          )}
          <ThemedStatusBar />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}
