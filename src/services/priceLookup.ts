/**
 * 현지 시세 조회 서비스 — 폴백 체인 (DESIGN.md §4).
 *
 *   1. Wine-Searcher 무료 API (개인 사용 = 사실상 무료, 키 신청 필요)
 *   2. 실패 시 Vivino 비공식 스크래핑 (약관 그레이존, 소형 백엔드 필요)
 *   3. 그래도 실패 시 사용자 수동 입력
 *
 * 각 공급자는 PriceProvider 인터페이스를 구현한다. 가격 조회 로직 전체를 이
 * 인터페이스 뒤에 두어, 나중에 유료 티어로 교체하거나 공급자를 추가해도
 * 상위 코드(화면)는 바뀌지 않는다.
 */

import type { ReferencePrice } from '../types/wine';

/** 와인을 시세 DB에서 식별하기 위한 질의 정보(OCR/사용자 입력에서 구성). */
export interface PriceQuery {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  /** 결과 통화 희망값(ISO 4217). 미지정 시 공급자 기본값. */
  preferredCurrency?: string;
}

/** 단일 시세 공급자. 조회 실패/미매칭 시 null을 반환한다(throw 아님). */
export interface PriceProvider {
  readonly source: ReferencePrice['source'];
  fetch(query: PriceQuery): Promise<ReferencePrice | null>;
}

/** 1순위: Wine-Searcher 무료 API. 키 연동 전까지 스텁. */
export const wineSearcherProvider: PriceProvider = {
  source: 'wine-searcher',
  async fetch(_query: PriceQuery): Promise<ReferencePrice | null> {
    // TODO: Wine-Searcher Wine Check API 연동 (min/avg/max 소매가). DESIGN.md §2.
    return null;
  },
};

/** 2순위: Vivino 비공식 스크래핑(소형 백엔드 경유). 연동 전까지 스텁. */
export const vivinoProvider: PriceProvider = {
  source: 'vivino',
  async fetch(_query: PriceQuery): Promise<ReferencePrice | null> {
    // TODO: Vivino 스크래핑 백엔드 연동. DESIGN.md §2, §6.
    return null;
  },
};

/** 폴백 순서대로 등록된 기본 공급자 체인. */
export const defaultPriceProviders: PriceProvider[] = [wineSearcherProvider, vivinoProvider];

/**
 * 공급자 체인을 순서대로 시도해 처음으로 성공한 시세를 반환한다.
 * 모두 실패하면 null → 호출부는 사용자 수동 입력(3순위)으로 폴백한다.
 */
export async function lookupPrice(
  query: PriceQuery,
  providers: PriceProvider[] = defaultPriceProviders,
): Promise<ReferencePrice | null> {
  for (const provider of providers) {
    try {
      const result = await provider.fetch(query);
      if (result) return result;
    } catch {
      // 한 공급자가 실패해도 다음 공급자로 계속 진행.
    }
  }
  return null;
}

/** 3순위: 사용자가 직접 입력한 현지 평균가를 ReferencePrice로 변환. */
export function manualReferencePrice(avg: number, currency: string): ReferencePrice {
  return {
    min: null,
    avg,
    max: null,
    currency,
    source: 'manual',
    fetchedAt: new Date().toISOString(),
  };
}
