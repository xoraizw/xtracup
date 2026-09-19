import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { invokeFunction } from '../../lib/supabase';
import { Body, Button, Card, Label, Screen, Title } from '../../components/ui';
import { spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import type { Pass } from '../../types/database';

type PendingPass = Pass & { users: { name: string | null; phone: string } | null };

const STALE_AFTER_HOURS = 24;

function ageLabel(createdAt: string): { text: string; stale: boolean } {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const stale = hours > STALE_AFTER_HOURS;
  if (hours < 1) return { text: 'Just now', stale };
  if (hours < 24) return { text: `${Math.floor(hours)}h ago`, stale };
  return { text: `${Math.floor(hours / 24)}d ago`, stale };
}

export default function PendingPaymentsScreen() {
  const { supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pending, setPending] = useState<PendingPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('passes')
      .select('*, users(name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPending((data as PendingPass[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (passId: string) => {
    setBusyId(passId);
    setError(null);
    const { data, message } = await invokeFunction(supabase, 'confirm-payment', { pass_id: passId });
    setBusyId(null);
    if (!data?.ok) {
      setError(message ?? 'Could not confirm payment.');
      return;
    }
    load();
  };

  const reject = async (passId: string) => {
    setBusyId(passId);
    await supabase.from('passes').update({ status: 'rejected' }).eq('id', passId);
    setBusyId(null);
    load();
  };

  return (
    <Screen>
      <Title>Pending payments</Title>
      {error ? <Body style={styles.error}>{error}</Body> : null}
      {loading ? (
        <Body style={styles.muted}>Loading…</Body>
      ) : pending.length === 0 ? (
        <Body style={styles.muted}>No payments waiting on confirmation.</Body>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => {
            const age = ageLabel(item.created_at);
            return (
            <Card>
              <View style={styles.headerRow}>
                <Label>Customer</Label>
                <Body style={age.stale ? styles.staleAge : styles.muted}>{age.text}</Body>
              </View>
              <Body>{item.users?.name || item.users?.phone || 'Unknown'}</Body>
              <View style={styles.gapSm} />
              <Label>Transaction reference</Label>
              <Body>{item.payment_ref}</Body>
              <View style={styles.gapSm} />
              <Label>Cups</Label>
              <Body>{item.cups_total}</Body>
              {age.stale ? (
                <Body style={styles.staleWarning}>
                  Waiting over {STALE_AFTER_HOURS}h — consider rejecting if payment never came through.
                </Body>
              ) : null}
              <View style={styles.actionRow}>
                <View style={styles.actionFlex}>
                  <Button
                    label="Confirm"
                    onPress={() => confirm(item.id)}
                    loading={busyId === item.id}
                  />
                </View>
                <View style={styles.actionFlex}>
                  <Button
                    label="Reject"
                    variant="secondary"
                    onPress={() => reject(item.id)}
                    disabled={busyId === item.id}
                  />
                </View>
              </View>
            </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary },
    error: { color: colors.negative, marginBottom: spacing.md },
    gap: { height: spacing.md },
    gapSm: { height: spacing.sm },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    staleAge: { color: colors.negative },
    staleWarning: { color: colors.negative, marginTop: spacing.sm, fontSize: 13 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionFlex: { flex: 1 },
  });
}
