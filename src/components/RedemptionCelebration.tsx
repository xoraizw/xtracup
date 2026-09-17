import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, fonts, radii, shadows, spacing } from '../theme/theme';
import type { Pass } from '../types/database';

// Mounted once at the customer tab shell so it can pop up over whatever
// screen is currently showing, not just PassDetailScreen — a redemption can
// happen while the customer is browsing Explore or their Profile. Listens
// for any UPDATE on the customer's own passes and shows a brief celebratory
// overlay whenever cups_remaining drops, without needing that specific pass
// screen to be mounted.
export default function RedemptionCelebration() {
  const { supabase, profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [cupsRemaining, setCupsRemaining] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const lastCupsByPass = useRef<Map<string, number>>(new Map());
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`customer-passes-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'passes', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const pass = payload.new as Pass;
          const previous = lastCupsByPass.current.get(pass.id) ?? pass.cups_total;
          lastCupsByPass.current.set(pass.id, pass.cups_remaining);
          if (pass.cups_remaining < previous) {
            celebrate(pass.cups_remaining);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [supabase, profile?.id]);

  const celebrate = (remaining: number) => {
    setCupsRemaining(remaining);
    setVisible(true);
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.back(1.8)),
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(anim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setVisible(false), 1800);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.card,
          {
            opacity: anim,
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}
      >
        <Text style={styles.emoji}>☕✨</Text>
        <Text style={styles.title}>Cup redeemed!</Text>
        <Text style={styles.subtitle}>{cupsRemaining} cups remaining</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.positive,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.4,
    alignItems: 'center',
    ...shadows.raised,
  },
  emoji: { fontSize: 40, marginBottom: spacing.sm },
  title: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
