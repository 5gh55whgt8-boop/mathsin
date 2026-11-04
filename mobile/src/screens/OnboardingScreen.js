
import React, { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Brand, Button } from '../components/UI';
import { C, spacing, radius, gradients } from '../theme';

const slides = [
  {
    icon: 'calculator-outline',
    title: 'Welcome to MathLens AI',
    description:
      'Your smarter math workspace. Scan, solve, and understand your work in one place.',
    label: 'SCAN • SOLVE • UNDERSTAND',
  },
  {
    icon: 'scan-outline',
    title: 'Scan Your Notes',
    description:
      'Capture handwritten notes, printed equations, and mathematical documents in seconds.',
    label: 'SMART DOCUMENT SCANNING',
  },
  {
    icon: 'sparkles-outline',
    title: 'Understand Every Step',
    description:
      'Use AI-powered recognition to explore equations and follow clear, step-by-step solutions.',
    label: 'AI-POWERED MATH',
  },
  {
    icon: 'document-text-outline',
    title: 'Create & Organize',
    description:
      'Keep your scans organized and create documents from your work in one convenient workspace.',
    label: 'YOUR WORKSPACE, SIMPLIFIED',
  },
];

export default function OnboardingScreen({ onDone }) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [active, setActive] = useState(0);

  const finish = () => onDone?.();

  const next = () => {
    if (active === slides.length - 1) {
      finish();
      return;
    }

    listRef.current?.scrollToIndex({
      index: active + 1,
      animated: true,
    });
    setActive(active + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Brand compact />
        {active < slides.length - 1 ? (
          <Pressable onPress={finish} hitSlop={12}>
            <AppText color="primary" variant="bodyStrong">
              Skip
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.title}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={event => {
          setActive(
            Math.round(event.nativeEvent.contentOffset.x / width)
          );
        }}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View style={styles.illustration}>
              <LinearGradient
                colors={['#E6F1FF', '#F0E9FF', '#FFFFFF']}
                style={styles.orb}
              >
                <View style={styles.iconCard}>
                  <Ionicons
                    name={item.icon}
                    size={76}
                    color={C.primary}
                  />
                </View>

                <View style={[styles.float, styles.floatTop]}>
                  <Ionicons
                    name="sparkles"
                    size={27}
                    color={C.accent}
                  />
                </View>

                <View style={[styles.float, styles.floatLeft]}>
                  <Ionicons
                    name="document-text-outline"
                    size={26}
                    color={C.primary}
                  />
                </View>

                <View style={[styles.float, styles.floatRight]}>
                  <Ionicons
                    name="checkmark-circle"
                    size={31}
                    color={C.good}
                  />
                </View>
              </LinearGradient>
            </View>

            <View style={styles.copy}>
              <AppText variant="title" style={styles.title}>
                {item.title}
              </AppText>
              <AppText color="muted" style={styles.description}>
                {item.description}
              </AppText>
              <AppText color="primary" variant="caption">
                {item.label}
              </AppText>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                active === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <Button
          title={active === slides.length - 1 ? 'Get Started' : 'Next'}
          icon="arrow-forward"
          onPress={next}
          style={styles.nextButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  orb: {
    width: 250,
    height: 250,
    maxWidth: '100%',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCard: {
    width: 140,
    height: 140,
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  float: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  floatTop: {
    top: 15,
    right: 20,
  },
  floatLeft: {
    left: 0,
    bottom: 35,
  },
  floatRight: {
    right: 0,
    bottom: 45,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 27,
    lineHeight: 35,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: C.borderStrong,
  },
  activeDot: {
    width: 23,
    backgroundColor: C.primary,
  },
  nextButton: {
    width: '100%',
  },
});
