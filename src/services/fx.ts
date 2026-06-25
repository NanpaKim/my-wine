/**
 * 환율 자동 조회 — 무료·무키 (DESIGN.md 무료 스택 원칙).
 *
 * 시세 통화(예: EUR)와 결제 통화(예: KRW)가 다를 때, 사용자 입력 없이
 * 자동으로 환율을 받아 priceVerdict 가 환산 비교할 수 있게 한다.
 *
 *   1. open.er-api.com (무키, 160+ 통화, 일 1회 갱신)
 *   2. 실패 시 frankfurter.dev (ECB, 무키)
 *   3. 그래도 실패면 null → judgePrice 가 'currency-mismatch'(unknown) 로 안전 처리.
 *
 * 환율은 자주 안 바뀌므로 (from,to) 별로 메모리 캐시(TTL 12h)한다.
 */

/** 단일 환율 공급자. 실패/미지원 시 null(throw 아님). */
export interface FxProvider {
  readonly name: string;
  /** from 1단위 = N × to. 못 구하면 null. */
  fetchRate(from: string, to: string): Promise<number | null>;
}

export const erApiFx: FxProvider = {
  name: 'er-api',
  async fetchRate(from, to) {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
    if (!res.ok) return null;
    const data: any = await res.json();
    const rate = data?.rates?.[to];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  },
};

export const frankfurterFx: FxProvider = {
  name: 'frankfurter',
  async fetchRate(from, to) {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`,
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const rate = data?.rates?.[to];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  },
};

export const defaultFxProviders: FxProvider[] = [erApiFx, frankfurterFx];

export const FX_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

interface CacheEntry {
  rate: number;
  at: number;
}
const cache = new Map<string, CacheEntry>();

/** 테스트용: 캐시 초기화. */
export function _clearFxCache(): void {
  cache.clear();
}

/**
 * from → to 환율을 반환한다(같은 통화면 1). 신선한 캐시가 있으면 그걸 쓰고,
 * 없으면 공급자 체인을 시도한다. 전부 실패하면 오래된 캐시라도(있으면) 쓰고,
 * 그마저 없으면 null → 호출부(judgePrice)는 'currency-mismatch' 로 안전 처리.
 */
export async function getFxRate(
  from: string,
  to: string,
  providers: FxProvider[] = defaultFxProviders,
  now: number = Date.now(),
): Promise<number | null> {
  if (from === to) return 1;

  const key = `${from}>${to}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < FX_CACHE_TTL_MS) return hit.rate;

  for (const provider of providers) {
    try {
      const rate = await provider.fetchRate(from, to);
      if (rate && rate > 0) {
        cache.set(key, { rate, at: now });
        return rate;
      }
    } catch {
      // 다음 공급자로
    }
  }
  return hit?.rate ?? null; // 오래된 캐시라도 있으면 사용
}
