/** 적정가 판정/평점 표시용 한글 라벨 헬퍼(화면 공용). */

import type { PriceVerdict, Rating3 } from '../types/wine';

export function verdictLabel(v: PriceVerdict): string {
  switch (v) {
    case 'cheap': return '저렴 👍';
    case 'fair': return '적절';
    case 'expensive': return '비쌈 ⚠️';
    case 'unknown': return '판단 불가';
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
