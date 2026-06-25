/**
 * 적정가 판단 로직 (순수 함수, 외부 의존 없음).
 * 설계 근거는 DESIGN.md §4 적정가 판단 로직 참조.
 *
 * 기준점은 조회된 "현지 평균 소매가"(ReferencePrice.avg)다.
 *  - 소매(retail): 낸 가격을 현지 평균가와 직접 비교.
 *  - 식당(restaurant): 외식업계 표준 마크업(소매가의 2~3배) 범위로 판정.
 *  - 시세를 구하지 못하면 'unknown'.
 *
 * ⚠️ 통화: 낸 가격과 시세의 통화가 다르면(예: 시세 EUR, 결제 KRW) 그냥 숫자로
 * 비교하면 판정이 완전히 틀어진다. 그래서 통화가 다를 때는 fxRate(환율)로
 * 시세를 결제 통화로 환산한 뒤 비교하고, 환율이 없으면 'unknown'(사유:
 * currency-mismatch)으로 둔다 — 틀린 판정을 내느니 모름이 낫다.
 */

import type { PriceVerdict, PurchaseType } from '../types/wine';

/** 식당 마크업 표준 배수(업계 통념: 소매가의 2~3배). */
export const RESTAURANT_MARKUP_MIN = 2;
export const RESTAURANT_MARKUP_MAX = 3;

/**
 * 소매 판정의 "적정" 허용 오차.
 * 현지 평균가의 ±20% 이내면 적정으로 본다(시세 자체가 범위 값이므로 여유를 둠).
 */
export const RETAIL_FAIR_TOLERANCE = 0.2;

/** unknown 으로 떨어진 이유(없으면 'ok'). UI 에서 안내 문구 분기에 사용. */
export type PriceVerdictReason = 'ok' | 'no-reference' | 'currency-mismatch';

export interface PriceVerdictInput {
  purchaseType: PurchaseType;
  /** 내가 낸 가격. */
  pricePaid: number;
  /** pricePaid 의 통화(ISO 4217). 미지정이면 통화 검사를 생략(시세와 같다고 가정). */
  paidCurrency?: string | null;
  /** 조회된 현지 평균 소매가. 없으면 null → 'unknown'. */
  referenceAvg: number | null;
  /** referenceAvg 의 통화(ISO 4217). 미지정이면 통화 검사를 생략. */
  referenceCurrency?: string | null;
  /**
   * 환율: referenceCurrency 1단위 = fxRate × paidCurrency.
   * 통화가 다를 때만 필요. 예) 시세 EUR, 결제 KRW, 1EUR=1450KRW → fxRate=1450.
   * 통화가 다른데 fxRate 가 없으면 'currency-mismatch'.
   */
  fxRate?: number | null;
}

export interface PriceVerdictResult {
  verdict: PriceVerdict;
  /** 판정 기준이 된 적정 범위 [하한, 상한] (결제 통화 기준). unknown이면 null. */
  fairRange: [number, number] | null;
  /** 낸 가격이 현지 평균가(환산 후)의 몇 배인지. unknown이면 null. */
  ratio: number | null;
  /** verdict 가 unknown 일 때 그 이유. 정상 판정이면 'ok'. */
  reason: PriceVerdictReason;
}

function unknown(reason: PriceVerdictReason): PriceVerdictResult {
  return { verdict: 'unknown', fairRange: null, ratio: null, reason };
}

/**
 * 낸 가격이 적정한지 판정한다.
 *
 * @example retail, 현지 평균 40000, 낸 값 100000 → expensive (2.5배)
 * @example restaurant, 현지 평균 40000, 낸 값 100000 → fair (적정 80000~120000)
 * @example 시세 EUR, 결제 KRW, fxRate 없음 → unknown (currency-mismatch)
 */
export function judgePrice(input: PriceVerdictInput): PriceVerdictResult {
  const { purchaseType, pricePaid, referenceAvg } = input;

  if (referenceAvg == null || referenceAvg <= 0) {
    return unknown('no-reference');
  }

  // 통화 정규화: 시세(referenceAvg)를 결제 통화로 환산한다.
  let refInPaid = referenceAvg;
  const bothCurrenciesKnown = !!input.paidCurrency && !!input.referenceCurrency;
  if (bothCurrenciesKnown && input.paidCurrency !== input.referenceCurrency) {
    if (input.fxRate == null || input.fxRate <= 0) {
      return unknown('currency-mismatch'); // 환율 없이는 비교 불가 → 틀린 판정 방지
    }
    refInPaid = referenceAvg * input.fxRate;
  }

  const ratio = pricePaid / refInPaid;

  let lower: number;
  let upper: number;
  if (purchaseType === 'restaurant') {
    lower = refInPaid * RESTAURANT_MARKUP_MIN;
    upper = refInPaid * RESTAURANT_MARKUP_MAX;
  } else {
    lower = refInPaid * (1 - RETAIL_FAIR_TOLERANCE);
    upper = refInPaid * (1 + RETAIL_FAIR_TOLERANCE);
  }

  let verdict: PriceVerdict;
  if (pricePaid < lower) {
    verdict = 'cheap';
  } else if (pricePaid > upper) {
    verdict = 'expensive';
  } else {
    verdict = 'fair';
  }

  return { verdict, fairRange: [lower, upper], ratio, reason: 'ok' };
}
