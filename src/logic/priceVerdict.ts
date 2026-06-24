/**
 * 적정가 판단 로직 (순수 함수, 외부 의존 없음).
 * 설계 근거는 DESIGN.md §4 적정가 판단 로직 참조.
 *
 * 기준점은 조회된 "현지 평균 소매가"(ReferencePrice.avg)다.
 *  - 소매(retail): 낸 가격을 현지 평균가와 직접 비교.
 *  - 식당(restaurant): 외식업계 표준 마크업(소매가의 2~3배) 범위로 판정.
 *  - 시세를 구하지 못하면 'unknown'.
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

export interface PriceVerdictInput {
  purchaseType: PurchaseType;
  /** 내가 낸 가격. */
  pricePaid: number;
  /** 조회된 현지 평균 소매가. 없으면 null → 'unknown'. */
  referenceAvg: number | null;
}

export interface PriceVerdictResult {
  verdict: PriceVerdict;
  /** 판정 기준이 된 적정 범위 [하한, 상한]. unknown이면 null. */
  fairRange: [number, number] | null;
  /** 낸 가격이 현지 평균가의 몇 배인지. unknown이면 null. */
  ratio: number | null;
}

/**
 * 낸 가격이 적정한지 판정한다.
 *
 * @example retail, 현지 평균 40000, 낸 값 100000 → expensive (2.5배)
 * @example restaurant, 현지 평균 40000, 낸 값 100000 → fair (적정 80000~120000)
 */
export function judgePrice(input: PriceVerdictInput): PriceVerdictResult {
  const { purchaseType, pricePaid, referenceAvg } = input;

  if (referenceAvg == null || referenceAvg <= 0) {
    return { verdict: 'unknown', fairRange: null, ratio: null };
  }

  const ratio = pricePaid / referenceAvg;

  let lower: number;
  let upper: number;
  if (purchaseType === 'restaurant') {
    lower = referenceAvg * RESTAURANT_MARKUP_MIN;
    upper = referenceAvg * RESTAURANT_MARKUP_MAX;
  } else {
    lower = referenceAvg * (1 - RETAIL_FAIR_TOLERANCE);
    upper = referenceAvg * (1 + RETAIL_FAIR_TOLERANCE);
  }

  let verdict: PriceVerdict;
  if (pricePaid < lower) {
    verdict = 'cheap';
  } else if (pricePaid > upper) {
    verdict = 'expensive';
  } else {
    verdict = 'fair';
  }

  return { verdict, fairRange: [lower, upper], ratio };
}
