import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
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
import { C, gradients, motion, radius, shadows, spacing } from '../theme';

const quickActions = [
  {
    title: 'Photo scan',
    description: 'Camera or gallery',
    icon: 'camera-outline',
    tone: 'primary',
  },
  {
    title: 'Document',
    description: 'PDF, DOCX or TXT',
    icon: 'document-text-outline',
    tone: 'accent',
  },
];

const capabilities = [
  ['sparkles-outline', 'Precision OCR', 'Text, handwriting and math notation'],
  ['calculator-outline', 'Step-by-step solve', 'Clear reasoning for every problem'],
  ['share-social-outline', 'Professional export', 'Clean PDF and Word documents'],
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const twoColumns = width >= 360;
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'there';

  return (
    <Screen>
      <ScrollScreen>
        <Animated.View
          entering={FadeInDown.duration(motion.base).reduceMotion(ReduceMotion.System)}
          style={styles.intro}
        >
          <AppText variant="title">{greeting()}, {firstName}</AppText>
          <Muted>Turn any equation or document into editable, solvable math.</Muted>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(motion.base).delay(70).reduceMotion(ReduceMotion.System)}
        >
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <Badge label="AI MATH WORKSPACE" tone="good" icon="sparkles" />
              <AppText variant="caption" color="#B9C8EA">v4.1</AppText>
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="display" color="white">See it. Scan it. Solve it.</AppText>
              <AppText color="#CCD8F2">
                Capture printed or handwritten math and get structured, editable results in seconds.
              </AppText>
            </View>
            <View style={styles.formulaPill}>
              <AppText variant="headline" color="white" selectable>∫ x² dx → x³⁄₃ + C</AppText>
            </View>
            <Button
              title="Start a new scan"
              icon="scan-outline"
              variant="ghost"
              haptic
              onPress={() => navigation.navigate('Scan')}
              style={styles.heroButton}
            />
          </LinearGradient>
        </Animated.View>

        <SectionHeader
          title="Quick capture"
          subtitle="Choose a source and let MathLens structure it."
        />

        <View style={styles.quickGrid}>
          {quickActions.map((action, index) => (
            <Animated.View
              key={action.title}
              entering={FadeInDown.duration(motion.base).delay(120 + index * 60).reduceMotion(ReduceMotion.System)}
              style={[styles.quickItem, twoColumns && styles.quickItemTwoColumn]}
            >
              <PressableScale
                accessibilityLabel={action.title}
                onPress={() => navigation.navigate('Scan')}
              >
                <Card style={styles.quickCard}>
                  <FeatureIcon name={action.icon} tone={action.tone} />
                  <View style={styles.quickCopy}>
                    <AppText variant="headline">{action.title}</AppText>
                    <Muted style={styles.quickDescription}>{action.description}</Muted>
                  </View>
                  <FeatureIcon name="arrow-forward" size={34} />
                </Card>
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        <SectionHeader
          title="One intelligent workflow"
          subtitle="From raw image to a polished answer and export."
        />

        <Card style={styles.capabilities}>
          {capabilities.map(([icon, title, description], index) => (
            <View key={title}>
              <View style={styles.capabilityRow}>
                <FeatureIcon name={icon} size={42} tone={index === 1 ? 'accent' : 'primary'} />
                <View style={styles.capabilityCopy}>
                  <AppText variant="bodyStrong">{title}</AppText>
                  <Muted>{description}</Muted>
                </View>
              </View>
              {index < capabilities.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        <View style={styles.trustRow}>
          <Badge label="Cloud synced" tone="neutral" icon="cloud-done-outline" />
          <Badge label="Editable results" tone="neutral" icon="create-outline" />
        </View>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.xxs,
  },
  hero: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.xl,
    overflow: 'hidden',
    boxShadow: shadows.raised,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCopy: {
    gap: spacing.xs,
  },
  formulaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.white,
    borderColor: C.white,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickItem: {
    width: '100%',
  },
  quickItemTwoColumn: {
    flex: 1,
    minWidth: 150,
  },
  quickCard: {
    minHeight: 190,
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  quickCopy: {
    gap: spacing.xxs,
  },
  quickDescription: {
    minHeight: 42,
  },
  capabilities: {
    gap: spacing.md,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  capabilityCopy: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginTop: spacing.md,
    backgroundColor: C.border,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
