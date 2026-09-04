import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
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
  Scan: ['scan-circle', 'scan-circle-outline'],
  History: ['time', 'time-outline'],
  Workspace: ['grid', 'grid-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function HeaderBrand() {
  return <Brand compact />;
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTitle: route.name === 'Home' ? () => <HeaderBrand /> : undefined,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          const [filled, outline] = tabIcons[route.name];
          return <Ionicons name={focused ? filled : outline} color={color} size={size + 1} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="Scan" component={ScanScreen} options={{ title: 'New scan' }} />
      <Tabs.Screen name="History" component={HistoryScreen} />
      <Tabs.Screen name="Workspace" component={WorkspaceScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Image source={require('../../assets/mathlens-mark.png')} style={styles.loadingLogo} contentFit="contain" />
      <AppText variant="headline">Preparing your workspace</AppText>
      <ActivityIndicator color={C.primary} />
    </View>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: C.ink,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
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
  },
  headerTitle: {
    color: C.ink,
    fontWeight: '700',
  },
  tabBar: {
    minHeight: 66,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    boxShadow: shadows.raised,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: C.bg,
  },
  loadingLogo: {
    width: 92,
    height: 92,
    borderRadius: radius.xl,
  },
});
