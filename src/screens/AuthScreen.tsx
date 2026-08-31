import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { Body, Button, Card, Input, Label, Screen, Title } from '../components/ui';
import Logo from '../components/Logo';
import { colors, spacing } from '../theme/theme';

type Stage = 'enter' | 'code';

export default function AuthScreen() {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>('enter');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!signInLoaded || !signUpLoaded) return;
    setError(null);
    setLoading(true);
    try {
      // Try sign-in first; if the email doesn't exist, fall back to sign-up.
      const attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
      if (!factor || !('emailAddressId' in factor)) {
        throw new Error('No verification method available for this email.');
      }
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      setMode('signIn');
      setStage('code');
    } catch (signInErr: any) {
      try {
        await signUp.create({ emailAddress: email });
        await signUp.prepareVerification({ strategy: 'email_code' });
        setMode('signUp');
        setStage('code');
      } catch (signUpErr: any) {
        setError(signUpErr?.errors?.[0]?.message ?? signInErr?.errors?.[0]?.message ?? 'Could not send code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp || loading) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signIn') {
        if (signIn.status === 'complete') {
          await setActiveSignIn({ session: signIn.createdSessionId });
          return;
        }
        const attempt = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
        if (attempt.status === 'complete') {
          await setActiveSignIn({ session: attempt.createdSessionId });
        } else {
          setError('Verification incomplete — try again.');
        }
      } else {
        if (signUp.status === 'complete') {
          await setActiveSignUp({ session: signUp.createdSessionId });
          return;
        }
        const attempt = await signUp.attemptVerification({ strategy: 'email_code', code });
        if (attempt.status === 'complete') {
          await setActiveSignUp({ session: attempt.createdSessionId });
        } else {
          setError('Verification incomplete — try again.');
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen includeTopInset>
      <View style={styles.brandMark}>
        <Logo size={40} />
      </View>
      <Title>XtraCup</Title>
      <Body style={styles.subtitle}>Prepay your coffee. Redeem one cup at a time.</Body>

      <Card style={styles.card}>
        {stage === 'enter' ? (
          <>
            <Label>Email address</Label>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <View style={styles.spacer} />
            <Button label="Send code" onPress={sendCode} loading={loading} disabled={!email} />
          </>
        ) : (
          <>
            <Label>Enter the code sent to {email}</Label>
            <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
            <View style={styles.spacer} />
            <Button label="Verify" onPress={verifyCode} loading={loading} disabled={!code} />
            <View style={styles.spacer} />
            <Button
              label="Use a different email"
              variant="secondary"
              onPress={() => {
                setStage('enter');
                setCode('');
              }}
            />
          </>
        )}
        {error ? <Body style={styles.error}>{error}</Body> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  card: {
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing.md,
  },
  error: {
    color: colors.negative,
    marginTop: spacing.md,
  },
});
