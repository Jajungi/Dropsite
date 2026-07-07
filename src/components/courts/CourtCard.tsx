import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { CourtIllustration } from './CourtIllustration';
import { CourtPlayerProfiles } from './CourtPlayerProfiles';
import { LightShadowView } from '@/src/components/ui/LightShadowView';
import { GameModeBadge } from './GameModeBadge';
import { CourtGameProgress } from './CourtGameProgress';
import { getCourtHeight, getCourtColumnLabel } from '@/src/constants/court';
import { formatCleanupRemaining, formatElapsed } from '@/src/utils/courtTime';
import { colors, borderRadius } from '@/src/theme';

interface CourtCardProps {
  court: Court;
  onPress: (court: Court) => void;
  isSelected?: boolean;
  isDimmed?: boolean;
  courtWidth: number;
  compact?: boolean;
}

export function CourtCard({
  court,
  onPress,
  isSelected,
  isDimmed,
  courtWidth,
  compact = true,
}: CourtCardProps) {
  const courtHeight = getCourtHeight(courtWidth);
  const radius = compact ? borderRadius.squish : borderRadius.lg;
  const canJoin = court.status === 'playing' && court.players.length >= 2 && court.players.length < 4;
  const showProfiles = court.players.length > 0;
  const avatarSize = compact
    ? Math.max(10, Math.min(16, courtWidth * 0.14))
    : Math.max(14, Math.min(22, courtWidth * 0.2));
  const isReserved = court.status === 'reserved';
  const isPlaying = court.status === 'playing';
  const isCooling = court.status === 'just_finished';
  const showGameMode = court.gameMode && court.status !== 'empty';
  const elapsed = formatElapsed(court.startedAt);
  const cleanupLeft = formatCleanupRemaining(court.finishedAt);
  const colLabel = getCourtColumnLabel(court.id);

  return (
    <Pressable
      onPress={() => onPress(court)}
      style={({ pressed }) => [
        styles.wrapper,
        { width: courtWidth },
        isDimmed && styles.dimmed,
        pressed && styles.pressed,
      ]}
    >
      {isReserved && (
        <View style={[styles.reservedTagWrap, { pointerEvents: 'none' }]}>
          <View style={styles.reservedTag}>
            <Text style={styles.reservedText}>예약됨</Text>
          </View>
        </View>
      )}

      {isCooling && (
        <View style={[styles.reservedTagWrap, { pointerEvents: 'none' }]}>
          <View style={styles.coolingTag}>
            <Text style={styles.coolingText}>정리 중</Text>
          </View>
        </View>
      )}

      <LightShadowView
        style={[
          styles.courtShadow,
          { width: courtWidth, borderRadius: radius },
          isSelected && styles.selected,
        ]}
        intensity={isSelected ? 1.1 : 1}
        elevated={isPlaying}
      >
        <View style={[styles.courtClip, { width: courtWidth, height: courtHeight, borderRadius: radius }]}>
          <CourtIllustration court={court} width={courtWidth} borderRadius={radius} />

          <CourtGameProgress court={court} courtWidth={courtWidth} />

          {showProfiles && (
            <CourtPlayerProfiles
              players={court.players}
              avatarSize={avatarSize}
              courtWidth={courtWidth}
              courtHeight={courtHeight}
              compact={compact}
            />
          )}

          <View style={styles.numBadge}>
            <Text style={styles.numText}>{court.id}</Text>
            {(colLabel || court.isCenter) && (
              <Text style={styles.colText}>{court.isCenter ? '센터' : colLabel}</Text>
            )}
          </View>

          {showGameMode && (
            <View
              style={[
                styles.modeBadgeWrap,
                isPlaying && court.players.length > 0 && styles.modeBadgeAboveLive,
                { pointerEvents: 'none' },
              ]}
            >
              <GameModeBadge
                mode={court.gameMode!}
                nantaHalf={court.nantaHalf}
                compact
              />
            </View>
          )}

          {isPlaying && court.players.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {court.players.length}명 · {court.gamesCompleted}/{court.maxGames || '?'}
                {elapsed ? ` · ${elapsed}` : ''}
              </Text>
            </View>
          )}

          {isCooling && (
            <View style={styles.coolingBadge}>
              <Text style={styles.coolingBadgeText}>
                {cleanupLeft ?? '정리 중'}
                {court.maxGames ? ` · ${court.gamesCompleted}/${court.maxGames}경기` : ''}
              </Text>
            </View>
          )}

          {canJoin && (
            <View style={styles.joinBadge}>
              <Text style={styles.joinText}>+</Text>
            </View>
          )}

          {court.isCoachCourt && !canJoin && (
            <View style={styles.coachTag}>
              <Text style={styles.coachText}>C</Text>
            </View>
          )}
        </View>
      </LightShadowView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 14,
    paddingHorizontal: 3,
    paddingBottom: 3,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  reservedTagWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  reservedTag: {
    backgroundColor: '#E86363',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    transform: [{ rotate: '-6deg' }],
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(232, 99, 99, 0.35)' } as object,
      default: {
        shadowColor: '#E86363',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  reservedText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  coolingTag: {
    backgroundColor: '#6A8A94',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    transform: [{ rotate: '-4deg' }],
  },
  coolingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  courtShadow: {
    overflow: 'visible',
  },
  courtClip: {
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 0 18px rgba(0,0,0,0.06), inset 0 0 6px rgba(0,0,0,0.04)',
      } as object,
      default: {},
    }),
  },
  selected: {
    outlineWidth: 2,
    outlineColor: colors.primary,
    outlineStyle: 'solid',
  } as object,
  dimmed: { opacity: 0.38 },
  pressed: { opacity: 0.94 },
  numBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  numText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 15,
  },
  colText: {
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    fontSize: 7,
    marginTop: 1,
  },
  modeBadgeWrap: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    zIndex: 4,
  },
  modeBadgeAboveLive: {
    bottom: 28,
  },
  liveBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7CFFB2',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },
  coolingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  coolingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  joinBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { color: '#FFF', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  coachTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
});
