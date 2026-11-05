import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, AuthScreen, Badge, Brand, Button, Card, Input, Muted } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { C, radius, spacing } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    try {
      setBusy(true);
      await login(email.trim(), password);
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        navigation.navigate('VerifyOtp', { email: error.response.data.email || email.trim() });
        return;
      }
      Alert.alert('Unable to sign in', error.response?.data?.error || error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <View style={styles.headerBlock}>
        <Brand />
        <View style={styles.headerCopy}>
          <AppText variant="title">Sign in to MathLens</AppText>
          <Muted>Access your math library, equation solver, and synced documents.</Muted>
        </View>
        <View style={styles.badgeRow}>
          <Badge label="AI MATH ENGINE" tone="primary" icon="sparkles" />
          <Badge label="PRIVATE & SYNCED" tone="neutral" icon="shield-checkmark" />
        </View>
      </View>

      <Card style={styles.formCard}>
        <Input
          label="Email address"
          icon="mail-outline"
          placeholder="name@university.edu"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter account password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={go}
          returnKeyType="go"
        />
        <Button
          title="Sign in to workspace"
          icon="arrow-forward"
          variant="primary"
          size="lg"
          loading={busy}
          disabled={!email.trim() || !password}
          haptic
          onPress={go}
          style={styles.submitBtn}
        />
        <Button
          title="Create a new account"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
        />
      </Card>

      <AppText variant="caption" color="muted" style={styles.footer}>
        SECURE ACADEMIC WORKSPACE • VERIFIED RECOGNITION
      </AppText>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.sm,
  },
  headerCopy: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
