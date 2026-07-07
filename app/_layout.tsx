import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ToastContainer } from '@/src/components/ui/ToastContainer';
import { SirenModal } from '@/src/components/ui/SirenModal';
import { colors, fonts, typography } from '@/src/theme';
import { loadCourts, loadRooms } from '@/src/services/persistence';
import { loadAppState } from '@/src/services/appPersistence';
import { seedDemoFriendships } from '@/src/services/friendBootstrap';
import { seedDemoCredentials } from '@/src/services/authCredentials';
import { processMonthlyCleaningBonus } from '@/src/services/cleaningBonus';
import { useCourtStore } from '@/src/stores/courtStore';
import { useLobbyStore } from '@/src/stores/lobbyStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { usePointStore } from '@/src/stores/pointStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useAdminLogStore } from '@/src/stores/adminLogStore';
import { useCoachingStore } from '@/src/stores/coachingStore';
import { MOCK_COACH_ANNOUNCEMENTS } from '@/src/services/mockData';
import { seedDemoAdminLogs } from '@/src/services/demoAdminLogs';
import { initLocalNotifications } from '@/src/services/localNotifications';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    BebasNeue_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    void initLocalNotifications();
  }, []);

  useEffect(() => {
    (async () => {
      const [savedCourts, savedRooms, appState] = await Promise.all([
        loadCourts(),
        loadRooms(),
        loadAppState(),
      ]);
      if (savedCourts?.length) useCourtStore.getState().hydrateCourts(savedCourts);
      if (savedRooms?.length) useLobbyStore.getState().hydrateRooms(savedRooms);

      if (appState) {
        useAuthStore.getState().hydrateAuth(
          appState.users,
          appState.attendanceRecords,
          appState.sessionUserId,
          appState.peakResetDate,
          appState.credentials ?? {},
          appState.lastCleaningBonusMonth ?? null
        );
        useFriendStore.getState().hydrate(appState.friendships, appState.friendRequests);
        usePointStore.getState().hydrate(appState.pointTransactions);
        useNotificationStore.getState().hydrate({
          pendingMatches: appState.pendingMatches,
          matchHistory: appState.matchHistory,
          cleaningLeaderboard: appState.cleaningLeaderboard,
          inbox: appState.inbox,
        });
        useLessonStore.getState().hydrate(appState.lessonApplications, appState.lessonQueue);
        useAdminLogStore.getState().hydrate(
          appState.adminLogs?.length ? appState.adminLogs : seedDemoAdminLogs()
        );
        useCoachingStore.getState().hydrate(
          appState.coachAnnouncements?.length
            ? appState.coachAnnouncements
            : MOCK_COACH_ANNOUNCEMENTS
        );

        const bonusMonth = processMonthlyCleaningBonus(appState.lastCleaningBonusMonth ?? null);
        if (bonusMonth && bonusMonth !== appState.lastCleaningBonusMonth) {
          useAuthStore.getState().setLastCleaningBonusMonth(bonusMonth);
        }
      } else {
        const users = useAuthStore.getState().users;
        useAuthStore.getState().hydrateAuth(
          users,
          useAuthStore.getState().attendanceRecords,
          null,
          null,
          seedDemoCredentials(users.map((u) => u.studentId)),
          null
        );
        useFriendStore.getState().hydrate(seedDemoFriendships(users), []);
        useAdminLogStore.getState().hydrate(seedDemoAdminLogs());
        useCoachingStore.getState().hydrate(MOCK_COACH_ANNOUNCEMENTS);
      }
    })();
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontFamily: fonts.serif,
              fontWeight: '600',
              fontSize: 18,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="user/[id]"
            options={{ title: '프로필', presentation: 'card' }}
          />
          <Stack.Screen
            name="coaching"
            options={{ title: '코칭 · 레슨', presentation: 'card' }}
          />
        </Stack>
        <ToastContainer />
        <SirenModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
