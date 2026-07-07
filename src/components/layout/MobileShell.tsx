import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from './AppHeader';
import { colors } from '@/src/theme';

/** 모바일·태블릿: 상단 헤더 + 하단 탭(자식) 네이티브 앱형 셸 */
export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppHeader />
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
