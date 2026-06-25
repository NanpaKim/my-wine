import { extractPriceCandidates, parseVivinoResponse } from './vivinoParse';

describe('extractPriceCandidates', () => {
  it('reads a single card.price', () => {
    expect(extractPriceCandidates({ price: { amount: 42, currency: 'USD' } })).toEqual([
      { amount: 42, currency: 'USD' },
    ]);
  });

  it('reads a card.prices[] list', () => {
    const card = {
      prices: [
        { amount: 30, currency: 'USD' },
        { amount: 50, currency: 'USD' },
      ],
    };
    expect(extractPriceCandidates(card)).toEqual([
      { amount: 30, currency: 'USD' },
      { amount: 50, currency: 'USD' },
    ]);
  });

  it('reads price nested under vintage', () => {
    const card = { vintage: { price: { amount: 99, currency: 'EUR' } } };
    expect(extractPriceCandidates(card)).toEqual([{ amount: 99, currency: 'EUR' }]);
  });

  it('coerces numeric-string amounts and ignores invalid entries', () => {
    const card = {
      prices: [
        { amount: '25.5', currency: 'USD' },
        { amount: 0, currency: 'USD' }, // non-positive → dropped
        { amount: 10 }, // missing currency → dropped
        { currency: 'USD' }, // missing amount → dropped
      ],
    };
    expect(extractPriceCandidates(card)).toEqual([{ amount: 25.5, currency: 'USD' }]);
  });

  it('returns [] for non-object input', () => {
    expect(extractPriceCandidates(null)).toEqual([]);
    expect(extractPriceCandidates('nope')).toEqual([]);
  });
});

describe('parseVivinoResponse', () => {
  it('aggregates min/avg/max from explore_vintage.matches', () => {
    const data = {
      explore_vintage: {
        matches: [
          { price: { amount: 20, currency: 'USD' } },
          { price: { amount: 40, currency: 'USD' } },
          { prices: [{ amount: 60, currency: 'USD' }] },
        ],
      },
    };
    expect(parseVivinoResponse(data)).toEqual({ min: 20, avg: 40, max: 60, currency: 'USD' });
  });

  it('picks the most common currency when mixed', () => {
    const data = {
      explore_vintage: {
        matches: [
          { price: { amount: 100, currency: 'USD' } },
          { price: { amount: 200, currency: 'USD' } },
          { price: { amount: 9999, currency: 'EUR' } }, // minority currency → excluded
        ],
      },
    };
    expect(parseVivinoResponse(data)).toEqual({ min: 100, avg: 150, max: 200, currency: 'USD' });
  });

  it('falls back to explore_vintage.records when matches is absent', () => {
    const data = {
      explore_vintage: { records: [{ price: { amount: 35, currency: 'GBP' } }] },
    };
    expect(parseVivinoResponse(data)).toEqual({ min: 35, avg: 35, max: 35, currency: 'GBP' });
  });

  it('returns null when there are no usable prices', () => {
    expect(parseVivinoResponse({ explore_vintage: { matches: [] } })).toBeNull();
    expect(parseVivinoResponse({ explore_vintage: { matches: [{ vintage: {} }] } })).toBeNull();
  });

  it('returns null for malformed/empty input', () => {
    expect(parseVivinoResponse(null)).toBeNull();
    expect(parseVivinoResponse('garbage')).toBeNull();
    expect(parseVivinoResponse({})).toBeNull();
  });
});
