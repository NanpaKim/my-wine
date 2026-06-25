/**
 * 통화 환산 — Frankfurter API(frankfurter.dev) 사용. 키 불필요, ECB 환율 기준,
 * 호출 제한 없음. 변환 실패(네트워크/미지원 통화)는 throw 없이 null을 반환한다.
 */

export interface CurrencyConverter {
  /** amount(from 통화)를 to 통화로 환산. 실패 시 null. */
  convert(amount: number, from: string, to: string): Promise<number | null>;
}

const RATE_CACHE_MS = 24 * 60 * 60 * 1000;
const rateCache = new Map<string, { rate: number; fetchedAt: number }>();

async function fetchRate(from: string, to: string): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[to];
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch (e) {
    console.warn(`[currency] rate fetch failed for ${from}->${to}:`, e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const currencyConverter: CurrencyConverter = {
  async convert(amount, from, to) {
    const a = from.trim().toUpperCase();
    const b = to.trim().toUpperCase();
    if (a === b) return amount;

    const key = `${a}_${b}`;
    const cached = rateCache.get(key);
    const now = Date.now();
    let rate: number | null = cached && now - cached.fetchedAt < RATE_CACHE_MS ? cached.rate : null;

    if (rate == null) {
      rate = await fetchRate(a, b);
      if (rate != null) rateCache.set(key, { rate, fetchedAt: now });
    }
    return rate != null ? amount * rate : null;
  },
};
