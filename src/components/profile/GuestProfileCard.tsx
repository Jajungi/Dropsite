import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

interface GuestProfileCardProps {
  name: string;
  avatarColor: string;
  onLogout: () => void;
}

const GUEST_FEATURES = [
  { ok: true, label: '코트 예약 (일반·난타)' },
  { ok: true, label: '모집방 참여' },
  { ok: true, label: '이용 안내 보기' },
  { ok: false, label: '포인트 · 전적 · 랭크' },
  { ok: false, label: '친구 · 출석 · 봉사 인증' },
];

export function GuestProfileCard({ name, avatarColor, onLogout }: GuestProfileCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Avatar name={name} color={avatarColor} size={64} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>게스트</Text>
          </View>
          <Text style={styles.hint}>임시 계정 · 앱을 닫으면 세션이 사라질 수 있어요</Text>
        </View>
      </View>

      <Card style={styles.card} padding="md">
        <Text style={styles.sectionTitle}>이용 가능 기능</Text>
        {GUEST_FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={[styles.featureIcon, f.ok ? styles.ok : styles.no]}>{f.ok ? '✓' : '—'}</Text>
            <Text style={[styles.featureLabel, !f.ok && styles.featureMuted]}>{f.label}</Text>
          </View>
        ))}
      </Card>

      <Button
        title="회원가입 하러 가기"
        onPress={() => {
          onLogout();
          router.replace('/login');
        }}
        fullWidth
        variant="secondary"
        style={styles.cta}
      />
      <Button title="로그아웃" onPress={onLogout} fullWidth variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  name: { ...typography.h3, color: colors.text, fontSize: 18 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 6, lineHeight: 18 },
  card: { marginBottom: 0 },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, fontSize: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  featureIcon: { width: 18, fontWeight: '800', fontSize: 13 },
  ok: { color: colors.primary },
  no: { color: colors.textMuted },
  featureLabel: { ...typography.body, color: colors.text, fontSize: 13, flex: 1 },
  featureMuted: { color: colors.textMuted },
  cta: { marginTop: spacing.xs },
});
