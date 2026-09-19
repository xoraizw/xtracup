import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/expo';
import { useAuth } from '../hooks/useAuth';
import { Body, Button, Screen, Title } from '../components/ui';
import { spacing, type ColorPalette } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { LEGAL_DOCS } from '../content/legal';
import { LegalDocBody, LegalDocTabs } from './LegalDocsScreen';

// One-time gate shown right after CompleteProfileScreen / JoinStaffScreen,
// before the app proceeds to any tab shell. Requires visiting each of the
// three documents at least once (not just the first) before Accept enables,
// then records legal_accepted_at on the user's own row — allowed under the
// existing "users update own profile" policy, no new RLS needed.
export default function AcceptLegalScreen() {
  const { user } = useUser();
  const { supabase, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeKey, setActiveKey] = useState(LEGAL_DOCS[0].key);
  const [visited, setVisited] = useState<Set<string>>(new Set([LEGAL_DOCS[0].key]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = LEGAL_DOCS.find((d) => d.key === activeKey)!;
  const allVisited = LEGAL_DOCS.every((d) => visited.has(d.key));

  const selectDoc = (key: (typeof LEGAL_DOCS)[number]['key']) => {
    setActiveKey(key);
    setVisited((prev) => new Set(prev).add(key));
  };

  const accept = async () => {
    if (!user) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase
      .from('users')
      .update({ legal_accepted_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
  };

  return (
    <Screen includeTopInset>
      <Title>Before you continue</Title>
      <Body style={styles.muted}>
        Review these — this pilot's terms may change before launch, and you'll be asked again if they do.
      </Body>
      <LegalDocTabs activeKey={activeKey} onSelect={selectDoc} />
      <LegalDocBody doc={activeDoc} />
      <View style={styles.footer}>
        {!allVisited ? (
          <Body style={styles.hint}>Tap through all three tabs to continue.</Body>
        ) : null}
        <Button label="I agree — continue" onPress={accept} loading={saving} disabled={!allVisited} />
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </View>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.md },
    footer: { paddingTop: spacing.md },
    hint: { color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 12 },
    error: { color: colors.negative, marginTop: spacing.md },
  });
}
