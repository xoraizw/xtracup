import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import TabIcon, { TabIconName } from './TabIcon';
import { colors, fonts } from '../theme/theme';

// Shared bottom-tab button for all three role shells (Customer/Staff/Owner)
// — icon above label, tinted together by active state, on the warm rounded
// UI font rather than the old mono/uppercase treatment.
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
      <TabIcon name={icon} color={tint} size={20} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
  },
});
