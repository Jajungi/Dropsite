import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { typography, colors, spacing } from '@/src/theme';

const dropLogo = require('../../../assets/images/drop-logo.png');

interface DropBrandProps {
  compact?: boolean;
}

export function DropBrand({ compact }: DropBrandProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Image
        source={dropLogo}
        style={[styles.logo, compact && styles.logoCompact]}
        resizeMode="contain"
        accessibilityLabel="Drop 로고"
      />
      <View style={styles.textCol}>
        <Text style={[styles.club, compact && styles.clubCompact]} numberOfLines={1}>
          {CLUB_NAME}
        </Text>
        {!compact && <Text style={styles.school}>{SCHOOL_NAME}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: spacing.sm,
  },
  wrapCompact: {
    marginRight: 0,
    gap: 6,
    flexShrink: 1,
  },
  logo: {
    width: 36,
    height: 36,
  },
  logoCompact: {
    width: 30,
    height: 30,
  },
  textCol: {
    gap: 0,
  },
  club: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
    lineHeight: 18,
  },
  clubCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  school: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
});
