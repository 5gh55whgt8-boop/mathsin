import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  AppText,
  Badge,
  Button,
  Card,
  FeatureIcon,
  Muted,
  Screen,
  ScrollScreen,
  SectionHeader,
} from '../components/UI';
import { C, gradients, radius, shadows, spacing } from '../theme';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(part => part[0]).join('') || 'ML').toUpperCase();
}

function InfoRow({ icon, title, description, badge, tone = 'primary' }) {
  return (
    <View style={styles.infoRow}>
      <FeatureIcon name={icon} tone={tone} size={44} />
      <View style={styles.infoCopy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <Muted selectable>{description}</Muted>
      </View>
      {badge ? <Badge label={badge} tone={tone === 'accent' ? 'good' : 'neutral'} /> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Sign out of MathLens?', 'Your synced scans will remain safely stored in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <Screen>
      <ScrollScreen>
        <LinearGradient colors={gradients.hero} style={styles.profileHero}>
          <View style={styles.avatar}>
            <AppText variant="title" color="white">{initials(user?.name)}</AppText>
          </View>
          <View style={styles.profileCopy}>
            <AppText variant="title" color="white" selectable>{user?.name || 'MathLens user'}</AppText>
            <AppText color="#C8D5F0" selectable>{user?.email}</AppText>
            <View style={styles.badges}>
              <Badge label={(user?.plan || 'free').toUpperCase()} tone="good" icon="diamond-outline" />
              <Badge label={(user?.role || 'user').toUpperCase()} tone="neutral" icon="person-outline" />
            </View>
          </View>
        </LinearGradient>

        <SectionHeader title="Account" subtitle="Your identity and workspace access." />
        <Card style={styles.infoCard}>
          <InfoRow
            icon="mail-outline"
            title="Email address"
            description={user?.email || 'Not available'}
            badge="Verified"
            tone="accent"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="briefcase-outline"
            title="Workspace role"
            description={`Signed in as ${user?.role || 'user'}`}
            badge={user?.plan || 'free'}
          />
        </Card>

        <SectionHeader title="Experience" subtitle="Professional defaults enabled for your account." />
        <Card style={styles.infoCard}>
          <InfoRow
            icon="cloud-done-outline"
            title="Cloud sync"
            description="Scan history and edits stay available across sessions."
            badge="Active"
            tone="accent"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="document-text-outline"
            title="Export quality"
            description="PDF and Word exports preserve recognized text and LaTeX."
          />
          <View style={styles.divider} />
          <InfoRow
            icon="shield-checkmark-outline"
            title="Private workspace"
            description="Authenticated requests protect your personal scan library."
            tone="accent"
          />
        </Card>

        <Button
          title="Sign out"
          icon="log-out-outline"
          variant="danger"
          haptic
          onPress={confirmLogout}
        />

        <View style={styles.version}>
          <AppText variant="caption" color="muted">MATHLENS AI • VERSION 4.1</AppText>
          <AppText variant="caption" color="subtle">SCAN • SOLVE • UNDERSTAND</AppText>
        </View>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    boxShadow: shadows.raised,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  infoCard: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoCopy: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  version: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingTop: spacing.md,
  },
});
