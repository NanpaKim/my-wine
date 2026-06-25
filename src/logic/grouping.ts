/**
 * 와인을 지역별/품종별로 묶는 순수 로직 (홈 목록 섹션 구성).
 * 데이터가 비면 '미상' 그룹으로, 그 그룹은 항상 맨 뒤로 정렬한다.
 * 블렌드 와인은 품종별 보기에서 각 품종 그룹에 모두 들어간다.
 */
import type { Wine } from '../types/wine';

export type GroupMode = 'region' | 'variety';

/** 정렬: 이름 가나다/ABC순 | 최근 추가순. */
export type SortMode = 'name' | 'recent';

export interface WineSection {
  title: string;
  data: Wine[];
}

export const UNKNOWN_REGION = '지역 미상';
export const UNKNOWN_VARIETY = '품종 미상';

/** 지역 그룹 키: "국가 › 대산지"(있는 만큼). 둘 다 없으면 '지역 미상'. */
export function regionKey(w: Wine): string {
  const c = w.region?.country?.trim();
  const r = w.region?.region?.trim();
  if (!c && !r) return UNKNOWN_REGION;
  return [c, r].filter(Boolean).join(' › ');
}

/**
 * 와인을 mode(지역/품종)로 묶고 sort 로 정렬한다.
 * - 'name': 가나다/ABC순(섹션·항목 모두). '미상' 그룹은 맨 뒤.
 * - 'recent': 최근 추가순(createdAt 내림차순). 섹션은 가장 최근 항목 기준.
 */
export function groupWines(wines: Wine[], mode: GroupMode, sort: SortMode = 'name'): WineSection[] {
  const map = new Map<string, Wine[]>();
  const add = (key: string, w: Wine) => {
    const arr = map.get(key);
    if (arr) arr.push(w);
    else map.set(key, [w]);
  };

  for (const w of wines) {
    if (mode === 'region') {
      add(regionKey(w), w);
    } else {
      const grapes = (w.varieties ?? []).map((v) => v.grape.trim()).filter(Boolean);
      if (grapes.length === 0) add(UNKNOWN_VARIETY, w);
      else for (const g of grapes) add(g, w);
    }
  }

  const byRecent = (a: Wine, b: Wine) => b.createdAt.localeCompare(a.createdAt); // ISO 내림차순
  const byName = (a: Wine, b: Wine) => a.name.localeCompare(b.name, 'ko');
  for (const arr of map.values()) arr.sort(sort === 'recent' ? byRecent : byName);

  const unknown = mode === 'region' ? UNKNOWN_REGION : UNKNOWN_VARIETY;
  const titles = [...map.keys()];
  if (sort === 'recent') {
    // 섹션 순서 = 그 섹션의 가장 최근 항목(첫 항목이 이미 최신) 기준 내림차순.
    titles.sort((a, b) => map.get(b)![0].createdAt.localeCompare(map.get(a)![0].createdAt));
  } else {
    titles.sort((a, b) => {
      if (a === unknown) return 1; // 미상은 맨 뒤
      if (b === unknown) return -1;
      return a.localeCompare(b, 'ko');
    });
  }
  return titles.map((title) => ({ title, data: map.get(title)! }));
}
