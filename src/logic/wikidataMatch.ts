/**
 * OCR 줄 텍스트를 품종/지역 기준 데이터와 매칭하는 순수 함수 (외부 의존 없음).
 * 기준 데이터(JSON)는 src/services/wikidata.ts에서 로딩해 이 함수들에 주입한다.
 */

import type { Region, Variety } from '../types/wine';

export interface SeedRegion {
  country: string;
  region: string;
  subRegions: string[];
}

export interface MatchResult {
  varieties: Variety[];
  region: Region | null;
  confidence: number;
}

/** 악센트 제거 + 소문자화 + 구두점 정리. 라벨 OCR 표기 차이(Pinot Noir vs PINOT NOIR)를 흡수. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 표준 편집 거리(Levenshtein). 짧은 단어 단위 OCR 오타 허용 매칭에 사용. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** rawText 안에 candidate가 (거의) 포함돼 있는지. 부분 문자열 우선, 짧은 후보는 편집거리로 보정. */
function fuzzyContains(normalizedRawText: string, candidate: string): boolean {
  const normCandidate = normalizeText(candidate);
  if (!normCandidate) return false;
  if (normalizedRawText.includes(normCandidate)) return true;

  // 단어 단위로 슬라이딩하며 편집거리 허용 매칭(짧은 OCR 오타 흡수).
  const candWords = normCandidate.split(' ');
  const rawWords = normalizedRawText.split(' ');
  const maxDist = normCandidate.length <= 5 ? 1 : 2;
  for (let i = 0; i <= rawWords.length - candWords.length; i++) {
    const window = rawWords.slice(i, i + candWords.length).join(' ');
    if (levenshtein(window, normCandidate) <= maxDist) return true;
  }
  return false;
}

/** OCR 줄들에서 등장하는 품종을 찾는다. 긴 이름을 먼저 매칭해 부분 중복(예: Syrah ⊂ Petite Syrah)을 피한다. */
export function matchGrapes(lines: string[], knownGrapes: string[]): Variety[] {
  const rawText = lines.join(' ');
  const normalizedRawText = normalizeText(rawText);
  const sorted = [...knownGrapes].sort((a, b) => b.length - a.length);

  const found: Variety[] = [];
  let remaining = normalizedRawText;
  for (const grape of sorted) {
    if (fuzzyContains(remaining, grape)) {
      found.push({ grape, percent: extractPercentFor(lines, grape) });
      // 매칭된 후보 문자열을 지워 더 짧은 다른 후보가 같은 영역에 재매칭되는 걸 방지.
      remaining = remaining.replace(normalizeText(grape), ' ');
    }
  }
  return found;
}

/** "60% Merlot" / "Merlot 60%" 같은 같은 줄 패턴에서 블렌드 비율을 추출. 없으면 null. */
function extractPercentFor(lines: string[], grape: string): number | null {
  const normGrape = normalizeText(grape);
  for (const line of lines) {
    const normLine = normalizeText(line);
    if (!normLine.includes(normGrape)) continue;
    const match = normLine.match(/(\d{1,3})\s*%/);
    if (match) {
      const pct = Number(match[1]);
      if (pct >= 1 && pct <= 100) return pct;
    }
  }
  return null;
}

/** 가장 구체적인(세부지역 > 산지 > 국가) 매칭을 우선해 Region을 추정. */
export function matchRegion(lines: string[], knownRegions: SeedRegion[]): { region: Region | null; specificity: number } {
  const normalizedRawText = normalizeText(lines.join(' '));

  let best: { region: Region; specificity: number } | null = null;
  for (const r of knownRegions) {
    for (const subRegion of r.subRegions) {
      if (fuzzyContains(normalizedRawText, subRegion)) {
        const candidate = { country: r.country, region: r.region, subRegion };
        if (!best || best.specificity < 3) best = { region: candidate, specificity: 3 };
      }
    }
    if (fuzzyContains(normalizedRawText, r.region)) {
      if (!best || best.specificity < 2) best = { region: { country: r.country, region: r.region, subRegion: null }, specificity: 2 };
    }
    if (fuzzyContains(normalizedRawText, r.country)) {
      if (!best) best = { region: { country: r.country, region: null, subRegion: null }, specificity: 1 };
    }
  }
  return best ? { region: best.region, specificity: best.specificity } : { region: null, specificity: 0 };
}

/** 품종 + 지역 매칭을 합쳐 confidence를 산출. */
export function matchAll(lines: string[], knownGrapes: string[], knownRegions: SeedRegion[]): MatchResult {
  const varieties = matchGrapes(lines, knownGrapes);
  const { region, specificity } = matchRegion(lines, knownRegions);

  let confidence = 0;
  if (specificity > 0) confidence += specificity === 3 ? 0.6 : specificity === 2 ? 0.45 : 0.3;
  if (varieties.length > 0) confidence += 0.4;
  confidence = Math.min(1, confidence);

  return { varieties, region, confidence };
}
