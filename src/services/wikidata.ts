/**
 * 품종/지역 매칭 서비스 인터페이스 + 구현.
 *
 * OCR로 추출한 텍스트를, scripts/fetchWikidataReference.ts가 만들어 둔 기준
 * 데이터(assets/reference/*.json)와 퍼지 매칭해 구조화된 Variety/Region을 만든다
 * (DESIGN.md §5). 매칭 알고리즘 자체는 src/logic/wikidataMatch.ts의 순수 함수.
 */

import grapesData from '../../assets/reference/grapes.json';
import regionsData from '../../assets/reference/regions.json';
import { matchAll, type MatchResult } from '../logic/wikidataMatch';

export type { MatchResult };

export interface WikidataMatcher {
  /** OCR 줄 텍스트들에서 품종/지역을 추정한다. */
  match(lines: string[]): Promise<MatchResult>;
}

export const wikidataMatcher: WikidataMatcher = {
  async match(lines: string[]): Promise<MatchResult> {
    return matchAll(lines, grapesData.grapes, regionsData.regions);
  },
};
