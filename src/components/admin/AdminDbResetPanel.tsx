import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { recordAdminLogAsActor } from '@/src/services/adminLog';
import {
  DB_RESET_OPTIONS,
  executeDbReset,
  generateResetConfirmCode,
  type DbResetDanger,
  type DbResetOption,
  type DbResetScope,
} from '@/src/services/dbReset';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

type ResetStep = 'idle' | 'confirm' | 'code';

interface AdminDbResetPanelProps {
  adminId: string;
}

const DANGER_LABEL: Record<DbResetDanger, string> = {
  critical: '치명적',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const DANGER_COLOR: Record<DbResetDanger, string> = {
  critical: colors.error,
  high: '#D64545',
  medium: colors.warning,
  low: colors.textMuted,
};

export function AdminDbResetPanel({ adminId }: AdminDbResetPanelProps) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useNotificationStore((s) => s.showToast);

  const [selectedScope, setSelectedScope] = useState<DbResetScope | null>(null);
  const [step, setStep] = useState<ResetStep>('idle');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [running, setRunning] = useState(false);

  const selectedOption = useMemo(
    () => DB_RESET_OPTIONS.find((o) => o.scope === selectedScope) ?? null,
    [selectedScope]
  );

  const openResetFlow = (option: DbResetOption) => {
    setSelectedScope(option.scope);
    setStep('confirm');
    setConfirmCode('');
    setCodeInput('');
  };

  const closeResetFlow = () => {
    setStep('idle');
    setSelectedScope(null);
    setConfirmCode('');
    setCodeInput('');
  };

  const proceedToCodeStep = () => {
    setConfirmCode(generateResetConfirmCode());
    setCodeInput('');
    setStep('code');
  };

  const handleExecute = async () => {
    if (!selectedOption || codeInput !== confirmCode) return;

    setRunning(true);
    try {
      const result = await executeDbReset(selectedOption.scope);
      if (!result.success) {
        showToast({ type: 'warning', title: '리셋 실패', message: result.message });
        return;
      }

      recordAdminLogAsActor(adminId, {
        category: 'system',
        action: 'db_reset',
        message: `DB 리셋 실행: ${selectedOption.title}`,
        meta: {
          scope: selectedOption.scope,
          deletedUsers: result.deletedUsers ?? 0,
        },
      });

      closeResetFlow();

      if (result.requiresLogout) {
        showToast({
          type: 'info',
          title: '완전 초기화 완료',
          message: '모든 계정이 삭제되어 로그아웃됩니다. 다시 회원가입해 주세요.',
        });
        await logout();
        router.replace('/login');
        return;
      }

      const extra =
        result.deletedUsers && result.deletedUsers > 0
          ? ` (${result.deletedUsers}개 계정 삭제)`
          : '';
      showToast({
        type: 'success',
        title: '리셋 완료',
        message: `${selectedOption.title} 완료${extra}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      showToast({ type: 'warning', title: '리셋 실패', message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning" size={20} color={colors.error} />
          <Text style={styles.warningTitle}>데이터베이스 리셋</Text>
        </View>
        <Text style={styles.warningText}>
          선택한 작업은 되돌릴 수 없습니다. 실행 전 두 번 확인하고, 아래에 표시되는
          10자리 숫자를 정확히 입력해야 합니다.
        </Text>
        {!isSupabaseEnabled() && (
          <Text style={styles.localHint}>
            현재 로컬 모드입니다. Supabase에 연결된 환경에서는 서버 DB가 직접 변경됩니다.
          </Text>
        )}
      </Card>

      {DB_RESET_OPTIONS.map((option) => (
        <Card key={option.scope} style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <View style={[styles.dangerBadge, { backgroundColor: `${DANGER_COLOR[option.danger]}18` }]}>
                <Text style={[styles.dangerBadgeText, { color: DANGER_COLOR[option.danger] }]}>
                  {DANGER_LABEL[option.danger]}
                </Text>
              </View>
            </View>
            <Text style={styles.optionDesc}>{option.description}</Text>
          </View>

          <View style={styles.effects}>
            {option.effects.map((effect) => (
              <View key={effect} style={styles.effectRow}>
                <Text style={styles.effectBullet}>·</Text>
                <Text style={styles.effectText}>{effect}</Text>
              </View>
            ))}
          </View>

          <Button
            title="이 작업 실행"
            onPress={() => openResetFlow(option)}
            variant={option.danger === 'critical' ? 'danger' : 'secondary'}
            size="sm"
          />
        </Card>
      ))}

      <Modal visible={step !== 'idle'} transparent animationType="fade" onRequestClose={closeResetFlow}>
        <Pressable style={styles.modalBackdrop} onPress={closeResetFlow}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {step === 'confirm' && selectedOption && (
              <>
                <Text style={styles.modalTitle}>정말 실행하시겠습니까?</Text>
                <Text style={styles.modalOptionName}>{selectedOption.title}</Text>
                <Text style={styles.modalBody}>
                  이 작업은 되돌릴 수 없습니다. 계속하려면 다음 단계에서 확인 코드를
                  입력해야 합니다.
                </Text>
                <View style={styles.modalActions}>
                  <Button title="취소" onPress={closeResetFlow} variant="secondary" size="sm" />
                  <Button title="계속" onPress={proceedToCodeStep} variant="danger" size="sm" />
                </View>
              </>
            )}

            {step === 'code' && selectedOption && (
              <>
                <Text style={styles.modalTitle}>확인 코드 입력</Text>
                <Text style={styles.modalBody}>
                  아래 10자리 숫자를 그대로 입력하면 {selectedOption.title} 이(가) 실행됩니다.
                </Text>
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeDisplayText}>{confirmCode}</Text>
                </View>
                <TextInput
                  style={styles.codeInput}
                  value={codeInput}
                  onChangeText={(v) => setCodeInput(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10자리 숫자 입력"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <Button title="취소" onPress={closeResetFlow} variant="secondary" size="sm" />
                  <Button
                    title={running ? '실행 중…' : '리셋 실행'}
                    onPress={() => void handleExecute()}
                    variant="danger"
                    size="sm"
                    disabled={running || codeInput !== confirmCode}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  warningCard: {
    gap: spacing.sm,
    borderColor: `${colors.error}40`,
    backgroundColor: '#FFF5F5',
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warningTitle: { ...typography.bodyBold, color: colors.error },
  warningText: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  localHint: { ...typography.caption, color: colors.warning },
  optionCard: { gap: spacing.md },
  optionHeader: { gap: 4 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  optionTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  dangerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  dangerBadgeText: { ...typography.caption, fontWeight: '600', fontSize: 11 },
  optionDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  effects: { gap: 2 },
  effectRow: { flexDirection: 'row', gap: 6 },
  effectBullet: { ...typography.caption, color: colors.textMuted },
  effectText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.18)' } : {}),
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalOptionName: { ...typography.bodyBold, color: colors.error },
  modalBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  codeDisplay: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  codeDisplayText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.text,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
