import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { Body, Button, Card, IconButton, Input, Label, Screen, Title } from '../components/ui';
import { CloseIcon } from '../components/ChromeIcons';
import Logo from '../components/Logo';
import { colors, fonts, spacing } from '../theme/theme';

type Mode = 'signUp' | 'signIn';
type Stage = 'form' | 'code';

// Passwordless — Clerk verifies the email with a one-time code rather than
// a password (the Clerk instance is configured for email-code, not
// email+password). Sign-up collects name/age up front so CompleteProfileScreen
// can finish silently after verification instead of asking again.
export default function AuthScreen({
  onCancel,
  initialMode = 'signUp',
}: {
  onCancel?: () => void;
  initialMode?: Mode;
}) {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [stage, setStage] = useState<Stage>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmitForm = mode === 'signUp' ? Boolean(name && email && age) : Boolean(email);

  const submitForm = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signUp') {
        if (!signUpLoaded) return;
        await signUp.create({
          emailAddress: email,
          firstName: name,
          unsafeMetadata: { age: Number(age) },
        });
        await signUp.prepareVerification({ strategy: 'email_code' });
      } else {
        if (!signInLoaded) return;
        const attempt = await signIn.create({ identifier: email });
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
        if (!factor || !('emailAddressId' in factor)) {
          throw new Error('No verification method available for this email.');
        }
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      }
      setStage('code');
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? err?.message ?? 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (loading) return;
    if (mode === 'signUp' ? !signUp : !signIn) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signUp') {
        const attempt = await signUp!.attemptVerification({ strategy: 'email_code', code });
        if (attempt.status === 'complete') {
          await setActiveSignUp!({ session: attempt.createdSessionId });
        } else {
          setError('Verification incomplete — try again.');
        }
      } else {
        const attempt = await signIn!.attemptFirstFactor({ strategy: 'email_code', code });
        if (attempt.status === 'complete') {
          await setActiveSignIn!({ session: attempt.createdSessionId });
        } else {
          setError('Verification incomplete — try again.');
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? err?.message ?? 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStage('form');
    setError(null);
    setCode('');
  };

  return (
    <Screen includeTopInset scroll>
      {onCancel ? (
        <View style={styles.cancelRow}>
          <IconButton onPress={onCancel}>
            <CloseIcon size={16} color={colors.textPrimary} />
          </IconButton>
        </View>
      ) : null}
      <View style={styles.brandMark}>
        <Logo size={48} />
      </View>
      <Title>{mode === 'signUp' ? 'Create your account' : 'Welcome back'}</Title>
      <Body style={styles.subtitle}>Prepay your coffee. Redeem one cup at a time.</Body>

      <Card style={styles.card}>
        {stage === 'form' ? (
          <>
            {mode === 'signUp' ? (
              <>
                <Label>Name</Label>
                <Input value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
                <View style={styles.spacer} />
              </>
            ) : null}

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

            {mode === 'signUp' ? (
              <>
                <Label>Age</Label>
                <Input value={age} onChangeText={setAge} placeholder="e.g. 25" keyboardType="number-pad" />
                <View style={styles.spacer} />
              </>
            ) : null}

            <Button
              label={mode === 'signUp' ? 'Send code' : 'Log in'}
              onPress={submitForm}
              loading={loading}
              disabled={!canSubmitForm}
            />

            {error ? <Body style={styles.error}>{error}</Body> : null}

            <View style={styles.switchRow}>
              {mode === 'signUp' ? (
                <Pressable onPress={() => switchMode('signIn')}>
                  <Body style={styles.switchLink}>Already have an account? Log in</Body>
                </Pressable>
              ) : (
                <Pressable onPress={() => switchMode('signUp')}>
                  <Body style={styles.switchLink}>New here? Create an account</Body>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            <Label>Enter the code sent to {email}</Label>
            <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
            <View style={styles.spacer} />
            <Button label="Verify" onPress={verifyCode} loading={loading} disabled={!code} />
            <View style={styles.spacer} />
            <Button label="Back" variant="secondary" onPress={() => setStage('form')} disabled={loading} />
            {error ? <Body style={styles.error}>{error}</Body> : null}
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelRow: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  brandMark: {
    marginTop: spacing.md,
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
  switchRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchLink: {
    fontFamily: fonts.bodyMedium,
    color: colors.accent,
    fontSize: 14,
  },
});
