import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  if (!value) return 'Date unavailable';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function RecentScan({ scan, onPress }) {
  const preview = (scan.plainText || scan.markdown || '').trim();
  const isDocument = scan.sourceType !== 'image';
  return (
    <PressableScale accessibilityLabel={`Open ${scan.title || 'recent scan'}`} onPress={onPress} style={styles.recentPressable}>
      <Card style={styles.recentCard}>
        <View style={styles.recentPreview}>
          <FeatureIcon
            name={isDocument ? 'document-text-outline' : 'image-outline'}
            tone={isDocument ? 'accent' : 'primary'}
            size={40}
          />
          <AppText variant="bodyStrong" numberOfLines={3} style={styles.previewText}>
            {preview || 'Open to view recognized content.'}
          </AppText>
        </View>
        <AppText variant="bodyStrong" numberOfLines={1}>{scan.title || 'Untitled scan'}</AppText>
        <Muted>{relativeTime(scan.createdAt)}</Muted>
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
        <Animated.View entering={FadeInDown.duration(motion.base).reduceMotion(ReduceMotion.System)}>
          <LinearGradient
            colors={['#E6F4FF', '#F0E9FF', '#DCD9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Badge label="YOUR AI MATH WORKSPACE" tone="primary" icon="sparkles" />
            <View style={styles.heroMain}>
              <View style={styles.heroCopy}>
                <AppText variant="display" style={styles.heroTitle}>{greeting()},</AppText>
                <AppText variant="display" style={styles.heroName}>{firstName}</AppText>
                <AppText color="muted" style={styles.heroDescription}>
                  Turn any equation or document into editable, solvable math.
                </AppText>
              </View>
              <View style={styles.formulaVisual} accessibilityLabel="MathLens equation preview">
                <View style={styles.formulaBack}>
                  <AppText variant="headline" color="ink">∫ x² dx</AppText>
                  <AppText variant="headline" color="ink">= x³⁄₃ + C</AppText>
                </View>
                <View style={styles.formulaFront}>
                  <AppText variant="headline" color="primary">∫ x² dx</AppText>
                  <AppText variant="headline" color="primary">= x³⁄₃ + C</AppText>
                </View>
              </View>
            </View>
            <View style={styles.heroActions}>
              <View style={styles.heroAction}>
                <FeatureIcon name="camera-outline" tone="primary" size={38} />
                <Muted style={styles.heroActionText}>Scan{'\n'}document</Muted>
              </View>
              <View style={styles.heroAction}>
                <FeatureIcon name="document-text-outline" tone="accent" size={38} />
                <Muted style={styles.heroActionText}>Extract{'\n'}math content</Muted>
              </View>
              <View style={styles.heroAction}>
                <FeatureIcon name="bulb-outline" tone="warning" size={38} />
                <Muted style={styles.heroActionText}>Get step-by-step{'\n'}solutions</Muted>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <SectionHeader
          title="Quick capture"
          subtitle="Choose a source to get started."
          action={<IconButton name="chevron-forward" accessibilityLabel="Open scan options" onPress={() => navigation.navigate('Scan')} />}
        />
        <View style={styles.captureGrid}>
          <PressableScale accessibilityLabel="Open photo scanner" onPress={() => navigation.navigate('Scan')} style={styles.capturePressable}>
            <Card style={[styles.captureCard, styles.photoCard]}>
              <FeatureIcon name="camera-outline" tone="primary" size={48} />
              <AppText variant="headline">Photo scan</AppText>
              <Muted>Camera or gallery</Muted>
              <Button title="Open scanner" icon="arrow-forward" size="sm" onPress={() => navigation.navigate('Scan')} />
            </Card>
          </PressableScale>
          <PressableScale accessibilityLabel="Open document scanner" onPress={() => navigation.navigate('Scan')} style={styles.capturePressable}>
            <Card style={[styles.captureCard, styles.documentCard]}>
              <FeatureIcon name="document-text-outline" tone="accent" size={48} />
              <AppText variant="headline">Document</AppText>
              <Muted>PDF, DOCX or TXT</Muted>
              <Button title="Choose file" icon="arrow-forward" size="sm" variant="secondary" onPress={() => navigation.navigate('Scan')} />
            </Card>
          </PressableScale>
        </View>

        <View style={styles.featureGrid}>
          {[
            ['create-outline', 'Handwritten math', 'primary'],
            ['calculator-outline', 'Solve with steps', 'accent'],
            ['create-outline', 'Editable results', 'warning'],
            ['cloud-done-outline', 'Cloud synced', 'primary'],
          ].map(([icon, label, tone]) => (
            <Card key={label} style={styles.featureCard}>
              <FeatureIcon name={icon} tone={tone} size={38} />
              <AppText variant="caption" style={styles.featureLabel}>{label}</AppText>
            </Card>
          ))}
        </View>

        <SectionHeader
          title="Recent scans"
          action={<Button title="See all" icon="arrow-forward" variant="ghost" size="sm" onPress={() => navigation.navigate('History')} />}
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
              <RecentScan key={scan._id} scan={scan} onPress={() => navigation.navigate('Result', { scan })} />
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyRecent}>
            <FeatureIcon name="time-outline" tone="primary" size={42} />
            <View style={styles.emptyCopy}>
              <AppText variant="bodyStrong">No recent scans yet</AppText>
              <Muted>Your completed scans will appear here.</Muted>
            </View>
            <Button title="Start scanning" size="sm" onPress={() => navigation.navigate('Scan')} />
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
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE0FF',
    boxShadow: shadows.raised,
  },
  heroTitle: {
    color: C.ink,
    fontSize: 30,
    lineHeight: 34,
  },
  heroName: {
    color: C.primary,
    fontSize: 34,
    lineHeight: 36,
  },
  heroMain: {
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroDescription: {
    paddingTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
  },
  formulaVisual: {
    width: 130,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '7deg' }],
  },
  formulaBack: {
    position: 'absolute',
    top: 8,
    right: -4,
    width: 116,
    minHeight: 112,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: spacing.sm,
    transform: [{ rotate: '-4deg' }],
  },
  formulaFront: {
    width: 126,
    minHeight: 122,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: spacing.sm,
    boxShadow: shadows.card,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  heroAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroActionText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  captureGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  capturePressable: {
    flex: 1,
  },
  captureCard: {
    minHeight: 204,
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  photoCard: {
    backgroundColor: '#F6EEFF',
  },
  documentCard: {
    backgroundColor: '#E8FBF8',
  },
  featureGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureCard: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  featureLabel: {
    textAlign: 'center',
  },
  recentList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  recentPressable: {
    width: 184,
  },
  recentCard: {
    minHeight: 162,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  recentPreview: {
    height: 92,
    borderRadius: radius.md,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  previewText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyRecent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
});
