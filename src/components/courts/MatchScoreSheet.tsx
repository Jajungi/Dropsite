import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import type { CourtPlayer } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

interface MatchScoreSheetProps {
  visible: boolean;
  courtId: number;
  players: CourtPlayer[];
  onSubmit: (scoreA: number, scoreB: number) => void;
  onClose: () => void;
  /** Elo 반영 대상 경기 여부 (난타=false) */
  rated?: boolean;
}

function splitTeams(players: CourtPlayer[]) {
  const mid = Math.ceil(players.length / 2);
  return {
    teamA: players.slice(0, mid),
    teamB: players.slice(mid),
  };
}

export function MatchScoreSheet({
  visible,
  courtId,
  players,
  onSubmit,
  onClose,
  rated = true,
}: MatchScoreSheetProps) {
  const { teamA, teamB } = splitTeams(players);
  const [scoreA, setScoreA] = useState('21');
  const [scoreB, setScoreB] = useState('15');

  if (!visible) return null;

  const parsedA = parseInt(scoreA, 10) || 0;
  const parsedB = parseInt(scoreB, 10) || 0;
  const valid = parsedA !== parsedB && parsedA >= 0 && parsedB >= 0;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit(parsedA, parsedB);
    setScoreA('21');
    setScoreB('15');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{courtId}번 코트 · 경기 결과</Text>
          <Text style={styles.subtitle}>
            {rated
              ? '점수를 입력하면 Elo·포인트가 바로 반영돼요'
              : '난타는 친선경기라 Elo가 변동하지 않아요'}
          </Text>

          <View style={styles.teams}>
            <View style={styles.teamCol}>
              <Text style={styles.teamLabel}>Team A</Text>
              {teamA.map((p) => (
                <Text key={p.userId} style={styles.playerName}>
                  {p.name}
                </Text>
              ))}
              <TextInput
                style={styles.scoreInput}
                value={scoreA}
                onChangeText={setScoreA}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <Text style={styles.vs}>VS</Text>

            <View style={styles.teamCol}>
              <Text style={styles.teamLabel}>Team B</Text>
              {teamB.map((p) => (
                <Text key={p.userId} style={styles.playerName}>
                  {p.name}
                </Text>
              ))}
              <TextInput
                style={styles.scoreInput}
                value={scoreB}
                onChangeText={setScoreB}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          {!valid && (
            <Text style={styles.error}>동점은 입력할 수 없어요</Text>
          )}

          <View style={styles.presets}>
            {['21-15', '21-18', '21-10'].map((preset) => {
              const [a, b] = preset.split('-');
              return (
                <Pressable
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => {
                    setScoreA(a);
                    setScoreB(b);
                  }}
                >
                  <Text style={styles.presetText}>{preset}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title="결과 제출" onPress={handleSubmit} fullWidth size="lg" disabled={!valid} />
          <Button
            title={rated ? '점수 없이 닫기 (친선경기)' : '닫기'}
            onPress={onClose}
            fullWidth
            size="md"
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text, marginBottom: 4 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  teams: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  teamCol: { flex: 1, alignItems: 'center', gap: 4 },
  teamLabel: { ...typography.label, color: colors.textSecondary },
  playerName: { ...typography.caption, color: colors.text },
  scoreInput: {
    marginTop: spacing.sm,
    width: 56,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  vs: { ...typography.bodyBold, color: colors.textMuted, paddingHorizontal: spacing.sm },
  error: { ...typography.caption, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
  presets: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
});
