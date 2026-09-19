import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TabIcon, { TabIconName } from './TabIcon';
import { colors, fonts, radii } from '../theme/theme';

// Shared bottom-tab button for all three role shells (Customer/Staff/Owner)
// — icon above label, tinted together by active state, with a soft pill
// highlight behind the active tab so it reads clearly against the light
// floating tab bar.
export default function TabBarButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: TabIconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const tint = active ? colors.accent : colors.textSecondary;
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={[styles.pill, active && styles.pillActive]}>
        <TabIcon name={icon} color={tint} size={20} />
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    // Without this, Android can paint the background fill before the
    // corner-radius clip applies on a re-layout (e.g. switching tabs changes
    // this view's width) — the highlight then flashes as a square before
    // settling into the pill shape.
    overflow: 'hidden',
  },
  pillActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
  },
});
