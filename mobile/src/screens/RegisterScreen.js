import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Badge, Brand, Button, Card, Input, Muted, Screen, ScrollScreen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { spacing } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordError = password && password.length < 8 ? 'Password must be at least 8 characters.' : '';

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
        <View style={styles.headerBlock}>
          <Brand />
          <View style={styles.heading}>
            <AppText variant="title">Create your workspace</AppText>
            <Muted>Every recognized equation, solution, and PDF export is preserved in your library.</Muted>
          </View>
        </View>

        <Card style={styles.formCard}>
          <Input
            label="Full name"
            icon="person-outline"
            placeholder="Dr. Jane Doe"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />
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
            icon="shield-checkmark-outline"
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            onSubmitEditing={go}
            returnKeyType="go"
          />
          <Button
            title="Create workspace account"
            icon="sparkles-outline"
            variant="primary"
            size="lg"
            loading={busy}
            disabled={!valid}
            haptic
            onPress={go}
            style={styles.submitBtn}
          />
        </Card>

        <View style={styles.assurance}>
          <Badge label="ENCRYPTED AUTHENTICATION" tone="neutral" icon="lock-closed" />
          <Badge label="INSTANT CLOUD SYNC" tone="primary" icon="cloud-done" />
        </View>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.md,
  },
  heading: {
    gap: spacing.xxs,
  },
  formCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  assurance: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
