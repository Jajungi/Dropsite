import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';

/** 로그인하지 않으면 /login 으로 보냄 */
export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const segments = useSegments();

  useEffect(() => {
    if (!authHydrated) return;
    const inAuth = segments[0] === 'login';
    if (!isAuthenticated && !inAuth) {
      router.replace('/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authHydrated, segments]);
}
