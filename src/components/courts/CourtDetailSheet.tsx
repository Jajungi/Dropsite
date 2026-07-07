import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import type { Court } from '@/src/types';
import { CourtDetailContent, type CourtDetailContentProps } from './CourtDetailContent';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, borderRadius, spacing, glass, shadows } from '@/src/theme';

interface CourtDetailSheetProps extends Omit<CourtDetailContentProps, 'court'> {
  court: Court | null;
  visible: boolean;
  onClose: () => void;
}

export function CourtDetailSheet({
  court,
  visible,
  onClose,
  ...contentProps
}: CourtDetailSheetProps) {
  const { isDesktop } = useLayoutMode();

  if (!visible || !court) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <CourtDetailContent court={court} courtPreviewWidth={320} {...contentProps} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    ...shadows.md,
  },
  handle: {
    width: 32,
    height: 3,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
