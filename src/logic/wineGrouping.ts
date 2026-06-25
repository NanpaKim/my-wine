/**
 * 와인 목록을 품종/지역별로 묶는 순수 함수.
 * 블렌드 와인(여러 품종)은 각 품종 그룹에 모두 나타난다.
 */

import type { Wine } from '../types/wine';

export interface WineGroup {
  key: string;
  label: string;
  wines: Wine[];
}

const UNKNOWN_LABEL = '미정';

export function groupWinesByRegion(wines: Wine[]): WineGroup[] {
  const map = new Map<string, WineGroup>();
  for (const wine of wines) {
    const country = wine.region.country.trim() || UNKNOWN_LABEL;
    const region = wine.region.region?.trim();
    const label = region ? `${country} · ${region}` : country;
    const group = map.get(label) ?? { key: label, label, wines: [] };
    group.wines.push(wine);
    map.set(label, group);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function groupWinesByVariety(wines: Wine[]): WineGroup[] {
  const map = new Map<string, WineGroup>();
  for (const wine of wines) {
    const grapes = wine.varieties.length > 0 ? wine.varieties.map((v) => v.grape) : [UNKNOWN_LABEL];
    for (const grape of grapes) {
      const group = map.get(grape) ?? { key: grape, label: grape, wines: [] };
      group.wines.push(wine);
      map.set(grape, group);
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}
