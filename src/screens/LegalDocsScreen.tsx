import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Text } from 'react-native';
import { BackLink, Body, Screen, Title } from '../components/ui';
import { colors, fonts, spacing } from '../theme/theme';
import { LEGAL_DOCS } from '../content/legal';

// Standalone viewer, reached from Profile — the acceptance gate
// (AcceptLegalScreen) renders the same tab strip + doc body inline instead
// of using this wrapper, since it needs its own Accept action below.
export default function LegalDocsScreen({ onBack }: { onBack: () => void }) {
  const [activeKey, setActiveKey] = useState(LEGAL_DOCS[0].key);
  const activeDoc = LEGAL_DOCS.find((d) => d.key === activeKey)!;

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Legal</Title>
      <LegalDocTabs activeKey={activeKey} onSelect={setActiveKey} />
      <LegalDocBody doc={activeDoc} />
    </Screen>
  );
}

export function LegalDocTabs({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect: (key: (typeof LEGAL_DOCS)[number]['key']) => void;
}) {
  return (
    <View style={styles.tabRow}>
      {LEGAL_DOCS.map((d) => (
        <Pressable key={d.key} style={styles.tabButton} onPress={() => onSelect(d.key)}>
          <Text style={[styles.tabLabel, activeKey === d.key && styles.tabLabelActive]}>{d.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LegalDocBody({ doc }: { doc: (typeof LEGAL_DOCS)[number] }) {
  return (
    <ScrollView style={styles.docScroll} showsVerticalScrollIndicator={false}>
      <Body style={styles.updatedLabel}>{doc.updatedLabel}</Body>
      <Body style={styles.docBody}>{doc.body}</Body>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
    color: colors.textSecondary,
  },
  tabLabelActive: { color: colors.accent },
  docScroll: { flex: 1 },
  updatedLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  docBody: {
    color: colors.textPrimary,
  },
});
