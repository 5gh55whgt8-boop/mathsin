import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
          <LinearGradient
            colors={['#FFFFFF', '#F3F7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroEyebrow}>
                <View style={styles.heroEyebrowDot} />
                <AppText variant="caption" color="primary">MATH WORKSPACE</AppText>
              </View>
              <AppText variant="caption" color="muted">
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </AppText>
            </View>
            <View style={styles.heroMain}>
              <View style={styles.heroCopy}>
                <AppText variant="display" style={styles.heroTitle}>
                  {greeting()}, {firstName}
                </AppText>
                <AppText color="inkSecondary" style={styles.heroSubtitle}>
                  Snap a problem and make math easier to understand.
                </AppText>
              </View>
              <View style={styles.heroArtwork} accessibilityLabel="MathLens math workspace illustration">
                <View style={styles.heroOrbit} />
                <Image
                  source={require('../../assets/mathlens-mark.png')}
                  style={styles.heroLogo}
                  contentFit="contain"
                />
                <View style={[styles.mathChip, styles.mathChipTop]}>
                  <AppText variant="headline" color="primary">∑ x²</AppText>
                </View>
                <View style={[styles.mathChip, styles.mathChipBottom]}>
                  <AppText variant="caption" color="ink">x = 4</AppText>
                </View>
              </View>
            </View>
            <View style={styles.heroFooter}>
              <Button
                title="Start a scan"
                icon="camera-outline"
                variant="primary"
                size="lg"
                onPress={() => navigation.navigate('Scan')}
                style={styles.heroScanBtn}
              />
              <View style={styles.heroTrust}>
                <Ionicons name="sparkles-outline" size={16} color={C.primary} />
                <AppText variant="caption" color="muted">OCR + step-by-step solving</AppText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Capture Options */}
        <SectionHeader title="Start with a scan" subtitle="Choose the fastest way in." />
        <View style={styles.sourceGrid}>
          <PressableScale
            accessibilityLabel="Scan with Camera"
            onPress={() => navigation.navigate('Scan')}
            style={styles.sourceItem}
          >
            <Card style={styles.sourceCard}>
              <View style={styles.sourceVisual}>
                <FeatureIcon name="camera-outline" tone="primary" size={46} />
                <View style={styles.visualDot} />
              </View>
              <View style={styles.sourceCopy}>
                <AppText variant="headline">Camera scan</AppText>
                <Muted style={styles.sourceSub}>Capture math</Muted>
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
              <View style={[styles.sourceVisual, styles.documentVisual]}>
                <FeatureIcon name="document-text-outline" tone="navy" size={46} />
                <Ionicons name="add" size={14} color={C.navy} style={styles.documentPlus} />
              </View>
              <View style={styles.sourceCopy}>
                <AppText variant="headline">Document</AppText>
                <Muted style={styles.sourceSub}>Import a file</Muted>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.primary} style={styles.sourceArrow} />
            </Card>
          </PressableScale>
        </View>

        {/* Core Mathematical Capabilities */}
        <SectionHeader title="Your math toolkit" subtitle="Everything you need to understand the answer." />
        <View style={styles.featureGrid}>
          {[
            { icon: 'calculator-outline', title: 'Solve', tone: 'primary' },
            { icon: 'bulb-outline', title: 'Explain', tone: 'primary' },
            { icon: 'checkmark-done-outline', title: 'Check', tone: 'primary' },
            { icon: 'cloud-done-outline', title: 'Sync', tone: 'primary' },
          ].map(feature => (
            <Card key={feature.title} style={styles.featureCard}>
              <FeatureIcon name={feature.icon} tone={feature.tone} size={38} />
              <View style={styles.featureCopy}>
                <AppText variant="headline">{feature.title}</AppText>
                <Ionicons name="arrow-forward" size={15} color={C.primary} />
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
            <View style={styles.emptyRecentContent}>
              <FeatureIcon name="time-outline" tone="neutral" size={40} />
              <View style={styles.emptyRecentCopy}>
                <AppText variant="headline">No scans recorded yet</AppText>
                <Muted style={styles.emptyRecentSub}>
                  Capture equations with your camera or import a document to begin.
                </Muted>
              </View>
            </View>
            <Button
              title="Start scanning"
              icon="camera-outline"
              size="sm"
              variant="secondary"
              onPress={() => navigation.navigate('Scan')}
              style={styles.emptyRecentBtn}
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
    borderWidth: 1,
    borderColor: '#D9E6FF',
    overflow: 'hidden',
    ...shadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroEyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: C.primary,
  },
  heroMain: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroArtwork: {
    width: 126,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOrbit: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: 'rgba(239, 246, 255, 0.85)',
  },
  heroLogo: {
    width: 88,
    height: 88,
  },
  mathChip: {
    position: 'absolute',
    minWidth: 54,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: C.white,
    ...shadows.card,
    alignItems: 'center',
  },
  mathChipTop: {
    top: 3,
    right: -2,
    transform: [{ rotate: '8deg' }],
  },
  mathChipBottom: {
    bottom: 5,
    left: -3,
    transform: [{ rotate: '-7deg' }],
  },
  heroFooter: {
    gap: spacing.sm,
  },
  heroScanBtn: {
    width: '100%',
  },
  heroTrust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceItem: {
    flex: 1,
  },
  sourceCard: {
    minHeight: 142,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
  },
  sourceVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentVisual: {
    position: 'relative',
  },
  visualDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: C.primary,
    marginRight: spacing.xs,
  },
  documentPlus: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureCard: {
    width: '48%',
    minHeight: 92,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  featureCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: spacing.xs,
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
    gap: spacing.md,
    padding: spacing.md,
  },
  emptyRecentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyRecentCopy: {
    flex: 1,
    gap: 2,
  },
  emptyRecentSub: {
    fontSize: 12,
  },
  emptyRecentBtn: {
    alignSelf: 'flex-start',
  },
});
