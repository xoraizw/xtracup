import React, { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../hooks/useAuth';
import { invokeFunction } from '../../lib/supabase';
import { Body, Button, Card, Screen, Title } from '../../components/ui';
import { colors, spacing } from '../../theme/theme';

type ScanResult = {
  ok: boolean;
  message: string;
  cupsRemaining?: number;
  customerName?: string;
  // Distinguishes a network/transport failure (worth an immediate retry —
  // the same QR is still valid within its ~35s window) from a business
  // rejection returned by the function itself (expired, wrong cafe, no cups
  // left — retrying the same code won't help, needs a fresh scan).
  transient?: boolean;
};

type ParsedQr = { pass_id?: string; token?: string };
// Stage machine for the redeem flow: a scan only ever fetches a PREVIEW
// (no balance mutation) — staff must explicitly confirm before the real
// redeem call fires, so a stray/misdirected scan can't silently cost a cup.
type Stage = 'scanning' | 'confirming' | 'done';

export default function ScanScreen() {
  const { isSignedIn, supabase } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastPayload, setLastPayload] = useState<ParsedQr | null>(null);
  const celebrate = useRef(new Animated.Value(0)).current;

  const playCelebration = () => {
    celebrate.setValue(0);
    Animated.timing(celebrate, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  };

  const fetchPreview = async (parsed: ParsedQr) => {
    setBusy(true);
    const { data, message, transient } = await invokeFunction(supabase, 'redeem', {
      pass_id: parsed.pass_id,
      token: parsed.token,
      preview: true,
    });
    setBusy(false);

    if (!data?.ok) {
      setResult({ ok: false, message: message ?? 'Could not read this code.', transient });
      setStage('done');
      return;
    }

    setResult({
      ok: true,
      message: 'Ready to redeem',
      cupsRemaining: data.cups_remaining,
      customerName: data.customer_name,
    });
    setStage('confirming');
  };

  const confirmRedeem = async () => {
    if (!lastPayload) return;
    setBusy(true);
    const { data, message, transient } = await invokeFunction(supabase, 'redeem', {
      pass_id: lastPayload.pass_id,
      token: lastPayload.token,
    });
    setBusy(false);

    if (!data?.ok) {
      setResult({ ok: false, message: message ?? 'Redemption failed.', transient });
      setStage('done');
      return;
    }

    setResult({
      ok: true,
      message: 'Redeemed',
      cupsRemaining: data.cups_remaining,
      customerName: data.customer_name,
    });
    setStage('done');
    playCelebration();
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (stage !== 'scanning' || busy || !isSignedIn) return;

    let parsed: ParsedQr;
    try {
      parsed = JSON.parse(data);
    } catch {
      setResult({ ok: false, message: 'Unrecognized QR code.' });
      setStage('done');
      return;
    }

    setLastPayload(parsed);
    await fetchPreview(parsed);
  };

  const retry = () => {
    if (lastPayload) fetchPreview(lastPayload);
  };

  const scanAgain = () => {
    setResult(null);
    setLastPayload(null);
    setStage('scanning');
  };

  if (!permission) {
    return (
      <Screen>
        <Body>Checking camera permission…</Body>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Title>Camera access needed</Title>
        <Body style={styles.muted}>Staff need camera access to scan customer QR codes.</Body>
        <Button label="Grant permission" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Scan to redeem</Title>
      {stage === 'scanning' ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
        </View>
      ) : stage === 'confirming' ? (
        <Card style={styles.confirmCard}>
          <Title>Redeem 1 cup?</Title>
          <Body style={styles.confirmName}>{result?.customerName ?? 'Customer'}</Body>
          <Body style={styles.muted}>{result?.cupsRemaining} cups remaining before this redemption</Body>
          <View style={styles.spacer} />
          <Button label="Confirm redemption" onPress={confirmRedeem} loading={busy} />
          <View style={styles.spacer} />
          <Button label="Cancel" variant="secondary" onPress={scanAgain} disabled={busy} />
        </Card>
      ) : (
        <Card style={result?.ok ? styles.successCard : styles.errorCard}>
          {result?.ok ? (
            <Animated.View
              style={{
                opacity: celebrate,
                transform: [{ scale: celebrate.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
              }}
            >
              <Body style={styles.celebrateEmoji}>☕✨</Body>
              <Title>Cup redeemed!</Title>
              <Body>{result.customerName ?? 'Customer'}</Body>
              <Body style={styles.muted}>{result.cupsRemaining} cups remaining</Body>
            </Animated.View>
          ) : (
            <>
              <Title>{result?.transient ? 'Connection problem' : 'Could not redeem'}</Title>
              <Body style={styles.muted}>{result?.message}</Body>
            </>
          )}
          <View style={styles.spacer} />
          {result?.transient ? (
            <>
              <Button label="Try again" onPress={retry} loading={busy} />
              <View style={styles.spacer} />
              <Button label="Scan a different code" variant="secondary" onPress={scanAgain} disabled={busy} />
            </>
          ) : (
            <Button label="Scan next" onPress={scanAgain} />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.lg },
  cameraWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  camera: { flex: 1 },
  confirmCard: { borderColor: colors.accent },
  confirmName: { fontSize: 18, marginTop: spacing.sm, marginBottom: spacing.xs, color: colors.textPrimary },
  successCard: { borderColor: colors.positive },
  errorCard: { borderColor: colors.negative },
  celebrateEmoji: { fontSize: 40, marginBottom: spacing.sm },
  spacer: { height: spacing.md },
});
