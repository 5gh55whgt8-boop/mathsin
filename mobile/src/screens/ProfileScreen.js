import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { C, radius, spacing } from '../theme';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(part => part[0]).join('') || 'ML').toUpperCase();
}

function ProfileInfoRow({ icon, title, description, badge, tone = 'primary' }) {
  return (
    <View style={styles.infoRow}>
      <FeatureIcon name={icon} tone={tone} size={40} />
      <View style={styles.infoCopy}>
        <AppText variant="headline">{title}</AppText>
        <Muted selectable style={styles.infoDesc}>{description}</Muted>
      </View>
      {badge ? <Badge label={badge} tone={tone === 'good' ? 'good' : 'neutral'} /> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Sign out of MathLens?', 'Your synced equations and workspace library will remain safely preserved in the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <Screen>
      <ScrollScreen contentContainerStyle={styles.scrollContent}>
        {/* Academic User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <AppText variant="title" style={styles.avatarText}>{initials(user?.name)}</AppText>
          </View>
          <View style={styles.userCopy}>
            <AppText variant="title" selectable>{user?.name || 'MathLens User'}</AppText>
            <Muted selectable style={styles.userEmail}>{user?.email || 'Authenticated Account'}</Muted>
            <View style={styles.userBadges}>
              <Badge label={(user?.plan || 'Standard').toUpperCase()} tone="primary" icon="diamond-outline" />
              <Badge label={(user?.role || 'Member').toUpperCase()} tone="neutral" icon="person-outline" />
            </View>
          </View>
        </Card>

        {/* Account Details */}
        <SectionHeader title="Account credentials" subtitle="Identity and access configuration." />
        <Card style={styles.sectionCard}>
          <ProfileInfoRow
            icon="mail-outline"
            title="Verified email"
            description={user?.email || 'Not available'}
            badge="Verified"
            tone="good"
          />
          <View style={styles.divider} />
          <ProfileInfoRow
            icon="briefcase-outline"
            title="Workspace clearance"
            description={`Operating as ${user?.role || 'user'}`}
            badge={user?.plan || 'Standard'}
            tone="primary"
          />
        </Card>

        {/* Experience & Defaults */}
        <SectionHeader title="Workspace configuration" subtitle="Standard settings applied to all scans." />
        <Card style={styles.sectionCard}>
          <ProfileInfoRow
            icon="cloud-done-outline"
            title="Cloud synchronization"
            description="Automatic background syncing across devices."
            badge="Active"
            tone="good"
          />
          <View style={styles.divider} />
          <ProfileInfoRow
            icon="document-text-outline"
            title="Export engine"
            description="High-fidelity LaTeX and DOCX equation formatting."
            tone="primary"
          />
          <View style={styles.divider} />
          <ProfileInfoRow
            icon="shield-checkmark-outline"
            title="Data protection"
            description="Personal workspace scans isolated and authenticated."
            tone="primary"
          />
        </Card>

        {/* Sign Out CTA */}
        <Button
          title="Sign out of workspace"
          icon="log-out-outline"
          variant="danger"
          size="lg"
          haptic
          onPress={confirmLogout}
          style={styles.signOutBtn}
        />

        <View style={styles.footerVersion}>
          <AppText variant="caption" color="muted">MATHLENS AI • TECHNICAL WORKSPACE 4.1</AppText>
          <AppText variant="caption" color="subtle">ACADEMIC & SCIENTIFIC OCR PIPELINE</AppText>
        </View>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: C.primarySoft,
    borderWidth: 1.5,
    borderColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  userCopy: {
    flex: 1,
    gap: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  userBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  sectionCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoDesc: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  signOutBtn: {
    marginTop: spacing.xs,
  },
  footerVersion: {
    alignItems: 'center',
    gap: 2,
    paddingTop: spacing.xs,
  },
});
