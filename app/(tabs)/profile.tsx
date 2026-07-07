import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore, useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useGeoLocation } from '@/src/hooks/useGeoLocation';
import { getWinRate } from '@/src/services/points';
import { MOCK_ELO_HISTORY } from '@/src/services/mockData';
import { ProfileAvatarEditor } from '@/src/components/profile/ProfileAvatarEditor';
import { ArrivalScheduleCard } from '@/src/components/profile/ArrivalScheduleCard';
import { RankBadge } from '@/src/components/ui/RankBadge';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { EloChart } from '@/src/components/profile/EloChart';
import { HourlyHeadcountChart } from '@/src/components/profile/HourlyHeadcountChart';
import { MatchHistoryList } from '@/src/components/profile/MatchHistoryList';
import { AttendanceCard } from '@/src/components/profile/AttendanceCard';
import { LessonApplyCard } from '@/src/components/profile/LessonApplyCard';
import { PointsHistorySheet } from '@/src/components/profile/PointsHistorySheet';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { CLEANING_AREAS } from '@/src/constants';
import { colors, spacing, typography, borderRadius, shadows, glass } from '@/src/theme';

const HEADCOUNT_DATA = [
  [8, 12, 18, 16, 10],
  [14, 22, 28, 24, 15],
  [6, 10, 14, 12, 8],
];

const MY_PRESENCE = [
  [true, true, true, true, false],
  [false, true, true, true, true],
  [true, true, false, false, false],
];

const HEADCOUNT_LABELS = {
  x: ['18:30', '19:00', '19:30', '20:00', '20:30'],
  y: ['화', '목', '토'],
};

export default function ProfileScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const demoMode = useAppStore((s) => s.demoMode);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const cleaningLeaderboard = useNotificationStore((s) => s.cleaningLeaderboard);
  const submitCleaning = useNotificationStore((s) => s.submitCleaning);
  const showToast = useNotificationStore((s) => s.showToast);
  useGeoLocation();

  const [showCleaning, setShowCleaning] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [selectedArea, setSelectedArea] = useState(CLEANING_AREAS[0]);
  const [participantCount, setParticipantCount] = useState('1');

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>로그인이 필요합니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winRate = getWinRate(currentUser.wins, currentUser.losses);

  const handleCleaningSubmit = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'error',
        title: '위치 인증 필요',
        message: '체육관에서만 청소 인증이 가능해요!',
      });
      return;
    }
    submitCleaning({
      userId: currentUser.id,
      userName: currentUser.name,
      area: selectedArea,
      participantCount: parseInt(participantCount, 10) || 1,
    });
    setShowCleaning(false);
    showToast({ type: 'success', title: '청소 인증 완료!', message: '기여해주셔서 감사합니다 🧹' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <ProfileAvatarEditor
            name={currentUser.name}
            color={currentUser.avatarColor}
            imageUri={currentUser.avatarUri}
            size={88}
            onChange={(uri) => {
              const result = updateUserProfile(currentUser.id, { avatarUri: uri });
              showToast({
                type: result.success ? 'success' : 'warning',
                title: '',
                message: uri ? result.message : '프로필 사진을 삭제했어요.',
              });
            }}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.studentId}>{currentUser.studentId}</Text>
            <View style={styles.badges}>
              <RankBadge rank={currentUser.rank} size="lg" />
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>
                  {currentUser.membershipTier === 'full' ? '정회원' : currentUser.membershipTier === 'associate' ? '준회원' : '비회원'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{currentUser.elo}</Text>
            <Text style={styles.statLabel}>Elo</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{winRate}%</Text>
            <Text style={styles.statLabel}>승률</Text>
          </Card>
          <Pressable
            onPress={() => setShowPointsHistory(true)}
            style={({ pressed }) => [styles.statCard, styles.statCardPressable, pressed && styles.statCardPressed]}
          >
            <Text style={styles.statValue}>{currentUser.points}P</Text>
            <Text style={styles.statLabel}>포인트</Text>
            <Text style={styles.statHint}>내역 보기</Text>
          </Pressable>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{currentUser.totalGames}</Text>
            <Text style={styles.statLabel}>총 게임</Text>
          </Card>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 도착 일정</Text>
          <ArrivalScheduleCard />
        </Card>

        <Card style={styles.section}>
          <AttendanceCard />
        </Card>

        <Card style={styles.section}>
          <LessonApplyCard />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>전적</Text>
          <MatchHistoryList userId={currentUser.id} />
        </Card>

        <Card style={styles.section}>
          <EloChart data={MOCK_ELO_HISTORY} width={320} />
        </Card>

        <Card style={styles.section}>
          <HourlyHeadcountChart
            data={HEADCOUNT_DATA}
            myPresence={MY_PRESENCE}
            labels={HEADCOUNT_LABELS}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🧹 이번 달 청소 기여왕 Top 5</Text>
          {cleaningLeaderboard.slice(0, 5).map((entry, idx) => (
            <View key={entry.id} style={styles.leaderRow}>
              <Text style={styles.rank}>{idx + 1}</Text>
              <Text style={styles.leaderName}>{entry.userName}</Text>
              <Text style={styles.leaderArea}>{entry.area}</Text>
              <Text style={styles.leaderPts}>+{entry.points}P</Text>
            </View>
          ))}
          <Button
            title="청소 인증하기"
            onPress={() => setShowCleaning(true)}
            fullWidth
            variant="outline"
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>개발 · 테스트</Text>
          <Pressable
            onPress={() => setDemoMode(!demoMode)}
            style={styles.demoRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: demoMode }}
          >
            <View style={styles.demoTextWrap}>
              <Text style={styles.demoLabel}>데모 모드</Text>
              <Text style={styles.demoHint}>
                위치·활동 시간 제한 없이 전 기능 체험 (실제 배포 시 OFF)
              </Text>
            </View>
            <View style={[styles.demoSwitch, demoMode && styles.demoSwitchOn]}>
              <View style={[styles.demoKnob, demoMode && styles.demoKnobOn]} />
            </View>
          </Pressable>
        </Card>

        <Button
          title="로그아웃"
          onPress={() => {
            logout();
            router.replace('/login');
          }}
          fullWidth
          variant="ghost"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
      </PageContainer>

      {showPointsHistory && (
        <PointsHistorySheet
          visible={showPointsHistory}
          userId={currentUser.id}
          balance={currentUser.points}
          onClose={() => setShowPointsHistory(false)}
        />
      )}

      {showCleaning && (
        <View style={styles.cleaningModal}>
          <View style={styles.cleaningSheet}>
            <Text style={styles.modalTitle}>청소 인증</Text>
            <Text style={styles.label}>구역 선택</Text>
            <View style={styles.areaGrid}>
              {CLEANING_AREAS.map((area) => (
                <Pressable
                  key={area}
                  onPress={() => setSelectedArea(area)}
                  style={[styles.areaChip, selectedArea === area && styles.areaChipActive]}
                >
                  <Text style={[styles.areaText, selectedArea === area && styles.areaTextActive]}>
                    {area}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>참여 인원</Text>
            <TextInput
              style={styles.input}
              value={participantCount}
              onChangeText={setParticipantCount}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Button title="취소" onPress={() => setShowCleaning(false)} variant="ghost" />
              <Button title="인증 제출" onPress={handleCleaningSubmit} variant="secondary" />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
  profileHeader: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  profileInfo: { flex: 1, justifyContent: 'center' },
  name: { ...typography.h2, color: colors.text },
  studentId: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  tierBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierText: { ...typography.small, color: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', alignItems: 'center', padding: spacing.lg },
  statCardPressable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  statCardPressed: { opacity: 0.85 },
  statHint: { ...typography.small, color: colors.primary, marginTop: 2, fontSize: 10 },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs, textTransform: 'none' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md, fontSize: 16 },
  scheduleHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  scheduleSep: { ...typography.body, color: colors.textMuted },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rank: { ...typography.bodyBold, color: colors.primary, width: 24 },
  leaderName: { ...typography.body, color: colors.text, flex: 1 },
  leaderArea: { ...typography.caption, color: colors.textMuted },
  leaderPts: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  cleaningModal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  cleaningSheet: {
    ...glass.sheet,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  areaChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  areaText: { ...typography.caption, color: colors.text },
  areaTextActive: { color: colors.textLight },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  demoTextWrap: { flex: 1, gap: 4 },
  demoLabel: { ...typography.bodyBold, color: colors.text },
  demoHint: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  demoSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  demoSwitchOn: { backgroundColor: colors.primary },
  demoKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  demoKnobOn: { alignSelf: 'flex-end' },
});
