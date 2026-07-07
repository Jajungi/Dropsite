import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from './Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export function SirenModal() {
  const siren = useNotificationStore((s) => s.siren);
  const hideSiren = useNotificationStore((s) => s.hideSiren);

  useEffect(() => {
    if (!siren.visible) return;

    if (Platform.OS !== 'web') {
      Vibration.vibrate(200);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const pulse = setInterval(() => {
        Vibration.vibrate(180);
      }, 2200);
      return () => clearInterval(pulse);
    }
  }, [siren.visible]);

  if (!siren.visible) return null;

  return (
    <Modal transparent animationType="fade" visible={siren.visible}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{siren.title}</Text>
          <Text style={styles.message}>{siren.message}</Text>
          <Button
            title="확인"
            onPress={hideSiren}
            size="md"
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  button: { alignSelf: 'stretch' },
});
