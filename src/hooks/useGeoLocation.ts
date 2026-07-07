import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { GYM_LOCATION } from '@/src/constants';
import { GEO_ERROR_MESSAGES } from '@/src/services/geoFence';
import { useAppStore } from '@/src/stores/authStore';

export function useGeoLocation() {
  const demoMode = useAppStore((s) => s.demoMode);
  const isAtGym = useAppStore((s) => s.isAtGym);
  const setLocation = useAppStore((s) => s.setLocation);
  const setLocationError = useAppStore((s) => s.setLocationError);

  useEffect(() => {
    if (demoMode) {
      setLocation({
        latitude: GYM_LOCATION.latitude,
        longitude: GYM_LOCATION.longitude,
      });
      return;
    }

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError(GEO_ERROR_MESSAGES.permission_denied);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        });

        if (Platform.OS !== 'web') {
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
            (update) => {
              setLocation({
                latitude: update.coords.latitude,
                longitude: update.coords.longitude,
                accuracy: update.coords.accuracy ?? undefined,
              });
            }
          );
        }
      } catch {
        setLocationError(GEO_ERROR_MESSAGES.unavailable);
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, [demoMode, setLocation, setLocationError]);

  return { isAtGym, demoMode };
}
