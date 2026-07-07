import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCountdownToNext } from '@/src/services/activityTime';
import { GuideAccordion } from '@/src/components/guide/GuideAccordion';
import { GUIDE_SECTIONS } from '@/src/constants/guideContent';
import { CLUB_NAME, GYM_LOCATION } from '@/src/constants';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface InactiveHomeProps {
  nextActivity: Date | null;
}

export function InactiveHome({ nextActivity }: InactiveHomeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>DG</Text>
        </View>
        <Text style={styles.heroTitle}>{CLUB_NAME}</Text>
        <Text style={styles.heroSub}>{GYM_LOCATION.name}</Text>

        <View style={styles.scheduleBox}>
          <Text style={styles.scheduleLabel}>정기 활동</Text>
          <Text style={styles.scheduleValue}>매주 화·목  18:30 – 21:50</Text>
        </View>

        {nextActivity && (
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>다음 활동까지</Text>
            <Text style={styles.countdownValue}>{formatCountdownToNext(nextActivity)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionHeader}>이용 안내</Text>
      <GuideAccordion sections={GUIDE_SECTIONS} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { color: colors.textLight, fontWeight: '800', fontSize: 16 },
  heroTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  heroSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  scheduleBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleLabel: { ...typography.small, color: colors.textMuted },
  scheduleValue: { ...typography.bodyBold, color: colors.text, marginTop: 4 },
  countdown: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  countdownLabel: { ...typography.small, color: colors.textMuted },
  countdownValue: { ...typography.h3, color: colors.primary, marginTop: 4 },
  sectionHeader: { ...typography.bodyBold, color: colors.text, marginTop: spacing.sm },
});
