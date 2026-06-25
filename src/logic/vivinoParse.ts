/**
 * Vivino 비공식 검색 응답(JSON)에서 가격을 뽑아내는 순수 함수 (외부 의존 없음).
 *
 * Vivino는 공식 API가 없어 응답 스키마를 보장할 수 없다. 따라서 모든 필드를
 * optional/unknown으로 두고, 알려진 여러 후보 경로를 방어적으로 시도한다.
 * 하나도 못 맞추면 null을 반환한다(throw 금지). 실제 응답 구조가 추정과 다르면
 * 이 파일의 경로만 고치면 되도록, 네트워크 호출(services/priceLookup.ts)과 분리했다.
 */

/** 파싱으로 얻은 가격 요약(통화 변환 없이 원 통화 그대로). source/fetchedAt은 호출부가 채운다. */
export interface ParsedPrice {
  min: number;
  avg: number;
  max: number;
  currency: string;
}

interface PriceLike {
  amount?: unknown;
  currency?: unknown;
}

/** unknown 값에서 {amount:number, currency:string} 후보를 안전하게 추출(아니면 null). */
function asPriceCandidate(v: unknown): { amount: number; currency: string } | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as PriceLike;
  const amount = typeof p.amount === 'number' ? p.amount : Number(p.amount);
  const currency = typeof p.currency === 'string' ? p.currency : null;
  if (!Number.isFinite(amount) || amount <= 0 || !currency) return null;
  return { amount, currency };
}

/**
 * 카드(와인 하나) 객체에서 가능한 가격 후보를 모두 모은다. 알려진 후보 경로:
 *   - card.price            (단일 대표가)
 *   - card.prices[]         (판매처별 가격 목록)
 *   - card.vintage.price / card.vintage.prices (vintage 하위에 중첩된 경우)
 */
export function extractPriceCandidates(card: unknown): { amount: number; currency: string }[] {
  if (!card || typeof card !== 'object') return [];
  const c = card as Record<string, unknown>;
  const out: { amount: number; currency: string }[] = [];

  const pushFrom = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    const single = asPriceCandidate(n.price);
    if (single) out.push(single);
    if (Array.isArray(n.prices)) {
      for (const p of n.prices) {
        const cand = asPriceCandidate(p);
        if (cand) out.push(cand);
      }
    }
  };

  pushFrom(c);
  pushFrom(c.vintage);
  return out;
}

/**
 * Vivino explore 응답(이미 JSON.parse된 unknown)에서 ParsedPrice를 만든다.
 * 알려진 후보 경로: explore_vintage.matches[] (각 원소가 와인 카드).
 * 가격을 하나도 못 찾으면 null.
 */
export function parseVivinoResponse(data: unknown): ParsedPrice | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;

  // 알려진 후보: explore_vintage.matches. 다른 구조 대비해 records/matches도 시도.
  const explore = root.explore_vintage as Record<string, unknown> | undefined;
  const matches =
    (Array.isArray(explore?.matches) && explore?.matches) ||
    (Array.isArray(explore?.records) && explore?.records) ||
    (Array.isArray(root.matches) && root.matches) ||
    [];

  const allPrices = (matches as unknown[]).flatMap(extractPriceCandidates);
  if (allPrices.length === 0) return null;

  // 통화가 섞여 있을 수 있으니 가장 흔한 통화 하나로 통일(변환 안 함).
  const currency = mostCommonCurrency(allPrices);
  const amounts = allPrices.filter((p) => p.currency === currency).map((p) => p.amount);
  if (amounts.length === 0) return null;

  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  return { min: Math.min(...amounts), avg, max: Math.max(...amounts), currency };
}

function mostCommonCurrency(prices: { currency: string }[]): string {
  const counts = new Map<string, number>();
  for (const p of prices) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
  let best = prices[0].currency;
  let bestCount = 0;
  for (const [cur, count] of counts) {
    if (count > bestCount) { best = cur; bestCount = count; }
  }
  return best;
}
