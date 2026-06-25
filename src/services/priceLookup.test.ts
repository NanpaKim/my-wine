import {
  buildWineSearcherUrl,
  parseWineSearcherResponse,
  lookupPrice,
  manualReferencePrice,
  type PriceProvider,
} from './priceLookup';

describe('buildWineSearcherUrl', () => {
  it('필수 파라미터(api_key, winename, format)와 통화·빈티지를 넣는다', () => {
    const url = buildWineSearcherUrl(
      { name: 'Château Margaux', vintage: 2015, preferredCurrency: 'KRW' },
      'KEY123',
      'https://api.example/wine-select',
    );
    const q = new URL(url).searchParams;
    expect(q.get('api_key')).toBe('KEY123');
    expect(q.get('winename')).toBe('Château Margaux'); // 인코딩 왕복 확인
    expect(q.get('format')).toBe('json');
    expect(q.get('currencycode')).toBe('KRW');
    expect(q.get('vintage')).toBe('2015');
  });
});

describe('parseWineSearcherResponse', () => {
  it('검증된 하이픈 필드(price-average/min/max)를 읽는다', () => {
    const r = parseWineSearcherResponse(
      { 'price-average': 52000, 'price-min': 41000, 'price-max': 68000, currency: 'KRW' },
      'KRW',
    );
    expect(r).toMatchObject({ avg: 52000, min: 41000, max: 68000, currency: 'KRW', source: 'wine-searcher' });
  });

  it('래퍼 키/배열로 와도 첫 결과를 파싱', () => {
    const r = parseWineSearcherResponse({ 'wine-searcher': [{ 'price-average': '40,000' }] }, 'KRW');
    expect(r?.avg).toBe(40000); // 통화 기호/콤마 제거
  });

  it('통화 미표기면 요청 통화를 사용', () => {
    const r = parseWineSearcherResponse({ 'price-average': 30 }, 'EUR');
    expect(r?.currency).toBe('EUR');
  });

  it('평균가가 없으면 null', () => {
    expect(parseWineSearcherResponse({ region: 'Bordeaux' }, 'KRW')).toBeNull();
    expect(parseWineSearcherResponse(null, 'KRW')).toBeNull();
  });
});

describe('lookupPrice (폴백 체인)', () => {
  const fake = (source: any, ref: any, opts: { throws?: boolean } = {}): PriceProvider => ({
    source,
    async fetch() {
      if (opts.throws) throw new Error('x');
      return ref;
    },
  });

  it('첫 공급자가 성공하면 그 결과', async () => {
    const r = await lookupPrice({ name: 'w' }, [
      fake('wine-searcher', { avg: 1, min: null, max: null, currency: 'KRW', source: 'wine-searcher', fetchedAt: 't' }),
      fake('vivino', { avg: 2 } as any),
    ]);
    expect(r?.avg).toBe(1);
  });

  it('첫 공급자 null/throw 면 다음으로', async () => {
    const r = await lookupPrice({ name: 'w' }, [
      fake('wine-searcher', null, { throws: true }),
      fake('vivino', { avg: 2, min: null, max: null, currency: 'KRW', source: 'vivino', fetchedAt: 't' }),
    ]);
    expect(r?.avg).toBe(2);
  });

  it('전부 실패하면 null', async () => {
    expect(await lookupPrice({ name: 'w' }, [fake('wine-searcher', null), fake('vivino', null)])).toBeNull();
  });
});

describe('manualReferencePrice', () => {
  it('수동 입력을 ReferencePrice로', () => {
    const r = manualReferencePrice(45000, 'KRW');
    expect(r).toMatchObject({ avg: 45000, currency: 'KRW', source: 'manual', min: null, max: null });
  });
});
