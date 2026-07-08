import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export type NumericConfirmStep = 'idle' | 'confirm' | 'code';

interface NumericConfirmModalProps {
  visible: boolean;
  step: Exclude<NumericConfirmStep, 'idle'>;
  title: string;
  body: string;
  codeHint: string;
  confirmCode: string;
  codeInput: string;
  onCodeInputChange: (value: string) => void;
  onClose: () => void;
  onProceedToCode: () => void;
  onExecute: () => void;
  executeLabel?: string;
  executing?: boolean;
  executingLabel?: string;
  children?: React.ReactNode;
}

export function NumericConfirmModal({
  visible,
  step,
  title,
  body,
  codeHint,
  confirmCode,
  codeInput,
  onCodeInputChange,
  onClose,
  onProceedToCode,
  onExecute,
  executeLabel = '실행',
  executing = false,
  executingLabel = '실행 중…',
  children,
}: NumericConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {step === 'confirm' && (
            <>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
              {children}
              <View style={styles.actions}>
                <Button title="취소" onPress={onClose} variant="secondary" size="sm" />
                <Button title="계속" onPress={onProceedToCode} variant="danger" size="sm" />
              </View>
            </>
          )}

          {step === 'code' && (
            <>
              <Text style={styles.title}>확인 코드 입력</Text>
              <Text style={styles.body}>{codeHint}</Text>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeDisplayText}>{confirmCode}</Text>
              </View>
              <TextInput
                style={styles.codeInput}
                value={codeInput}
                onChangeText={(v) => onCodeInputChange(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="10자리 숫자 입력"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
              <View style={styles.actions}>
                <Button title="취소" onPress={onClose} variant="secondary" size="sm" />
                <Button
                  title={executing ? executingLabel : executeLabel}
                  onPress={onExecute}
                  variant="danger"
                  size="sm"
                  disabled={executing || codeInput !== confirmCode}
                />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.18)' } : {}),
  },
  title: { ...typography.h3, color: colors.text },
  body: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
