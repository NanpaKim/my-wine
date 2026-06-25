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

/**
 * Vivino 검색 응답에서 와인 카드를 가리키는 최소 타입. 비공식 엔드포인트라
 * 실제 필드가 더 많고/다를 수 있어 모두 optional + unknown으로 방어한다.
 */
interface VivinoVintageCard {
  vintage?: {
    statistics?: { wine_yearly_buy_count?: number };
  };
  price?: { amount?: number; currency?: string };
  prices?: { amount?: number; currency?: string }[];
}

interface VivinoExploreResponse {
  explore_vintage?: {
    matches?: VivinoVintageCard[];
  };
}

/** 카드 하나에서 시도 가능한 가격 후보를 모두 모아 본다(스키마 추정이라 여러 경로 시도). */
function extractPriceCandidates(card: VivinoVintageCard): { amount: number; currency: string }[] {
  const candidates: { amount: number; currency: string }[] = [];
  if (card.price?.amount != null && card.price.currency) {
    candidates.push({ amount: card.price.amount, currency: card.price.currency });
  }
  for (const p of card.prices ?? []) {
    if (p.amount != null && p.currency) candidates.push({ amount: p.amount, currency: p.currency });
  }
  return candidates;
}

/** 2순위: Vivino 비공식 검색 엔드포인트 직접 호출. 응답 스키마는 추정이라 방어적으로 파싱. */
export const vivinoProvider: PriceProvider = {
  source: 'vivino',
  async fetch(query: PriceQuery): Promise<ReferencePrice | null> {
    const q = [query.producer, query.name, query.vintage].filter(Boolean).join(' ');
    if (!q.trim()) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://www.vivino.com/api/explore/explore?q=${encodeURIComponent(q)}&page=1&per_page=5`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
      });
      if (!res.ok) return null;

      const data = (await res.json()) as VivinoExploreResponse;
      const matches = data.explore_vintage?.matches ?? [];
      const allPrices = matches.flatMap(extractPriceCandidates);
      if (allPrices.length === 0) return null;

      const currency = allPrices[0].currency;
      const amounts = allPrices.filter((p) => p.currency === currency).map((p) => p.amount);
      if (amounts.length === 0) return null;

      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      return {
        min: Math.min(...amounts),
        avg,
        max: Math.max(...amounts),
        currency,
        source: 'vivino',
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
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
