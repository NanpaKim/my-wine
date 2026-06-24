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
});
