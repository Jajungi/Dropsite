import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { DropBrand } from '@/src/components/layout/DropBrand';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { DEFAULT_DEMO_PASSWORD } from '@/src/services/authCredentials';
import {
  DEMO_QUICK_ACCOUNTS,
  loadQuickLoginEntries,
  saveQuickLoginEntry,
  type QuickLoginEntry,
} from '@/src/services/quickLogin';
import { SCHOOL_NAME, CLUB_NAME } from '@/src/constants';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const showToast = useNotificationStore((s) => s.showToast);

  const [mode, setMode] = useState<Mode>('login');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberQuickLogin, setRememberQuickLogin] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<QuickLoginEntry[]>([]);

  const refreshQuickLogins = useCallback(async () => {
    const entries = await loadQuickLoginEntries();
    setSavedAccounts(entries);
  }, []);

  useEffect(() => {
    void refreshQuickLogins();
  }, [refreshQuickLogins]);

  const completeLogin = async (id: string, pw: string, displayName?: string) => {
    const result = login(id, pw);
    if (result.success) {
      if (rememberQuickLogin) {
        const user = useAuthStore.getState().currentUser;
        await saveQuickLoginEntry({
          studentId: id.trim(),
          name: displayName ?? user?.name ?? id,
          password: pw,
        });
      }
      router.replace('/(tabs)');
    } else {
      showToast({ type: 'warning', title: '', message: result.message });
    }
  };

  const handleLogin = () => {
    void completeLogin(studentId, password);
  };

  const handleQuickLogin = (entry: Pick<QuickLoginEntry, 'studentId' | 'name' | 'password'>) => {
    void completeLogin(entry.studentId, entry.password, entry.name);
  };

  const handleDemoQuickLogin = (account: (typeof DEMO_QUICK_ACCOUNTS)[number]) => {
    void completeLogin(account.studentId, DEFAULT_DEMO_PASSWORD, account.name);
  };

  const handleRegister = () => {
    if (password !== passwordConfirm) {
      showToast({ type: 'warning', title: '', message: '비밀번호 확인이 일치하지 않아요.' });
      return;
    }
    const result = register({ studentId, name, email, password });
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
    if (result.success) {
      setMode('login');
      setStudentId(studentId.trim());
      setPassword('');
      setPasswordConfirm('');
    }
  };

  const quickLoginItems: Array<
    | { kind: 'saved'; entry: QuickLoginEntry }
    | { kind: 'demo'; account: (typeof DEMO_QUICK_ACCOUNTS)[number] }
  > = [
    ...savedAccounts.map((entry) => ({ kind: 'saved' as const, entry })),
    ...DEMO_QUICK_ACCOUNTS.filter(
      (demo) => !savedAccounts.some((s) => s.studentId === demo.studentId)
    ).map((account) => ({ kind: 'demo' as const, account })),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <DropBrand />
            <Text style={styles.subtitle}>
              {SCHOOL_NAME} {CLUB_NAME} · S1 체육관
            </Text>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.tab, mode === 'login' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('register')}
              style={[styles.tab, mode === 'register' && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>회원가입</Text>
            </Pressable>
          </View>

          {mode === 'login' && quickLoginItems.length > 0 && (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>간편 로그인</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
              >
                {quickLoginItems.map((item) => {
                  const label = item.kind === 'saved' ? item.entry.name : item.account.name;
                  const sid = item.kind === 'saved' ? item.entry.studentId : item.account.studentId;
                  return (
                    <Pressable
                      key={sid}
                      style={styles.quickChip}
                      onPress={() =>
                        item.kind === 'saved'
                          ? handleQuickLogin(item.entry)
                          : handleDemoQuickLogin(item.account)
                      }
                    >
                      <Avatar name={label} color={colors.primary} size={40} />
                      <Text style={styles.quickName} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={styles.quickId}>{sid.slice(-4)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>학번</Text>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="예: 20240001"
              keyboardType="number-pad"
              autoCapitalize="none"
            />

            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'login' ? '비밀번호' : '6자 이상'}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {mode === 'register' && (
              <>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder="비밀번호 다시 입력"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Text style={styles.label}>이름</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="실명" />
                <Text style={styles.label}>이메일 (선택)</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@dgist.ac.kr"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            {mode === 'login' && (
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberQuickLogin((v) => !v)}
              >
                <Ionicons
                  name={rememberQuickLogin ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={rememberQuickLogin ? colors.primary : colors.textMuted}
                />
                <Text style={styles.rememberText}>이 기기에 간편 로그인 저장</Text>
              </Pressable>
            )}

            {mode === 'login' ? (
              <Button title="로그인" onPress={handleLogin} fullWidth size="lg" style={styles.submit} />
            ) : (
              <Button
                title="가입 신청"
                onPress={handleRegister}
                fullWidth
                size="lg"
                variant="secondary"
                style={styles.submit}
              />
            )}

            {mode === 'login' && (
              <Text style={styles.hint}>
                데모 계정: 학번 20240001~20240005, 관리자 20230001{'\n'}
                초기 비밀번호: {DEFAULT_DEMO_PASSWORD}
              </Text>
            )}
            {mode === 'register' && (
              <Text style={styles.hint}>
                가입 후 운영진 승인이 필요합니다. 승인되면 웰컴 500P가 지급됩니다.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  brandWrap: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } as object }),
  },
  tabText: { ...typography.bodyBold, color: colors.textMuted, fontSize: 14 },
  tabTextActive: { color: colors.primary },
  quickSection: { marginBottom: spacing.lg },
  quickTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  quickRow: { gap: spacing.sm, paddingVertical: 2 },
  quickChip: {
    alignItems: 'center',
    width: 72,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginTop: 4,
    maxWidth: 68,
    textAlign: 'center',
  },
  quickId: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  form: { gap: spacing.xs },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rememberText: { ...typography.small, color: colors.textSecondary },
  submit: { marginTop: spacing.lg },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
