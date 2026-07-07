import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { typography, colors, spacing } from '@/src/theme';

const dropLogo = require('../../../assets/images/drop-logo.png');

interface DropBrandProps {
  compact?: boolean;
  scale?: number;
}

export function DropBrand({ compact, scale = 1 }: DropBrandProps) {
  const logoSize = Math.round((compact ? 30 : 36) * scale);
  const clubSize = Math.round((compact ? 14 : 16) * scale);
  const clubLine = Math.round((compact ? 16 : 18) * scale);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Image
        source={dropLogo}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
        accessibilityLabel="Drop 로고"
      />
      <View style={styles.textCol}>
        <Text
          style={[styles.club, compact && styles.clubCompact, { fontSize: clubSize, lineHeight: clubLine }]}
          numberOfLines={1}
        >
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
