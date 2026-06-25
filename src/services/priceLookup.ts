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

// ── Wine-Searcher (1순위) ──────────────────────────────────────────────
// 키는 빌드 환경변수로 주입한다(Expo: EXPO_PUBLIC_* 는 클라이언트에 인라인됨).
// 무료 키는 wine-searcher.com/trade 에서 신청한다. 키가 없으면 이 공급자는
// 조용히 null 을 반환해 다음 폴백으로 넘어간다.
const WS_KEY = process.env.EXPO_PUBLIC_WINE_SEARCHER_KEY;
// 엔드포인트 경로는 키 발급 시 안내받는 값으로 덮어쓸 수 있게 환경변수로 둔다.
const WS_URL =
  process.env.EXPO_PUBLIC_WINE_SEARCHER_URL ?? 'https://api.wine-searcher.com/wine-select';

/** 요청 URL 구성(순수 함수, 테스트 가능). */
export function buildWineSearcherUrl(query: PriceQuery, key: string, base = WS_URL): string {
  const p = new URLSearchParams({ api_key: key, winename: query.name, format: 'json' });
  if (query.vintage) p.set('vintage', String(query.vintage));
  if (query.preferredCurrency) p.set('currencycode', query.preferredCurrency);
  return `${base}?${p.toString()}`;
}

function pickNum(node: any, keys: string[]): number | null {
  for (const k of keys) {
    const raw = node?.[k];
    const n = typeof raw === 'string' ? Number(raw.replace(/[^0-9.]/g, '')) : raw;
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Wine-Searcher 응답 → ReferencePrice (순수 함수, 테스트 가능).
 * 검증된 필드: price-average / price-min / price-max (750ml, ex-tax).
 * 응답 래핑/표기 차이에 견디도록 흔한 키 변형도 함께 본다. avg 가 없으면 null.
 */
export function parseWineSearcherResponse(
  data: any,
  requestedCurrency: string,
): ReferencePrice | null {
  const w = data?.['wine-searcher'] ?? data?.wine ?? data?.result ?? data;
  const node = Array.isArray(w) ? w[0] : w;
  if (!node || typeof node !== 'object') return null;

  const avg = pickNum(node, ['price-average', 'price_average', 'average_price', 'priceAverage']);
  if (avg == null) return null;

  return {
    min: pickNum(node, ['price-min', 'price_min', 'min_price', 'priceMin']),
    avg,
    max: pickNum(node, ['price-max', 'price_max', 'max_price', 'priceMax']),
    currency: node.currency ?? node['currency-code'] ?? requestedCurrency,
    source: 'wine-searcher',
    fetchedAt: new Date().toISOString(),
  };
}

export const wineSearcherProvider: PriceProvider = {
  source: 'wine-searcher',
  async fetch(query: PriceQuery): Promise<ReferencePrice | null> {
    if (!WS_KEY) return null; // 키 없으면 폴백으로
    const res = await fetch(buildWineSearcherUrl(query, WS_KEY));
    if (!res.ok) return null;
    const data = await res.json();
    return parseWineSearcherResponse(data, query.preferredCurrency ?? 'KRW');
  },
};

// ── Vivino (2순위) ────────────────────────────────────────────────────
// 공식 API가 없어 비공식 엔드포인트 스크래핑이 필요한데, 이는 (a) 약관
// 그레이존, (b) 사이트 변경에 취약, (c) 클라이언트 직접 호출 시 차단·IP 제한이
// 잦다 — 안정적으로 하려면 별도 백엔드가 필요하다(DESIGN.md §6). 추측 스키마로
// 깨지기 쉬운 코드를 넣지 않고, 백엔드 프록시가 준비되면 그 URL을 환경변수로
// 받아 연동하는 형태로 남겨둔다. 그전까지는 null(폴백).
const VIVINO_PROXY_URL = process.env.EXPO_PUBLIC_VIVINO_PROXY_URL;

export const vivinoProvider: PriceProvider = {
  source: 'vivino',
  async fetch(query: PriceQuery): Promise<ReferencePrice | null> {
    if (!VIVINO_PROXY_URL) return null; // 백엔드 프록시 없으면 패스
    try {
      const url = `${VIVINO_PROXY_URL}?q=${encodeURIComponent(query.name)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data: any = await res.json();
      const avg = pickNum(data, ['avg', 'price', 'average']);
      if (avg == null) return null;
      return {
        min: pickNum(data, ['min']),
        avg,
        max: pickNum(data, ['max']),
        currency: data.currency ?? query.preferredCurrency ?? 'KRW',
        source: 'vivino',
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
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
