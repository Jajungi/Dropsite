import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebShell } from '@/src/components/layout/WebShell';
import { MobileShell } from '@/src/components/layout/MobileShell';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { useAuthGuard } from '@/src/hooks/useAuthGuard';
import { useActivityClock } from '@/src/hooks/useActivityStatus';
import { useAuthStore } from '@/src/stores/authStore';
import { NAV_ITEMS, ADMIN_NAV_ITEM } from '@/src/constants/nav';
import { colors } from '@/src/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={22}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

const TAB_SCREENS = [
  { name: 'index' as const, item: NAV_ITEMS[0] },
  { name: 'friends' as const, item: NAV_ITEMS[1] },
  { name: 'lobby' as const, item: NAV_ITEMS[2] },
  { name: 'profile' as const, item: NAV_ITEMS[3] },
  { name: 'guide' as const, item: NAV_ITEMS[4] },
];

export default function TabLayout() {
  const { isDesktop } = useLayoutMode();
  const insets = useSafeAreaInsets();
  const isAdmin = useAuthStore((s) => s.currentUser?.membershipTier === 'admin');
  useAuthGuard();
  useActivityClock();

  const tabBarHeight = 49 + insets.bottom;

  const tabs = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: isDesktop
          ? styles.tabBarHidden
          : {
              ...styles.tabBar,
              height: tabBarHeight,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4),
              paddingTop: 6,
            },
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
        animation: Platform.OS === 'ios' ? 'shift' : 'fade',
      }}
    >
      {TAB_SCREENS.map(({ name, item }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: item.tabLabel,
            tabBarIcon: ({ focused }) => <TabIcon name={item.icon} focused={focused} />,
            tabBarAccessibilityLabel: item.label,
          }}
        />
      ))}
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? undefined : null,
          title: ADMIN_NAV_ITEM.tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={ADMIN_NAV_ITEM.icon} focused={focused} />
          ),
          tabBarAccessibilityLabel: ADMIN_NAV_ITEM.label,
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return <WebShell>{tabs}</WebShell>;
  }

  return <MobileShell>{tabs}</MobileShell>;
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.tabBar,
    ...Platform.select({
      web: { boxShadow: '0 -2px 10px rgba(136,148,171,0.14)' } as object,
      ios: {
        shadowColor: '#8894AB',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      default: { elevation: 8 },
    }),
  },
  tabBarHidden: { display: 'none' },
  tabLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    marginTop: 1,
  },
  tabItem: {
    paddingTop: 2,
  },
});
