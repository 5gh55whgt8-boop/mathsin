import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, AuthScreen, Brand, Button, Card, Input, Muted } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { spacing } from '../theme';

export default function VerifyOtpScreen({ route }) {
  const email = route.params?.email || '';
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    try {
      setBusy(true);
      await verifyOtp(email, code);
    } catch (error) {
      Alert.alert('Could not verify code', error.response?.data?.error || error.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      setResending(true);
      await resendOtp(email);
      Alert.alert('New code sent', `Check ${email} for the new 6-digit verification code.`);
    } catch (error) {
      Alert.alert('Could not resend code', error.response?.data?.error || error.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.headerBlock}>
        <Brand />
        <View style={styles.heading}>
          <AppText variant="title">Verify email address</AppText>
          <Muted>We sent a 6-digit authentication code to {email || 'your email'}.</Muted>
        </View>
      </View>

      <Card style={styles.card}>
        <Input
          label="6-Digit Verification Code"
          icon="keypad-outline"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={value => setCode(value.replace(/[^0-9]/g, ''))}
          onSubmitEditing={verify}
          returnKeyType="go"
          inputStyle={styles.codeInput}
        />
        <Button
          title="Verify and continue"
          icon="shield-checkmark-outline"
          variant="primary"
          size="lg"
          loading={busy}
          disabled={code.length !== 6}
          onPress={verify}
          style={styles.verifyBtn}
        />
        <Button
          title="Resend code"
          variant="ghost"
          loading={resending}
          onPress={resend}
        />
      </Card>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.md,
  },
  heading: {
    gap: spacing.xxs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  codeInput: {
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: '700',
  },
  verifyBtn: {
    marginTop: spacing.xs,
  },
});
