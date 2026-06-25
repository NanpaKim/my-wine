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
import { parseVivinoResponse } from '../logic/vivinoParse';

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

/** 2순위: Vivino 비공식 검색 엔드포인트 직접 호출. 파싱은 logic/vivinoParse.ts(순수 함수)에 위임. */
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
      if (!res.ok) {
        console.warn(`[vivino] HTTP ${res.status} for query: ${q}`);
        return null;
      }

      const data: unknown = await res.json();
      const parsed = parseVivinoResponse(data);
      if (!parsed) {
        // 응답은 왔지만 가격 경로를 못 맞춤. 실기기 디버깅용으로 실제 응답을 남긴다.
        // (vivino.com 접근이 막힌 개발 환경에서는 스키마를 검증할 수 없으므로,
        //  실패 시 이 로그를 보고 logic/vivinoParse.ts의 경로를 맞추면 된다.)
        console.warn(
          `[vivino] price parse miss for "${q}". raw response: ` +
            JSON.stringify(data).slice(0, 2000),
        );
        return null;
      }

      return { ...parsed, source: 'vivino', fetchedAt: new Date().toISOString() };
    } catch (e) {
      console.warn(`[vivino] fetch failed for "${q}":`, e);
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
