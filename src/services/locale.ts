/**
 * 기기 로케일에서 통화를 자동 감지(사용자 입력 없이).
 * 예: 한국 기기 → "KRW", 미국 기기 → "USD".
 */
import { getLocales } from 'expo-localization';

/** 기기 기본 통화(ISO 4217). 못 구하면 fallback(기본 KRW). */
export function getDeviceCurrency(fallback = 'KRW'): string {
  try {
    const code = getLocales()?.[0]?.currencyCode;
    return code || fallback;
  } catch {
    return fallback;
  }
}
