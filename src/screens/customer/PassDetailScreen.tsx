import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../hooks/useAuth';
import { invokeFunction } from '../../lib/supabase';
import { BackLink, Body, Card, Label, ProgressBar, Screen, StatTile, Title } from '../../components/ui';
import { spacing, type ColorPalette } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';
import type { Pass } from '../../types/database';

function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours}h ${remainingMinutes}m`;
}

// The QR/redemption view for a single pass — reached by tapping a card in
// MyPassesScreen. Live-updates the balance as staff redeem, and rotates a
// signed QR token every 25s so a screenshot goes stale quickly.
export default function PassDetailScreen({
  passId,
  onBack,
}: {
  passId: string;
  onBack: () => void;
}) {
  const { supabase } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pass, setPass] = useState<Pass | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [nextEligibleAt, setNextEligibleAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadPass = useCallback(async () => {
    const { data } = await supabase.from('passes').select('*').eq('id', passId).maybeSingle();
    setPass(data);
    setLoading(false);
  }, [supabase, passId]);

  useEffect(() => {
    loadPass();
  }, [loadPass]);

  // Mirrors the visit-window/cooldown rule the redeem Edge Function
  // enforces server-side (see 0012_visit_based_redemption_rules.sql /
  // redeem/index.ts) — purely informational here so the customer knows
  // when their next cup unlocks; the actual gate stays server-side. Only
  // ever shows a wait when a NEW visit is blocked by the cooldown — if the
  // customer is still inside an in-progress visit's window (and hasn't hit
  // the per-visit cap), there's nothing to wait for, so the QR stays up.
  const loadNextEligible = useCallback(async () => {
    if (!pass?.pass_tier_id) {
      setNextEligibleAt(null);
      return;
    }
    const { data: tier } = await supabase
      .from('pass_tiers')
      .select('visit_window_minutes, max_cups_per_visit, cooldown_hours')
      .eq('id', pass.pass_tier_id)
      .maybeSingle();
    if (!tier || (tier.visit_window_minutes <= 0 && tier.cooldown_hours <= 0)) {
      setNextEligibleAt(null);
      return;
    }
    const { data: recentRedemptions } = await supabase
      .from('redemptions')
      .select('redeemed_at')
      .eq('pass_id', pass.id)
      .is('refunded_at', null)
      .order('redeemed_at', { ascending: false })
      .limit(50);

    const mostRecent = recentRedemptions?.[0];
    const withinCurrentVisit =
      mostRecent && tier.visit_window_minutes > 0
        ? (Date.now() - new Date(mostRecent.redeemed_at).getTime()) / 60000 <= tier.visit_window_minutes
        : false;

    if (!mostRecent || withinCurrentVisit) {
      // No redemptions yet, or still inside the current visit — the visit
      // cap is enforced server-side on the actual redeem attempt, not
      // shown as a countdown here (it's a hard stop, not a timer).
      setNextEligibleAt(null);
      return;
    }
    if (tier.cooldown_hours <= 0) {
      setNextEligibleAt(null);
      return;
    }

    let visitStart = new Date(mostRecent.redeemed_at).getTime();
    for (let i = 1; i < (recentRedemptions?.length ?? 0); i++) {
      const prev = new Date(recentRedemptions![i - 1].redeemed_at).getTime();
      const cur = new Date(recentRedemptions![i].redeemed_at).getTime();
      if ((prev - cur) / 60000 > tier.visit_window_minutes) break;
      visitStart = cur;
    }
    setNextEligibleAt(new Date(visitStart + tier.cooldown_hours * 3600000));
  }, [supabase, pass?.id, pass?.pass_tier_id, pass?.cups_remaining]);

  useEffect(() => {
    loadNextEligible();
  }, [loadNextEligible]);

  useEffect(() => {
    if (!nextEligibleAt) return;
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [nextEligibleAt]);

  useEffect(() => {
    if (!pass) return;
    const channel = supabase
      .channel(`pass-${pass.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'passes', filter: `id=eq.${pass.id}` },
        (payload) => setPass(payload.new as Pass)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pass?.id, supabase]);

  const refreshToken = useCallback(async () => {
    if (!pass || pass.status !== 'active') return;
    const { data, message } = await invokeFunction(supabase, 'issue-redeem-token', {
      pass_id: pass.id,
    });
    if (data?.token) {
      setQrPayload(JSON.stringify({ pass_id: pass.id, token: data.token }));
      setTokenError(null);
    } else {
      setTokenError(message ?? 'Could not generate code.');
      if (message === 'This pass has expired') loadPass();
    }
  }, [pass, supabase, loadPass]);

  useEffect(() => {
    refreshToken();
    const interval = setInterval(refreshToken, 25000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  if (loading) {
    return (
      <Screen>
        <BackLink onPress={onBack} />
        <Body>Loading your pass…</Body>
      </Screen>
    );
  }

  if (!pass) {
    return (
      <Screen>
        <BackLink onPress={onBack} />
        <Body>Pass not found.</Body>
      </Screen>
    );
  }

  if (pass.status === 'pending') {
    return (
      <Screen>
        <BackLink onPress={onBack} />
        <Title>Payment pending confirmation</Title>
        <Body style={styles.muted}>
          Café staff will confirm your payment shortly. Your pass activates automatically once
          confirmed.
        </Body>
      </Screen>
    );
  }

  if (pass.status === 'expired') {
    return (
      <Screen>
        <BackLink onPress={onBack} />
        <Title>Pass expired</Title>
        <Body style={styles.muted}>
          {pass.cups_remaining > 0
            ? `This pass expired with ${pass.cups_remaining} cup${pass.cups_remaining === 1 ? '' : 's'} unused.`
            : 'This pass has expired.'}
        </Body>
      </Screen>
    );
  }

  const waitMs = nextEligibleAt ? nextEligibleAt.getTime() - now : 0;
  const isWaiting = waitMs > 0;

  return (
    <Screen>
      <BackLink onPress={onBack} />
      <Title>Your pass</Title>
      <View style={styles.statRow}>
        <StatTile value={String(pass.cups_remaining)} caption="Cups left" />
        <StatTile value={String(pass.cups_total)} caption="Total cups" />
      </View>
      <View style={styles.progressRow}>
        <ProgressBar progress={pass.cups_total ? pass.cups_remaining / pass.cups_total : 0} />
      </View>

      {isWaiting ? (
        <Card style={styles.waitCard}>
          <Label>Come back in</Label>
          <Title>{formatWait(waitMs)}</Title>
          <Body style={styles.muted}>This café limits how often a pass can be redeemed.</Body>
        </Card>
      ) : (
        <Card style={styles.qrCard}>
          <Label>Show this at checkout</Label>
          <View style={styles.qrWrap}>
            {qrPayload ? (
              <QRCode value={qrPayload} size={220} backgroundColor={colors.surface} color={colors.textPrimary} />
            ) : tokenError ? (
              <Body style={styles.error}>{tokenError}</Body>
            ) : (
              <Body style={styles.muted}>Generating code…</Body>
            )}
          </View>
          <Body style={styles.muted}>Refreshes automatically every 25 seconds</Body>
        </Card>
      )}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    muted: { color: colors.textSecondary, marginBottom: spacing.md },
    error: { color: colors.negative, marginBottom: spacing.md },
    statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    progressRow: { marginBottom: spacing.lg },
    qrCard: { alignItems: 'center' },
    qrWrap: { paddingVertical: spacing.lg },
    waitCard: { alignItems: 'center', paddingVertical: spacing.lg },
  });
}
