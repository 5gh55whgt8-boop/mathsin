import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, AuthScreen, Brand, Button, Card, Input, Muted } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { C, gradients, radius, shadows, spacing } from '../theme';

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
      Alert.alert('Unable to sign in', error.response?.data?.error || error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen>
      <LinearGradient colors={gradients.soft} style={styles.brandPanel}>
        <Brand />
        <View style={styles.brandMessage}>
          <AppText variant="display">Your smartest math workspace.</AppText>
          <Muted>Scan equations, solve with clear steps, and export polished documents.</Muted>
        </View>
        <View style={styles.proofRow}>
          <AppText variant="caption" color="primary">OCR + AI SOLVING</AppText>
          <View style={styles.proofDot} />
          <AppText variant="caption" color="good">CLOUD SYNCED</AppText>
        </View>
      </LinearGradient>

      <Card style={styles.formCard}>
        <View style={styles.formHeading}>
          <AppText variant="section">Welcome back</AppText>
          <Muted>Sign in to continue to your workspace.</Muted>
        </View>
        <Input
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={go}
          returnKeyType="go"
        />
        <Button
          title="Sign in securely"
          icon="arrow-forward"
          loading={busy}
          disabled={!email.trim() || !password}
          haptic
          onPress={go}
        />
        <Button
          title="Create a new account"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
        />
      </Card>

      <AppText variant="caption" color="muted" style={styles.footer}>
        PRIVATE BY DESIGN • YOUR SCANS STAY IN YOUR WORKSPACE
      </AppText>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  brandPanel: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.xl,
    borderWidth: 1,
    borderColor: '#DFDCFF',
  },
  brandMessage: {
    gap: spacing.xs,
  },
  proofRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proofDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: C.borderStrong,
  },
  formCard: {
    gap: spacing.md,
    boxShadow: shadows.raised,
  },
  formHeading: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  footer: {
    textAlign: 'center',
  },
});
