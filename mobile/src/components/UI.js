import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, layout, motion, radius, shadows, spacing, type } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function ScrollScreen({ children, contentContainerStyle, ...props }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function AuthScreen({ children }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.authSafe}>
      <ScrollView
        contentContainerStyle={styles.authContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AppText({ variant = 'body', color = 'ink', style, selectable, children, ...props }) {
  return (
    <Text
      selectable={selectable}
      style={[type[variant] || type.body, { color: C[color] || color }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function Title({ children, style }) {
  return <AppText variant="title" style={style}>{children}</AppText>;
}

export function Muted({ children, style, selectable }) {
  return <AppText color="muted" style={style} selectable={selectable}>{children}</AppText>;
}

export function Brand({ compact = false, light = false, style }) {
  const size = compact ? 38 : 68;
  return (
    <View style={[styles.brand, style]}>
      <Image
        accessibilityLabel="MathLens AI logo"
        source={require('../../assets/mathlens-mark.png')}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
      <View style={styles.brandCopy}>
        <AppText variant={compact ? 'headline' : 'title'} color={light ? 'white' : 'ink'}>
          MathLens <Text style={{ color: C.accent }}>AI</Text>
        </AppText>
        {!compact && (
          <AppText variant="caption" color={light ? '#B9C8EA' : 'muted'}>
            SCAN • SOLVE • UNDERSTAND
          </AppText>
        )}
      </View>
    </View>
  );
}

export function Card({ children, style, tone = 'default' }) {
  const toneStyle = tone === 'soft'
    ? styles.cardSoft
    : tone === 'dark'
      ? styles.cardDark
      : tone === 'warning'
        ? styles.cardWarning
        : null;
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

export function AnimatedCard({ children, delay = 0, style, ...props }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.base).delay(delay).reduceMotion(ReduceMotion.System)}
      style={style}
    >
      <Card {...props}>{children}</Card>
    </Animated.View>
  );
}

export function PressableScale({ children, disabled, onPress, style, accessibilityLabel, ...props }) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const spring = { duration: motion.fast, dampingRatio: 1, reduceMotion: ReduceMotion.System };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => scale.set(withSpring(reducedMotion ? 1 : 0.975, spring))}
      onPressOut={() => scale.set(withSpring(1, spring))}
      pressRetentionOffset={12}
      style={[animatedStyle, disabled && styles.disabled, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant,
  kind,
  disabled,
  icon,
  size = 'md',
  haptic = false,
  style,
}) {
  const buttonLooks = {
    primary: { box: styles.buttonPrimary, text: C.white, loader: C.white },
    secondary: { box: styles.buttonSecondary, text: C.primary, loader: C.primary },
    ghost: { box: styles.buttonGhost, text: C.inkSoft, loader: C.primary },
    dark: { box: styles.buttonDark, text: C.white, loader: C.white },
    danger: { box: styles.buttonDanger, text: C.danger, loader: C.danger },
  };
  const resolvedVariant = variant || (kind === 'ghost' ? 'secondary' : kind) || 'primary';
  const look = buttonLooks[resolvedVariant] || buttonLooks.primary;
  const compact = size === 'sm';

  const handlePress = event => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(event);
  };

  return (
    <PressableScale
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={handlePress}
      style={[styles.button, compact && styles.buttonSmall, look.box, style]}
    >
      {loading ? (
        <ActivityIndicator color={look.loader} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 17 : 19} color={look.text} />}
          <AppText variant="bodyStrong" style={{ color: look.text }}>{title}</AppText>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ name, onPress, accessibilityLabel, variant = 'light', disabled }) {
  const dark = variant === 'dark';
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.iconButton, dark && styles.iconButtonDark]}
    >
      <Ionicons name={name} size={20} color={dark ? C.white : C.inkSoft} />
    </PressableScale>
  );
}

export function Input({ label, icon, error, style, inputStyle, ...props }) {
  return (
    <View style={[styles.inputGroup, style]}>
      {label && <AppText variant="subhead" color="inkSoft">{label}</AppText>}
      <View style={[styles.inputShell, error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={20} color={C.subtle} />}
        <TextInput
          placeholderTextColor={C.subtle}
          selectionColor={C.primary}
          style={[styles.input, inputStyle]}
          {...props}
        />
      </View>
      {error && <AppText variant="caption" color="danger" selectable>{error}</AppText>}
    </View>
  );
}

export function Badge({ label, tone = 'primary', icon }) {
  const looks = {
    primary: [styles.badgePrimary, C.primary],
    good: [styles.badgeGood, C.good],
    warning: [styles.badgeWarning, C.warning],
    neutral: [styles.badgeNeutral, C.muted],
  };
  const [box, color] = looks[tone] || looks.primary;
  return (
    <View style={[styles.badge, box]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <AppText variant="caption" style={{ color }}>{label}</AppText>
    </View>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <AppText variant="section">{title}</AppText>
        {subtitle && <Muted>{subtitle}</Muted>}
      </View>
      {action}
    </View>
  );
}

export function FeatureIcon({ name, tone = 'primary', size = 46 }) {
  const color = tone === 'accent' ? C.good : tone === 'warning' ? C.warning : C.primary;
  const backgroundColor = tone === 'accent' ? C.accentSoft : tone === 'warning' ? C.warningSoft : C.primarySoft;
  return (
    <View style={[styles.featureIcon, { width: size, height: size, backgroundColor }]}>
      <Ionicons name={name} size={Math.round(size * 0.46)} color={color} />
    </View>
  );
}

export function EmptyState({ icon = 'documents-outline', title, message, action }) {
  return (
    <View style={styles.emptyState}>
      <FeatureIcon name={icon} size={60} />
      <AppText variant="section" style={styles.emptyTitle}>{title}</AppText>
      <Muted style={styles.emptyMessage}>{message}</Muted>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContent,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  authSafe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandCopy: {
    gap: spacing.xxs,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.lg,
    boxShadow: shadows.card,
  },
  cardSoft: {
    backgroundColor: C.primarySoft,
    borderColor: '#DEDAFF',
  },
  cardDark: {
    backgroundColor: C.navy,
    borderColor: C.navySoft,
  },
  cardWarning: {
    backgroundColor: C.warningSoft,
    borderColor: '#F4D896',
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonSmall: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  buttonPrimary: {
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: C.primary,
    boxShadow: shadows.button,
  },
  buttonSecondary: {
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: '#DCD7FF',
  },
  buttonGhost: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  buttonDark: {
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: C.navy,
  },
  buttonDanger: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: '#F7C9D1',
  },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputShell: {
    minHeight: 54,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputError: {
    borderColor: C.danger,
  },
  input: {
    flex: 1,
    minHeight: 52,
    color: C.ink,
    ...type.body,
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: 27,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  badgePrimary: { backgroundColor: C.primarySoft },
  badgeGood: { backgroundColor: C.goodSoft },
  badgeWarning: { backgroundColor: C.warningSoft },
  badgeNeutral: { backgroundColor: '#EDF0F5' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  featureIcon: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    maxWidth: 300,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
