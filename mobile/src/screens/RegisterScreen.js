import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Brand, Button, Card, Input, Muted, Screen, ScrollScreen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { C, shadows, spacing } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordError = password && password.length < 8 ? 'Use at least 8 characters.' : '';

  async function go() {
    try {
      setBusy(true);
      const result = await register(name.trim(), email.trim(), password);
      navigation.replace('VerifyOtp', { email: result.email || email.trim() });
    } catch (error) {
      Alert.alert('Unable to create account', error.response?.data?.error || error.message);
    } finally {
      setBusy(false);
    }
  }

  const valid = name.trim() && email.trim() && password.length >= 8;

  return (
    <Screen>
      <ScrollScreen contentContainerStyle={styles.content}>
        <Brand />
        <View style={styles.heading}>
          <AppText variant="title">Build your math library</AppText>
          <Muted>Every scan, solution and export stays connected to your account.</Muted>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Full name"
            icon="person-outline"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />
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
            icon="shield-checkmark-outline"
            placeholder="Minimum 8 characters"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            onSubmitEditing={go}
            returnKeyType="go"
          />
          <Button
            title="Create my workspace"
            icon="sparkles-outline"
            loading={busy}
            disabled={!valid}
            haptic
            onPress={go}
          />
        </Card>

        <View style={styles.assurance}>
          <AppText variant="caption" color="good">✓ SECURE ACCOUNT</AppText>
          <View style={styles.dot} />
          <AppText variant="caption" color="primary">✓ INSTANT CLOUD SYNC</AppText>
        </View>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  heading: {
    gap: spacing.xs,
  },
  formCard: {
    gap: spacing.md,
    boxShadow: shadows.raised,
  },
  assurance: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 99,
    backgroundColor: C.borderStrong,
  },
});
