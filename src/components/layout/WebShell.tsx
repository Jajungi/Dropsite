import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Text, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppHeader } from './AppHeader';
import { useShellStore } from '@/src/stores/shellStore';
import { useAuthStore } from '@/src/stores/authStore';
import { NAV_ITEMS, ADMIN_NAV_ITEM, WEB_BREAKPOINT } from '@/src/constants/nav';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

const SIDEBAR_COLLAPSED = 56;
const SIDEBAR_EXPANDED = 196;
const MAIN_GAP_COLLAPSED = 8;
const MAIN_GAP_EXPANDED = 20;

export function WebShell({ children }: { children?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarExpanded = useShellStore((s) => s.sidebarExpanded);
  const sidebarWidth = useSharedValue(SIDEBAR_COLLAPSED);
  const mainGap = useSharedValue(MAIN_GAP_COLLAPSED);
  const isDesktop = Platform.OS === 'web' && width >= WEB_BREAKPOINT;
  const isAdmin = useAuthStore((s) => s.currentUser?.membershipTier === 'admin');
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  useEffect(() => {
    sidebarWidth.value = withTiming(sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED, {
      duration: sidebarExpanded ? 150 : 120,
    });
    mainGap.value = withTiming(sidebarExpanded ? MAIN_GAP_EXPANDED : MAIN_GAP_COLLAPSED, {
      duration: sidebarExpanded ? 150 : 120,
    });
  }, [sidebarExpanded, sidebarWidth, mainGap]);

  const sidebarAnimStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
  }));

  const mainAnimStyle = useAnimatedStyle(() => ({
    marginLeft: mainGap.value,
  }));

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      <AppHeader />

      <View style={styles.content}>
        <Animated.View style={[styles.sidebar, sidebarAnimStyle]}>
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/'
                : pathname.includes(item.href.replace('/', ''));
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as '/')}
                style={[styles.navRow, active && styles.navRowActive]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={[styles.navIcon, active && styles.navIconActive]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={active ? colors.textLight : colors.text}
                  />
                </View>
                {sidebarExpanded && (
                  <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.View style={[styles.main, mainAnimStyle]}>{children}</Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100vh' as unknown as number,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
  },
  sidebar: {
    paddingVertical: 28,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  navRowActive: {
    backgroundColor: colors.navHover,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navIconActive: {
    backgroundColor: colors.navActive,
  },
  navLabel: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  navLabelActive: {
    color: colors.primary,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
});
