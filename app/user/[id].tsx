import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { UserPublicProfile } from '@/src/components/profile/UserPublicProfile';
import { FriendActionButton } from '@/src/components/friends/FriendActionButton';
import { colors, spacing, typography } from '@/src/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const users = useAuthStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.currentUser);
  const user = users.find((u) => u.id === id);

  if (authHydrated && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: '프로필', headerShown: true }} />
        <View style={styles.center}>
          <Text style={styles.empty}>회원을 찾을 수 없어요</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isSelf = currentUser?.id === user.id;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: user.name,
          headerShown: true,
          headerRight: () =>
            !isSelf ? (
              <View style={styles.headerAction}>
                <FriendActionButton otherUserId={user.id} compact />
              </View>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <UserPublicProfile user={user} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  empty: { ...typography.body, color: colors.textMuted },
  backBtn: { padding: spacing.md },
  backText: { ...typography.bodyBold, color: colors.primary },
  headerAction: { marginRight: spacing.sm },
});
