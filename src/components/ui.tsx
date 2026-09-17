import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, shadows, spacing } from '../theme/theme';

export function Screen({
  children,
  includeTopInset = false,
  scroll = false,
}: {
  children: React.ReactNode;
  // Screens rendered inside a role tab shell sit below AppHeader, which
  // already claims the top safe-area inset — defaulting this to false
  // avoids double-padding under the status bar/notch. The handful of
  // screens that render before any tab shell exists (AuthScreen,
  // CompleteProfileScreen, AcceptLegalScreen) pass true.
  includeTopInset?: boolean;
  // Wraps children in a keyboard-avoiding ScrollView instead of a plain
  // View. Needed for anything that's mostly a form — without it, once the
  // keyboard is up, fields below the fold (and the submit button) are
  // simply unreachable with no way to scroll to them. Screens that already
  // manage their own scrolling (a FlatList/ScrollView list of content)
  // should leave this off rather than nesting scroll containers.
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={includeTopInset ? ['top', 'bottom'] : ['bottom']}>
      {scroll ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.screenInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screenInner}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
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

export function IconButton({
  children,
  onPress,
  variant = 'surface',
}: {
  children: React.ReactNode;
  onPress: () => void;
  // 'surface' sits on a page (subtle shadow); 'overlay' floats on top of a
  // photo (translucent dark scrim so it stays legible on any image).
  variant?: 'surface' | 'overlay';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        variant === 'overlay' ? styles.iconButtonOverlay : styles.iconButtonSurface,
        pressed && styles.iconButtonPressed,
      ]}
    >
      {children}
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

const BADGE_VARIANTS = {
  accent: { bg: colors.accentSoft, fg: colors.accent },
  positive: { bg: colors.positiveSoft, fg: colors.positive },
  negative: { bg: colors.negativeSoft, fg: colors.negative },
  neutral: { bg: colors.surfaceRaised, fg: colors.textSecondary },
  // A translucent dark scrim so the label stays legible sitting directly on
  // top of any photo, regardless of the photo's own colors.
  onPhoto: { bg: 'rgba(43, 30, 18, 0.55)', fg: colors.onAccent },
} as const;

export function Badge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: keyof typeof BADGE_VARIANTS;
}) {
  const tone = BADGE_VARIANTS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeLabel, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string | null | undefined; size?: number }) {
  const initials = (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLabel, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      {icon ? <View style={styles.emptyStateIcon}>{icon}</View> : null}
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptyStateSubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.emptyStateAction}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

// Shared bottom-sheet chrome (backdrop, rounded top, drag handle, safe-area
// padding) — pulled out of PassTierModal so any future sheet-style modal
// reuses the same look instead of re-implementing it.
export function Sheet({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            {children}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'default',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  // 'compact' is for buttons sitting in tight chrome (a header, a card
  // footer) that shouldn't claim a full-size button's height/width.
  size?: 'default' | 'compact';
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' && styles.buttonCompact,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.accent} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            size === 'compact' && styles.buttonLabelCompact,
            variant === 'secondary' && styles.buttonLabelSecondary,
            variant === 'ghost' && styles.buttonLabelGhost,
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
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenInner: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.textPrimary,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSurface: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  iconButtonOverlay: {
    backgroundColor: 'rgba(43, 30, 18, 0.45)',
  },
  iconButtonPressed: {
    opacity: 0.75,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.card,
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  avatar: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontFamily: fonts.displayMedium,
    color: colors.accent,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateAction: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 30, 18, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetSafeArea: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  sheetHandleRow: { alignItems: 'center', marginBottom: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairlineStrong },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
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
    color: colors.onAccent,
  },
  buttonLabelCompact: {
    fontSize: 14,
  },
  buttonLabelSecondary: {
    color: colors.textPrimary,
  },
  buttonLabelGhost: {
    color: colors.accent,
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
