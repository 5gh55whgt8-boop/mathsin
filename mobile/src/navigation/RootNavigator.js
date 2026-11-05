import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { recoverPendingCameraPhoto } from '../services/ocr/cameraRecovery';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import WorkspaceScreen from '../screens/WorkspaceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ResultScreen from '../screens/ResultScreen';
import { AppText, Brand } from '../components/UI';
import { C, radius, shadows, spacing } from '../theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const tabIcons = {
  Home: ['home', 'home-outline'],
  Scan: ['scan', 'scan-outline'],
  History: ['time', 'time-outline'],
  Workspace: ['grid', 'grid-outline'],
  Profile: ['person', 'person-outline'],
};

function HeaderBrand() {
  return <Brand compact />;
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTitle: route.name === 'Home' ? () => <HeaderBrand /> : undefined,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            minHeight: 62 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          const [filled, outline] = tabIcons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? filled : outline} color={color} size={22} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Tabs.Screen name="History" component={HistoryScreen} options={{ title: 'Library' }} />
      <Tabs.Screen name="Workspace" component={WorkspaceScreen} options={{ title: 'Workspace' }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Image source={require('../../assets/mathlens-mark.png')} style={styles.loadingLogo} contentFit="contain" />
      <AppText variant="headline">Loading workspace…</AppText>
      <ActivityIndicator color={C.primary} size="small" />
    </View>
  );
}

// If Android restarted the app while the camera was open, bring the photo back.
function useRecoverCameraPhoto(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      const photo = await recoverPendingCameraPhoto();
      if (!photo || cancelled) return;
      for (let attempt = 0; attempt < 40 && !cancelled; attempt += 1) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Main', { screen: 'Scan', params: { recovered: photo } });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  useRecoverCameraPhoto(Boolean(user) && !loading);
  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: C.primary,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
          <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Verify email' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={({ route }) => ({
              title: route.params?.scan?.title || 'Scan result',
              headerBackTitle: 'Back',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    color: C.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  tabBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: C.bg,
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
  },
});
