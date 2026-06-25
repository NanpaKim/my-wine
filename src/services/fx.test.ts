import { getFxRate, FX_CACHE_TTL_MS, _clearFxCache, type FxProvider } from './fx';

function provider(name: string, rate: number | null, opts: { throws?: boolean } = {}): FxProvider {
  return {
    name,
    async fetchRate() {
      if (opts.throws) throw new Error('boom');
      return rate;
    },
  };
}

describe('getFxRate', () => {
  beforeEach(() => _clearFxCache());

  it('같은 통화면 네트워크 없이 1', async () => {
    const calls: string[] = [];
    const p = provider('p', 1450);
    const spy: FxProvider = { name: 'p', async fetchRate(f, t) { calls.push('hit'); return p.fetchRate(f, t); } };
    expect(await getFxRate('KRW', 'KRW', [spy])).toBe(1);
    expect(calls).toHaveLength(0); // 호출 안 함
  });

  it('공급자에서 환율을 받아온다', async () => {
    expect(await getFxRate('EUR', 'KRW', [provider('p', 1450)])).toBe(1450);
  });

  it('첫 공급자 실패 시 다음으로 폴백', async () => {
    const rate = await getFxRate('EUR', 'KRW', [provider('a', null, { throws: true }), provider('b', 1450)]);
    expect(rate).toBe(1450);
  });

  it('모두 실패하면 null', async () => {
    expect(await getFxRate('EUR', 'KRW', [provider('a', null), provider('b', null)])).toBeNull();
  });

  it('신선한 캐시는 공급자를 다시 안 부른다', async () => {
    let n = 0;
    const counting: FxProvider = { name: 'c', async fetchRate() { n++; return 1450; } };
    await getFxRate('EUR', 'KRW', [counting]);
    await getFxRate('EUR', 'KRW', [counting]);
    expect(n).toBe(1);
  });

  it('캐시 만료 후에는 다시 조회', async () => {
    let n = 0;
    const counting: FxProvider = { name: 'c', async fetchRate() { n++; return 1450; } };
    const t0 = 1_000_000;
    await getFxRate('EUR', 'KRW', [counting], t0);
    await getFxRate('EUR', 'KRW', [counting], t0 + FX_CACHE_TTL_MS + 1);
    expect(n).toBe(2);
  });

  it('갱신 실패 시 오래된 캐시라도 사용(stale fallback)', async () => {
    const t0 = 1_000_000;
    await getFxRate('EUR', 'KRW', [provider('ok', 1450)], t0); // 캐시 채움
    // TTL 지난 뒤 공급자 전부 실패 → 옛 캐시 1450 반환
    const rate = await getFxRate('EUR', 'KRW', [provider('fail', null, { throws: true })], t0 + FX_CACHE_TTL_MS + 1);
    expect(rate).toBe(1450);
  });
});
