/** HH:MM → 자정 기준 분 */
export function minutesFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → HH:MM */
export function hhmmFromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 슬라이더 눈금 — 시작·끝 포함, step 간격 (끝 시각이 step 배수가 아니면 마지막에 추가) */
export function buildSlotMarks(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  stepMinutes = 30
): string[] {
  const marks: string[] = [];
  let cur = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  while (cur < end) {
    marks.push(hhmmFromMinutes(cur));
    cur += stepMinutes;
  }
  const endStr = hhmmFromMinutes(end);
  if (marks[marks.length - 1] !== endStr) {
    marks.push(endStr);
  }
  return marks;
}

/** 구간 인덱스 범위 → 시작·끝 HH:MM */
export function rangeIndicesToTimes(
  marks: string[],
  startIdx: number,
  endIdx: number
): { start: string; end: string } {
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);
  return { start: marks[lo], end: marks[hi + 1] ?? marks[marks.length - 1] };
}

/** 저장된 범위 → 선택된 구간 인덱스 집합 */
export function rangeToSelectedIndices(
  marks: string[],
  start?: string,
  end?: string
): Set<number> {
  const range = timesToRangeIndices(marks, start, end);
  if (!range) return new Set();
  const lo = Math.min(range.startIdx, range.endIdx);
  const hi = Math.max(range.startIdx, range.endIdx);
  const set = new Set<number>();
  for (let i = lo; i <= hi; i++) set.add(i);
  return set;
}

/** 선택된 인덱스를 연속 구간들로 분리 */
export function getContiguousRuns(indices: number[]): [number, number][] {
  if (!indices.length) return [];
  const sorted = [...indices].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  let lo = sorted[0];
  let hi = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === hi + 1) {
      hi = sorted[i];
    } else {
      runs.push([lo, hi]);
      lo = hi = sorted[i];
    }
  }
  runs.push([lo, hi]);
  return runs;
}

/** 선택된 구간 인덱스 → 시작·끝 HH:MM (가장 긴 연속 구간 기준, 없으면 null) */
export function selectedIndicesToTimes(
  marks: string[],
  selected: Set<number>
): { start: string; end: string } | null {
  const runs = getContiguousRuns([...selected]);
  if (!runs.length) return null;
  const [lo, hi] = runs.reduce((best, run) =>
    run[1] - run[0] > best[1] - best[0] ? run : best
  );
  return { start: marks[lo], end: marks[hi + 1] ?? marks[marks.length - 1] };
}

/** 선택 요약 — 연속 구간별 표시 */
export function formatSelectionSummary(marks: string[], selected: Set<number>): string | null {
  const runs = getContiguousRuns([...selected]);
  if (!runs.length) return null;
  return runs
    .map(([lo, hi]) => `${marks[lo]} — ${marks[hi + 1] ?? marks[marks.length - 1]}`)
    .join(' · ');
}

/** HH:MM 범위 → 구간 인덱스 (없으면 null) */
export function timesToRangeIndices(
  marks: string[],
  start?: string,
  end?: string
): { startIdx: number; endIdx: number } | null {
  if (!start) return null;
  const startIdx = marks.indexOf(start);
  if (startIdx < 0) return null;

  if (!end) {
    return { startIdx, endIdx: startIdx };
  }

  const endIdx = marks.indexOf(end) - 1;
  if (endIdx < startIdx) return { startIdx, endIdx: startIdx };
  return { startIdx, endIdx };
}
