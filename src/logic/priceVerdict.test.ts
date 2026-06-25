import { judgePrice } from './priceVerdict';

describe('judgePrice', () => {
  describe('referenceAvg 없음', () => {
    it('referenceAvg가 null이면 unknown', () => {
      const r = judgePrice({ purchaseType: 'retail', pricePaid: 100000, referenceAvg: null });
      expect(r.verdict).toBe('unknown');
      expect(r.fairRange).toBeNull();
      expect(r.ratio).toBeNull();
    });

    it('referenceAvg가 0 이하이면 unknown', () => {
      const r = judgePrice({ purchaseType: 'retail', pricePaid: 100000, referenceAvg: 0 });
      expect(r.verdict).toBe('unknown');
    });
  });

  describe('retail — 현지 평균 ±20% 기준', () => {
    const ref = 40000; // 적정 범위 32000 ~ 48000

    it('평균보다 한참 비싸면 expensive', () => {
      // DESIGN.md 예시: 현지 4만, 소매 10만 → 비쌈
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 100000, referenceAvg: ref }).verdict).toBe('expensive');
    });

    it('평균 근처면 fair', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 40000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('평균보다 한참 싸면 cheap', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 25000, referenceAvg: ref }).verdict).toBe('cheap');
    });

    it('상한 경계(+20%)는 fair', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 48000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('상한 바로 위는 expensive', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 48001, referenceAvg: ref }).verdict).toBe('expensive');
    });

    it('하한 경계(-20%)는 fair', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 32000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('하한 바로 아래는 cheap', () => {
      expect(judgePrice({ purchaseType: 'retail', pricePaid: 31999, referenceAvg: ref }).verdict).toBe('cheap');
    });
  });

  describe('restaurant — 소매가 2~3배 기준', () => {
    const ref = 40000; // 적정 범위 80000 ~ 120000

    it('적정 범위 안이면 fair (DESIGN.md 예시: 식당 10만)', () => {
      expect(judgePrice({ purchaseType: 'restaurant', pricePaid: 100000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('3배 초과면 expensive (식당 20만 → 5배)', () => {
      expect(judgePrice({ purchaseType: 'restaurant', pricePaid: 200000, referenceAvg: ref }).verdict).toBe('expensive');
    });

    it('2배 미만이면 cheap', () => {
      expect(judgePrice({ purchaseType: 'restaurant', pricePaid: 60000, referenceAvg: ref }).verdict).toBe('cheap');
    });

    it('2배 경계는 fair', () => {
      expect(judgePrice({ purchaseType: 'restaurant', pricePaid: 80000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('3배 경계는 fair', () => {
      expect(judgePrice({ purchaseType: 'restaurant', pricePaid: 120000, referenceAvg: ref }).verdict).toBe('fair');
    });

    it('fairRange와 ratio를 함께 반환', () => {
      const r = judgePrice({ purchaseType: 'restaurant', pricePaid: 200000, referenceAvg: ref });
      expect(r.fairRange).toEqual([80000, 120000]);
      expect(r.ratio).toBe(5);
    });
  });

  describe('통화 처리', () => {
    it('통화 미지정이면 기존처럼 숫자 비교(하위호환)', () => {
      const r = judgePrice({ purchaseType: 'retail', pricePaid: 40000, referenceAvg: 40000 });
      expect(r.verdict).toBe('fair');
      expect(r.reason).toBe('ok');
    });

    it('같은 통화면 정상 판정', () => {
      const r = judgePrice({
        purchaseType: 'retail', pricePaid: 40000, paidCurrency: 'KRW',
        referenceAvg: 40000, referenceCurrency: 'KRW',
      });
      expect(r.verdict).toBe('fair');
      expect(r.reason).toBe('ok');
    });

    it('통화 다른데 환율 없으면 unknown(currency-mismatch)', () => {
      // 시세 30 EUR, 결제 50000 KRW — 그냥 비교하면 "엄청 비쌈"으로 오판
      const r = judgePrice({
        purchaseType: 'retail', pricePaid: 50000, paidCurrency: 'KRW',
        referenceAvg: 30, referenceCurrency: 'EUR',
      });
      expect(r.verdict).toBe('unknown');
      expect(r.reason).toBe('currency-mismatch');
      expect(r.fairRange).toBeNull();
    });

    it('통화 다르면 fxRate로 환산해 판정', () => {
      // 시세 30 EUR × 1450 = 43500 KRW (적정 34800~52200), 결제 45000 KRW → fair
      const r = judgePrice({
        purchaseType: 'retail', pricePaid: 45000, paidCurrency: 'KRW',
        referenceAvg: 30, referenceCurrency: 'EUR', fxRate: 1450,
      });
      expect(r.verdict).toBe('fair');
      expect(r.reason).toBe('ok');
      expect(r.fairRange).toEqual([34800, 52200]);
    });

    it('환산 후에도 비싸면 expensive', () => {
      // 시세 30 EUR × 1450 = 43500 KRW (적정 상한 52200), 결제 100000 KRW → expensive
      const r = judgePrice({
        purchaseType: 'retail', pricePaid: 100000, paidCurrency: 'KRW',
        referenceAvg: 30, referenceCurrency: 'EUR', fxRate: 1450,
      });
      expect(r.verdict).toBe('expensive');
    });
  });
});
