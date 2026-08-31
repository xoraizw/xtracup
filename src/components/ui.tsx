import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../theme/theme';

export function Screen({
  children,
  includeTopInset = false,
}: {
  children: React.ReactNode;
  // Screens rendered inside a role tab shell sit below AppHeader, which
  // already claims the top safe-area inset — defaulting this to false
  // avoids double-padding under the status bar/notch. The handful of
  // screens that render before any tab shell exists (AuthScreen,
  // CompleteProfileScreen, AcceptLegalScreen) pass true.
  includeTopInset?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={includeTopInset ? ['top', 'bottom'] : ['bottom']}>
      <View style={styles.screenInner}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function BackLink({ label = '← Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backLink}>
      <Text style={styles.backLinkLabel}>{label}</Text>
    </Pressable>
  );
}

export function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function StatTile({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.accent} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'secondary' && styles.buttonLabelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenInner: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  backLink: {
    marginBottom: spacing.md,
  },
  backLinkLabel: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 12,
    color: colors.accent,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  statTile: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontVariant: ['tabular-nums'],
    fontSize: 34,
    color: colors.accent,
  },
  statCaption: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.background,
  },
  buttonLabelSecondary: {
    color: colors.textPrimary,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
});
