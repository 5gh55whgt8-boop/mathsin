import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { api, describeApiFailure } from '../api/client';
import {
  AppText,
  Badge,
  Button,
  Card,
  FeatureIcon,
  IconButton,
  Muted,
  PressableScale,
  Screen,
  ScrollScreen,
  SectionHeader,
} from '../components/UI';
import { C, motion, radius, shadows, spacing } from '../theme';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(value) {
  if (!value) return 'Recent';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RecentScanCard({ scan, onPress }) {
  const preview = (scan.plainText || scan.markdown || scan.latex || '').trim();
  const isDocument = scan.sourceType !== 'image';

  return (
    <PressableScale accessibilityLabel={`Open ${scan.title || 'scan'}`} onPress={onPress} style={styles.recentItem}>
      <Card style={styles.recentCard}>
        <View style={styles.recentTop}>
          <FeatureIcon
            name={isDocument ? 'document-text-outline' : 'calculator-outline'}
            tone="primary"
            size={36}
          />
          <Badge
            label={isDocument ? 'DOCUMENT' : 'EQUATION'}
            tone={isDocument ? 'neutral' : 'primary'}
          />
        </View>
        <View style={styles.recentSnippetBox}>
          <AppText variant="subhead" numberOfLines={3} style={styles.recentSnippetText}>
            {preview || 'Recognized mathematical expression.'}
          </AppText>
        </View>
        <View style={styles.recentBottom}>
          <AppText variant="headline" numberOfLines={1} style={styles.recentTitle}>
            {scan.title || 'Untitled scan'}
          </AppText>
          <Muted style={styles.recentTime}>{relativeTime(scan.createdAt)}</Muted>
        </View>
      </Card>
    </PressableScale>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [recentScans, setRecentScans] = useState([]);
  const [recentError, setRecentError] = useState('');
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'there';

  const loadRecentScans = useCallback(async () => {
    try {
      setRecentError('');
      const { data } = await api.get('/scans', { params: { limit: 5 } });
      setRecentScans(Array.isArray(data.items) ? data.items.slice(0, 5) : []);
    } catch (error) {
      setRecentError(describeApiFailure(error, 'Recent scans'));
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadRecentScans();
  }, [loadRecentScans]));

  return (
    <Screen>
      <ScrollScreen contentContainerStyle={styles.content}>
        {/* Editorial Math Workspace Hero */}
        <Animated.View entering={FadeInDown.duration(motion.base).reduceMotion(ReduceMotion.System)}>
          <Card tone="dark" style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Badge label="MATHEMATICS WORKSPACE" tone="primary" icon="sparkles" />
              <Muted color="subtle">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Muted>
            </View>
            <View style={styles.heroMain}>
              <AppText variant="display" color="white" style={styles.heroTitle}>
                {greeting()}, {firstName}
              </AppText>
              <AppText color="#CBD5E1" style={styles.heroSubtitle}>
                Scan equations, recognize formulas, and generate complete step-by-step mathematical solutions.
              </AppText>
            </View>
            <View style={styles.heroCtaRow}>
              <Button
                title="Scan equation or document"
                icon="camera-outline"
                variant="primary"
                size="lg"
                onPress={() => navigation.navigate('Scan')}
                style={styles.heroScanBtn}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Quick Capture Options */}
        <SectionHeader
          title="Input sources"
          subtitle="Select input method to digitize math."
        />
        <View style={styles.sourceGrid}>
          <PressableScale
            accessibilityLabel="Scan with Camera"
            onPress={() => navigation.navigate('Scan')}
            style={styles.sourceItem}
          >
            <Card style={styles.sourceCard}>
              <FeatureIcon name="camera-outline" tone="primary" size={40} />
              <View style={styles.sourceCopy}>
                <AppText variant="headline">Camera scan</AppText>
                <Muted style={styles.sourceSub}>Handwritten or printed</Muted>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.primary} style={styles.sourceArrow} />
            </Card>
          </PressableScale>

          <PressableScale
            accessibilityLabel="Import Document"
            onPress={() => navigation.navigate('Scan')}
            style={styles.sourceItem}
          >
            <Card style={styles.sourceCard}>
              <FeatureIcon name="document-text-outline" tone="navy" size={40} />
              <View style={styles.sourceCopy}>
                <AppText variant="headline">Document</AppText>
                <Muted style={styles.sourceSub}>PDF, DOCX, TXT</Muted>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.primary} style={styles.sourceArrow} />
            </Card>
          </PressableScale>
        </View>

        {/* Core Mathematical Capabilities */}
        <SectionHeader
          title="Mathematical capabilities"
          subtitle="Equipped for academic & technical productivity."
        />
        <View style={styles.featureGrid}>
          {[
            ['calculator-outline', 'Step-by-step solver', 'Complete algebraic & calculus breakdowns'],
            ['code-slash-outline', 'LaTeX & Markdown', 'Export clean math notation instantly'],
            ['checkmark-done-outline', 'Solution check', 'Verify answers with detailed corrections'],
            ['cloud-done-outline', 'Workspace sync', 'All scans securely saved to your account'],
          ].map(([icon, title, desc]) => (
            <Card key={title} style={styles.featureCard}>
              <FeatureIcon name={icon} tone="primary" size={38} />
              <View style={styles.featureCopy}>
                <AppText variant="headline">{title}</AppText>
                <Muted style={styles.featureDesc}>{desc}</Muted>
              </View>
            </Card>
          ))}
        </View>

        {/* Recent Scans */}
        <SectionHeader
          title="Recent library activity"
          subtitle="Your latest digitized equations and files."
          action={
            <Button
              title="View library"
              icon="arrow-forward"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('History')}
            />
          }
        />
        {recentError ? (
          <Card tone="warning">
            <AppText variant="bodyStrong" color="warning">{recentError}</AppText>
          </Card>
        ) : recentScans.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          >
            {recentScans.map(scan => (
              <RecentScanCard
                key={scan._id}
                scan={scan}
                onPress={() => navigation.navigate('Result', { scan })}
              />
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyRecentCard}>
            <FeatureIcon name="time-outline" tone="neutral" size={44} />
            <View style={styles.emptyRecentCopy}>
              <AppText variant="headline">No scans recorded yet</AppText>
              <Muted style={styles.emptyRecentSub}>
                Capture equations with your camera or import a document to begin.
              </Muted>
            </View>
            <Button
              title="Start scanning"
              icon="camera-outline"
              size="sm"
              onPress={() => navigation.navigate('Scan')}
            />
          </Card>
        )}
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  heroCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMain: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: C.white,
    fontSize: 26,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroCtaRow: {
    paddingTop: spacing.xs,
  },
  heroScanBtn: {
    width: '100%',
  },
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceItem: {
    flex: 1,
  },
  sourceCard: {
    minHeight: 124,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
  },
  sourceCopy: {
    gap: 2,
  },
  sourceSub: {
    fontSize: 12,
  },
  sourceArrow: {
    alignSelf: 'flex-end',
  },
  featureGrid: {
    gap: spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  recentItem: {
    width: 220,
  },
  recentCard: {
    minHeight: 168,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
  },
  recentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentSnippetBox: {
    minHeight: 58,
    borderRadius: radius.sm,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
    padding: spacing.xs,
    justifyContent: 'center',
  },
  recentSnippetText: {
    fontSize: 12,
    lineHeight: 16,
    color: C.inkSecondary,
  },
  recentBottom: {
    gap: 2,
  },
  recentTitle: {
    fontSize: 13,
  },
  recentTime: {
    fontSize: 11,
  },
  emptyRecentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  emptyRecentCopy: {
    flex: 1,
    gap: 2,
  },
  emptyRecentSub: {
    fontSize: 12,
  },
});
