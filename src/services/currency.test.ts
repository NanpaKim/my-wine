import { currencyConverter } from './currency';

describe('currencyConverter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('동일 통화면 변환 없이 그대로 반환', async () => {
    const result = await currencyConverter.convert(1000, 'KRW', 'KRW');
    expect(result).toBe(1000);
  });

  it('환율을 받아와 변환한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { KRW: 1500 } }),
    }) as unknown as typeof fetch;

    const result = await currencyConverter.convert(10, 'EUR', 'KRW');
    expect(result).toBe(15000);
  });

  it('HTTP 실패 시 null', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await currencyConverter.convert(10, 'USD', 'KRW');
    expect(result).toBeNull();
  });

  it('네트워크 오류 시 null(throw 안 함)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    const result = await currencyConverter.convert(10, 'GBP', 'KRW');
    expect(result).toBeNull();
  });

  it('응답에 해당 통화 환율이 없으면 null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: {} }),
    }) as unknown as typeof fetch;

    const result = await currencyConverter.convert(10, 'JPY', 'KRW');
    expect(result).toBeNull();
  });
});
