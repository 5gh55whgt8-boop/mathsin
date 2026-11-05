import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { C, radius, spacing } from '../theme';

const statDefinitions = [
  ['scans', 'Total Scans', 'scan-outline', 'primary'],
  ['favorites', 'Starred Formulas', 'star-outline', 'warning'],
  ['questions', 'Problems Identified', 'help-circle-outline', 'primary'],
  ['aiActions', 'AI Solves & Steps', 'sparkles-outline', 'primary'],
];

export default function WorkspaceScreen() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const twoColumns = width >= 340;

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/workspace/stats');
      setStats(response.data);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Could not refresh workspace metrics.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const valueFor = key => key === 'aiActions' ? stats?.usage?.aiActions || 0 : stats?.[key] || 0;
  const plan = stats?.plan || 'Standard';

  return (
    <Screen>
      <ScrollScreen contentContainerStyle={styles.scrollContent}>
        <View style={styles.heading}>
          <AppText variant="title">Workspace Analytics</AppText>
          <Muted>Overview of your mathematical database, operations, and account sync.</Muted>
        </View>

        {/* Executive Plan Card */}
        <Card tone="dark" style={styles.planCard}>
          <View style={styles.planTop}>
            <Badge label={`${plan.toUpperCase()} WORKSPACE`} tone="primary" icon="diamond-outline" />
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <AppText variant="caption" color="white">CLOUD SYNC ACTIVE</AppText>
            </View>
          </View>
          <View style={styles.planBody}>
            <AppText variant="title" color="white">Mathematical Repository</AppText>
            <AppText color="#94A3B8" style={styles.planDescription}>
              All scans, equation transcriptions, LaTeX code, and step-by-step solutions are synchronized securely.
            </AppText>
          </View>
        </Card>

        {/* Workspace Metrics */}
        <SectionHeader
          title="Productivity metrics"
          subtitle="Real-time counts from your connected account."
        />

        {!stats && !error ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={C.primary} size="small" />
            <Muted>Aggregating workspace statistics…</Muted>
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
                delay={index * 40}
                style={[styles.statWrap, twoColumns && styles.statWrapTwo]}
              >
                <View style={styles.statCardInner}>
                  <View style={styles.statCardTop}>
                    <FeatureIcon name={icon} tone={tone} size={38} />
                    <Muted style={styles.statLabel}>{label}</Muted>
                  </View>
                  <AppText variant="display" style={styles.statNumber} selectable>
                    {valueFor(key).toLocaleString()}
                  </AppText>
                </View>
              </AnimatedCard>
            ))}
          </View>
        ) : null}

        {/* System & Architecture Integrity */}
        <SectionHeader
          title="System integrity & security"
          subtitle="Enterprise-grade privacy for academic research."
        />
        <Card style={styles.healthCard}>
          <View style={styles.healthRow}>
            <FeatureIcon name="shield-checkmark-outline" tone="good" size={40} />
            <View style={styles.healthCopy}>
              <AppText variant="headline">Authenticated API Protection</AppText>
              <Muted style={styles.healthSub}>End-to-end token validation ensures private scan libraries.</Muted>
            </View>
            <Badge label="Active" tone="good" />
          </View>
          <View style={styles.divider} />
          <View style={styles.healthRow}>
            <FeatureIcon name="code-working-outline" tone="primary" size={40} />
            <View style={styles.healthCopy}>
              <AppText variant="headline">Dual-Engine Recognition</AppText>
              <Muted style={styles.healthSub}>High-speed local OCR + Gemini AI mathematical analysis.</Muted>
            </View>
            <Badge label="Operational" tone="primary" />
          </View>
          <View style={styles.divider} />
          <View style={styles.healthRow}>
            <FeatureIcon name="cloud-done-outline" tone="neutral" size={40} />
            <View style={styles.healthCopy}>
              <AppText variant="headline">Export Infrastructure</AppText>
              <Muted style={styles.healthSub}>On-demand compilation of PDF and DOCX documents.</Muted>
            </View>
            <Badge label="Ready" tone="neutral" />
          </View>
        </Card>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  heading: {
    gap: 2,
  },
  planCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: C.good,
  },
  planBody: {
    gap: spacing.xxs,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  loadingCard: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
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
  statCardInner: {
    gap: spacing.sm,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    flex: 1,
    fontSize: 12,
  },
  statNumber: {
    fontSize: 30,
    lineHeight: 34,
    color: C.ink,
    fontVariant: ['tabular-nums'],
  },
  healthCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthCopy: {
    flex: 1,
    gap: 2,
  },
  healthSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
});
