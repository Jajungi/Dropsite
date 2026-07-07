import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Court } from '@/src/types';
import { CourtDetailContent, type CourtDetailContentProps } from './CourtDetailContent';
import { colors, spacing, typography } from '@/src/theme';

type CourtLivePanelProps = Omit<CourtDetailContentProps, 'court'> & {
  court: Court | null;
};

export function CourtLivePanel({ court, ...props }: CourtLivePanelProps) {
  if (!court) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>코트를 선택하세요</Text>
        <Text style={styles.emptySub}>왼쪽에서 코트를 눌러{'\n'}예약 정보를 확인할 수 있어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <CourtDetailContent court={court} courtPreviewWidth={300} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySub: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
