import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import {
  AnimatedCard,
  AppText,
  Badge,
  Card,
  FeatureIcon,
  Muted,
  Screen,
  ScrollScreen,
  SectionHeader,
} from '../components/UI';
import { C, gradients, radius, shadows, spacing } from '../theme';

const statDefinitions = [
  ['scans', 'Total scans', 'scan-outline', 'primary'],
  ['favorites', 'Favorites', 'star-outline', 'warning'],
  ['questions', 'Questions found', 'help-circle-outline', 'accent'],
  ['aiActions', 'AI actions', 'sparkles-outline', 'primary'],
];

export default function WorkspaceScreen() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const twoColumns = width >= 360;

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/workspace/stats');
      setStats(response.data);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Could not refresh workspace insights.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const valueFor = key => key === 'aiActions' ? stats?.usage?.aiActions || 0 : stats?.[key] || 0;
  const plan = stats?.plan || 'free';

  return (
    <Screen>
      <ScrollScreen>
        <View style={styles.heading}>
          <AppText variant="title">Workspace overview</AppText>
          <Muted>Everything you scan, organize and solve—at a glance.</Muted>
        </View>

        <LinearGradient colors={gradients.hero} style={styles.planCard}>
          <View style={styles.planTop}>
            <Badge label={`${plan.toUpperCase()} PLAN`} tone="good" icon="diamond-outline" />
            <FeatureIcon name="cloud-done" tone="accent" size={44} />
          </View>
          <View style={styles.planCopy}>
            <AppText variant="title" color="white">Your learning cloud</AppText>
            <AppText color="#CBD7EF">
              Scans and edits are synced securely across your MathLens workspace.
            </AppText>
          </View>
          <View style={styles.syncStatus}>
            <View style={styles.liveDot} />
            <AppText variant="caption" color="#D8E4FA">SYNC ACTIVE</AppText>
          </View>
        </LinearGradient>

        <SectionHeader title="Workspace metrics" subtitle="Live totals from your account." />

        {!stats && !error ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={C.primary} />
            <Muted>Refreshing metrics…</Muted>
          </Card>
        ) : null}

        {error ? (
          <Card tone="warning">
            <AppText variant="bodyStrong" color="warning" selectable>{error}</AppText>
          </Card>
        ) : null}

        {stats ? (
          <View style={styles.statsGrid}>
            {statDefinitions.map(([key, label, icon, tone], index) => (
              <AnimatedCard
                key={key}
                delay={index * 45}
                style={[styles.statWrap, twoColumns && styles.statWrapTwo]}
              >
                <FeatureIcon name={icon} tone={tone} size={42} />
                <AppText variant="display" style={styles.statNumber} selectable>
                  {valueFor(key).toLocaleString()}
                </AppText>
                <Muted>{label}</Muted>
              </AnimatedCard>
            ))}
          </View>
        ) : null}

        <SectionHeader title="Workspace health" subtitle="Built for reliable study workflows." />
        <Card style={styles.healthCard}>
          <View style={styles.healthRow}>
            <FeatureIcon name="shield-checkmark-outline" tone="accent" size={44} />
            <View style={styles.healthCopy}>
              <AppText variant="bodyStrong">Account protected</AppText>
              <Muted>Authenticated API access keeps scans private to your account.</Muted>
            </View>
            <Badge label="Healthy" tone="good" />
          </View>
          <View style={styles.divider} />
          <View style={styles.healthRow}>
            <FeatureIcon name="layers-outline" size={44} />
            <View style={styles.healthCopy}>
              <AppText variant="bodyStrong">Structured recognition</AppText>
              <Muted>Text, equations, questions and warnings stay organized.</Muted>
            </View>
          </View>
        </Card>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xxs,
  },
  planCard: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.xl,
    boxShadow: shadows.raised,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCopy: {
    gap: spacing.xs,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: C.accent,
  },
  loadingCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statWrap: {
    width: '100%',
  },
  statWrapTwo: {
    flex: 1,
    minWidth: 150,
  },
  statNumber: {
    paddingTop: spacing.md,
    fontVariant: ['tabular-nums'],
  },
  healthCard: {
    gap: spacing.md,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthCopy: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
});
