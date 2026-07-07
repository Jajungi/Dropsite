import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  const toast = toasts[toasts.length - 1];

  return (
    <View style={styles.container}>
      <Pressable style={styles.toast} onPress={() => dismissToast(toast.id)}>
        <Text style={styles.message} numberOfLines={2}>
          {toast.message || toast.title}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
    ...Platform.select({ web: { pointerEvents: 'box-none' as const } }),
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
});
