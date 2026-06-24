/**
 * 품종/지역 매칭 서비스 인터페이스 + 스텁.
 *
 * OCR로 추출한 텍스트를, scripts/fetchWikidataReference.ts가 만들어 둔 기준
 * 데이터(품종·지역 사전)와 퍼지 매칭해 구조화된 Variety/Region을 만든다
 * (DESIGN.md §5). 실제 매칭(정규화 + 퍼지 비교)은 추후 구현.
 */

import type { Region, Variety } from '../types/wine';

export interface MatchResult {
  varieties: Variety[];
  region: Region | null;
  /** 매칭 신뢰도 0~1. 낮으면 사용자 보정 화면에서 강조. */
  confidence: number;
}

export interface WikidataMatcher {
  /** OCR 줄 텍스트들에서 품종/지역을 추정한다. */
  match(lines: string[]): Promise<MatchResult>;
}

/** 미구현 스텁. 기준 데이터 로딩 + 퍼지 매칭으로 교체 예정. */
export const wikidataMatcher: WikidataMatcher = {
  async match(_lines: string[]): Promise<MatchResult> {
    return { varieties: [], region: null, confidence: 0 };
  },
};
