import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './context/AppContext';
import { TodayScreen } from './screens/TodayScreen';
import { LogScreen } from './screens/LogScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ChallengesScreen } from './screens/ChallengesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { OnboardingModal, ONBOARDING_KEY } from './components/OnboardingModal';
import { preloadChime } from './utils/audio';
import * as Notifications from 'expo-notifications';

// Register handler at app startup so notifications show while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
const PURPLE = '#6C63FF';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Today:      { active: 'home',        inactive: 'home-outline' },
  Log:        { active: 'list',        inactive: 'list-outline' },
  Stats:      { active: 'bar-chart',   inactive: 'bar-chart-outline' },
  Challenges: { active: 'trophy',      inactive: 'trophy-outline' },
  Settings:   { active: 'settings',    inactive: 'settings-outline' },
  Manage:     { active: 'construct',   inactive: 'construct-outline' },
};

function Navigator() {
  const { isLoaded } = useApp();
  const insets = useSafeAreaInsets();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    preloadChime();
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setShowOnboarding(val !== 'true');
    });
  }, []);

  if (!isLoaded || showOnboarding === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PURPLE }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <OnboardingModal visible={showOnboarding} onDone={() => setShowOnboarding(false)} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: PURPLE,
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 0,
              elevation: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              height: 56 + insets.bottom,
              paddingBottom: insets.bottom + 4,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '700',
            },
            tabBarIcon: ({ focused, color, size }) => {
              const icons = TAB_ICONS[route.name];
              const name = focused ? icons.active : icons.inactive;
              return <Ionicons name={name} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Today"      component={TodayScreen} />
          <Tab.Screen name="Log"        component={LogScreen} />
          <Tab.Screen name="Stats"      component={StatsScreen} />
          <Tab.Screen name="Challenges" component={ChallengesScreen} />
          <Tab.Screen name="Settings"   component={SettingsScreen} />
          <Tab.Screen name="Manage"     component={ManageScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Navigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
