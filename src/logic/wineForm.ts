/** 와인 입력 폼 보조: 품종 문자열 ↔ Variety[] 변환. */
import type { Variety } from '../types/wine';

/** "Merlot, Cabernet Sauvignon" → [{grape, percent:null}, ...] (비율은 폼에서 안 받음). */
export function parseGrapes(input: string): Variety[] {
  return input
    .split(/[,，]/)
    .map((g) => g.trim())
    .filter(Boolean)
    .map((grape) => ({ grape, percent: null }));
}

/** Variety[] → "Merlot, Cabernet Sauvignon" (수정 화면 프리필용). */
export function grapesToString(varieties: Variety[]): string {
  return varieties.map((v) => v.grape).join(', ');
}
