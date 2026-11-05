import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, layout, motion, radius, shadows, spacing, type } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function ScrollScreen({ children, contentContainerStyle, ...props }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoiding}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthScreen({ children, edges = ['top', 'bottom'] }) {
  return (
    <SafeAreaView edges={edges} style={styles.authSafe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.authContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AppHeader({ title, subtitle, onBack, action, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, spacing.sm) }, style]}>
      <View style={styles.headerRow}>
        {onBack && (
          <IconButton
            name="chevron-back"
            accessibilityLabel="Go back"
            onPress={onBack}
            variant="ghost"
            style={styles.headerBackBtn}
          />
        )}
        <View style={styles.headerTitleWrap}>
          {title && <AppText variant="section" numberOfLines={1}>{title}</AppText>}
          {subtitle && <Muted numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Muted>}
        </View>
        {action && <View style={styles.headerActionWrap}>{action}</View>}
      </View>
    </View>
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
  const size = compact ? 34 : 56;
  return (
    <View style={[styles.brand, style]}>
      <Image
        accessibilityLabel="MathLens AI logo"
        source={require('../../assets/mathlens-mark.png')}
        style={{ width: size, height: size, borderRadius: radius.md }}
        contentFit="contain"
      />
      <View style={styles.brandCopy}>
        <AppText variant={compact ? 'headline' : 'title'} color={light ? 'white' : 'ink'}>
          MathLens <Text style={{ color: C.primary, fontWeight: '800' }}>AI</Text>
        </AppText>
        {!compact && (
          <AppText variant="caption" color={light ? '#94A3B8' : 'muted'}>
            PROFESSIONAL MATHEMATICS WORKSPACE
          </AppText>
        )}
      </View>
    </View>
  );
}

export function Card({ children, style, tone = 'default' }) {
  const toneStyle = tone === 'subtle'
    ? styles.cardSubtle
    : tone === 'accent'
      ? styles.cardAccent
      : tone === 'dark'
        ? styles.cardDark
        : tone === 'warning'
          ? styles.cardWarning
          : tone === 'danger'
            ? styles.cardDanger
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
      onPressIn={() => scale.set(withSpring(reducedMotion ? 1 : 0.98, spring))}
      onPressOut={() => scale.set(withSpring(1, spring))}
      pressRetentionOffset={10}
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
  const large = size === 'lg';

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
      style={[
        styles.button,
        compact && styles.buttonSmall,
        large && styles.buttonLarge,
        look.box,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.loader} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 16 : 18} color={look.text} />}
          <AppText variant="bodyStrong" style={{ color: look.text }}>{title}</AppText>
        </>
      )}
    </PressableScale>
  );
}

export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />;
}

export function GhostButton(props) {
  return <Button variant="ghost" {...props} />;
}

export function DangerButton(props) {
  return <Button variant="danger" {...props} />;
}

export function IconButton({ name, onPress, accessibilityLabel, variant = 'light', disabled, style }) {
  const isDark = variant === 'dark';
  const isGhost = variant === 'ghost';
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.iconButton,
        isDark && styles.iconButtonDark,
        isGhost && styles.iconButtonGhost,
        style,
      ]}
    >
      <Ionicons name={name} size={18} color={isDark ? C.white : isGhost ? C.ink : C.inkSoft} />
    </PressableScale>
  );
}

export function Input({ label, icon, error, style, inputStyle, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.inputGroup, style]}>
      {label && <AppText variant="subhead" color="inkSoft" style={styles.inputLabel}>{label}</AppText>}
      <View style={[styles.inputShell, focused && styles.inputFocused, error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? C.primary : C.subtle} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={C.subtle}
          selectionColor={C.primary}
          style={[styles.input, inputStyle]}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>
      {error && <AppText variant="caption" color="danger" selectable>{error}</AppText>}
    </View>
  );
}

export function Badge({ label, tone = 'primary', icon, style }) {
  const looks = {
    primary: [styles.badgePrimary, C.primary],
    good: [styles.badgeGood, C.good],
    warning: [styles.badgeWarning, C.warning],
    danger: [styles.badgeDanger, C.danger],
    neutral: [styles.badgeNeutral, C.muted],
  };
  const [box, color] = looks[tone] || looks.primary;
  return (
    <View style={[styles.badge, box, style]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <AppText variant="caption" style={{ color }}>{label}</AppText>
    </View>
  );
}

export function SectionHeader({ title, subtitle, action, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionCopy}>
        <AppText variant="section">{title}</AppText>
        {subtitle && <Muted style={styles.sectionSubtitle}>{subtitle}</Muted>}
      </View>
      {action}
    </View>
  );
}

export function FeatureIcon({ name, tone = 'primary', size = 42, style }) {
  const toneMap = {
    primary: { bg: C.primarySoft, fg: C.primary },
    accent: { bg: C.primarySoft, fg: C.primary },
    blue: { bg: C.primarySoft, fg: C.primary },
    navy: { bg: C.surfaceSecondary, fg: C.ink },
    good: { bg: C.goodSoft, fg: C.good },
    warning: { bg: C.warningSoft, fg: C.warning },
    danger: { bg: C.dangerSoft, fg: C.danger },
    pink: { bg: C.dangerSoft, fg: C.danger },
    neutral: { bg: C.surfaceSecondary, fg: C.muted },
  };
  const theme = toneMap[tone] || toneMap.primary;

  return (
    <View
      style={[
        styles.featureIcon,
        {
          width: size,
          height: size,
          backgroundColor: theme.bg,
          borderColor: C.border,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={Math.round(size * 0.44)} color={theme.fg} />
    </View>
  );
}

export function ListItem({
  icon,
  iconTone = 'primary',
  title,
  subtitle,
  badge,
  badgeTone = 'neutral',
  trailing,
  onPress,
  style,
}) {
  const content = (
    <View style={[styles.listItem, style]}>
      {icon && <FeatureIcon name={icon} tone={iconTone} size={38} />}
      <View style={styles.listItemCopy}>
        <AppText variant="headline" numberOfLines={1}>{title}</AppText>
        {subtitle && <Muted numberOfLines={2} style={styles.listItemSub}>{subtitle}</Muted>}
      </View>
      {badge && <Badge label={badge} tone={badgeTone} />}
      {trailing || (onPress && <Ionicons name="chevron-forward" size={18} color={C.subtle} />)}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale accessibilityLabel={title} onPress={onPress}>
        {content}
      </PressableScale>
    );
  }
  return content;
}

export function EmptyState({ icon = 'documents-outline', title, message, action, style }) {
  return (
    <View style={[styles.emptyState, style]}>
      <FeatureIcon name={icon} tone="primary" size={54} />
      <AppText variant="section" style={styles.emptyTitle}>{title}</AppText>
      <Muted style={styles.emptyMessage}>{message}</Muted>
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContent,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  authSafe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  headerContainer: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  headerBackBtn: {
    marginRight: spacing.xxs,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandCopy: {
    gap: 2,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  cardSubtle: {
    backgroundColor: C.surfaceSecondary,
    borderColor: C.border,
  },
  cardAccent: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryLight,
  },
  cardDark: {
    backgroundColor: C.navy,
    borderColor: C.navySoft,
  },
  cardWarning: {
    backgroundColor: C.warningSoft,
    borderColor: '#FCD34D',
  },
  cardDanger: {
    backgroundColor: C.dangerSoft,
    borderColor: '#FCA5A5',
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    minHeight: layout.touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonSmall: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  buttonLarge: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: C.primary,
    borderWidth: 1,
    borderColor: C.primary,
    ...shadows.button,
  },
  buttonSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonDark: {
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: C.navy,
  },
  buttonDanger: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    backgroundColor: C.navySoft,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  inputGroup: {
    gap: spacing.xxs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 50,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputError: {
    borderColor: C.danger,
    borderWidth: 1.5,
  },
  inputFocused: {
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: C.ink,
    ...type.body,
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePrimary: { backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primaryLight },
  badgeGood: { backgroundColor: C.goodSoft, borderWidth: 1, borderColor: '#BBF7D0' },
  badgeWarning: { backgroundColor: C.warningSoft, borderWidth: 1, borderColor: '#FDE68A' },
  badgeDanger: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: '#FECACA' },
  badgeNeutral: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xxs,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  featureIcon: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  listItemCopy: {
    flex: 1,
    gap: 2,
  },
  listItemSub: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 13,
  },
  emptyAction: {
    marginTop: spacing.sm,
  },
});

