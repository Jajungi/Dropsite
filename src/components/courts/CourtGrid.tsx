import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Court } from '@/src/types';
import { CourtCard } from './CourtCard';
import { LightShadowCapture } from '@/src/components/ui/LightShadowView';
import { SoftEdgeFade } from '@/src/components/ui/SoftEdgeFade';
import { GymFloorMap } from '@/src/components/courts/GymFloorMap';
import { GYM_COURT_ROWS, GYM_VENUE } from '@/src/constants/court';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, typography, spacing } from '@/src/theme';

interface CourtGridProps {
  courts: Court[];
  onCourtPress: (court: Court) => void;
  selectedCourtId?: number | null;
  filter?: 'all' | 'empty' | 'mine';
  myUserId?: string;
  registerCourtRef?: (id: number, ref: View | null) => void;
}

function getCourtById(courts: Court[], id: number): Court | undefined {
  return courts.find((c) => c.id === id);
}

function matchesFilter(court: Court, filter: 'all' | 'empty' | 'mine', myUserId?: string) {
  if (filter === 'empty') return court.status === 'empty';
  if (filter === 'mine' && myUserId) {
    return court.reservedBy === myUserId || court.players.some((p) => p.userId === myUserId);
  }
  return true;
}

export function CourtGrid({
  courts,
  onCourtPress,
  selectedCourtId,
  filter = 'all',
  myUserId,
  registerCourtRef,
}: CourtGridProps) {
  const {
    courtWidth,
    courtGap,
    gridPadding,
    gridContentHeight,
    contentWidth,
    entranceGutter,
    cardHPad,
    cardChromeTop,
    cardChrome,
  } = useLayoutMode();
  const floorTopInset = 30;

  return (
    <LightShadowCapture>
      <SoftEdgeFade size={28}>
        <View
          style={[
            styles.container,
            { paddingHorizontal: gridPadding, minHeight: gridContentHeight, width: contentWidth },
          ]}
        >
          <GymFloorMap
            courtWidth={courtWidth}
            courtGap={courtGap}
            floorWidth={contentWidth}
            entranceGutter={entranceGutter}
            cardChrome={cardChrome}
          />
          <View style={{ paddingTop: floorTopInset }}>
            {GYM_COURT_ROWS.map((row, rowIdx) => (
              <View
                key={rowIdx}
                style={[styles.rowWrap, { marginBottom: rowIdx < 2 ? courtGap : 0 }]}
              >
                {rowIdx === 2 ? (
                  <View style={[styles.entranceCol, { width: entranceGutter }]}>
                    <Text style={styles.entranceLabel}>{GYM_VENUE.entranceLabel}</Text>
                    <Text style={styles.entranceArrow}>▼</Text>
                  </View>
                ) : (
                  <View style={[styles.entranceSpacer, { width: entranceGutter }]} />
                )}

                <View style={[styles.row, { gap: courtGap }]}>
                  {row.map((courtId) => {
                    const court = getCourtById(courts, courtId);
                    if (!court) return null;
                    const dimmed = filter !== 'all' && !matchesFilter(court, filter, myUserId);
                    return (
                      <View
                        key={courtId}
                        ref={(ref) => registerCourtRef?.(courtId, ref)}
                        collapsable={false}
                        style={styles.courtSlot}
                      >
                        <CourtCard
                          court={court}
                          onPress={onCourtPress}
                          isSelected={selectedCourtId === courtId}
                          isDimmed={dimmed}
                          courtWidth={courtWidth}
                          hPad={cardHPad}
                          chromeTop={cardChromeTop}
                          compact
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </SoftEdgeFade>
    </LightShadowCapture>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md + 4,
    paddingTop: 2,
    position: 'relative',
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: '100%',
    zIndex: 1,
  },
  entranceCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
  },
  entranceLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 11,
    fontWeight: '700',
  },
  entranceArrow: {
    fontSize: 7,
    color: colors.textMuted,
    opacity: 0.65,
  },
  entranceSpacer: { flexShrink: 0 },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
    minWidth: 0,
  },
  courtSlot: {
    flexShrink: 1,
    minWidth: 0,
  },
});
