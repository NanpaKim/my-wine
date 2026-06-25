/** 적정가 판정/평점 표시용 한글 라벨 + 색 톤 헬퍼(화면 공용). */

import type { PriceVerdict, Rating3 } from '../types/wine';
import { colors } from './theme';

export function verdictLabel(v: PriceVerdict): string {
  switch (v) {
    case 'cheap': return '저렴';
    case 'fair': return '적절';
    case 'expensive': return '비쌈';
    case 'unknown': return '판단 불가';
  }
}

/** 판정에 대응하는 전경/배경 색 + 방향 글리프. 뱃지 표시에 사용. */
export function verdictTone(v: PriceVerdict): { fg: string; bg: string; glyph: string } {
  switch (v) {
    case 'cheap': return { fg: colors.cheap, bg: colors.cheapSoft, glyph: '▲' };
    case 'fair': return { fg: colors.fair, bg: colors.fairSoft, glyph: '◆' };
    case 'expensive': return { fg: colors.expensive, bg: colors.expensiveSoft, glyph: '▼' };
    case 'unknown': return { fg: colors.unknown, bg: colors.unknownSoft, glyph: '·' };
  }
}

export function pairingLabel(r: Rating3 | null): string {
  switch (r) {
    case 'good': return '잘 어울림';
    case 'ok': return '보통';
    case 'bad': return '별로';
    default: return '-';
  }
}
