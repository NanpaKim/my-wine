import { groupWines, regionKey, UNKNOWN_REGION, UNKNOWN_VARIETY } from './grouping';
import type { Wine } from '../types/wine';

function wine(over: Partial<Wine>): Wine {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'w',
    producer: null,
    vintage: null,
    varieties: [],
    region: { country: '', region: null, subRegion: null },
    labelImageUri: null,
    referencePrice: null,
    createdAt: '2026-01-01',
    ...over,
  };
}

describe('regionKey', () => {
  it('국가 › 대산지', () => {
    expect(regionKey(wine({ region: { country: '프랑스', region: '보르도', subRegion: null } }))).toBe('프랑스 › 보르도');
  });
  it('국가만', () => {
    expect(regionKey(wine({ region: { country: '이탈리아', region: null, subRegion: null } }))).toBe('이탈리아');
  });
  it('둘 다 없으면 미상', () => {
    expect(regionKey(wine({}))).toBe(UNKNOWN_REGION);
  });
});

describe('groupWines region', () => {
  it('지역별로 묶고 미상은 맨 뒤', () => {
    const sections = groupWines(
      [
        wine({ name: 'a', region: { country: '이탈리아', region: null, subRegion: null } }),
        wine({ name: 'b', region: { country: '프랑스', region: '보르도', subRegion: null } }),
        wine({ name: 'c' }), // 미상
        wine({ name: 'd', region: { country: '프랑스', region: '보르도', subRegion: null } }),
      ],
      'region',
    );
    expect(sections.map((s) => s.title)).toEqual(['이탈리아', '프랑스 › 보르도', UNKNOWN_REGION]);
    expect(sections[1].data.map((w) => w.name)).toEqual(['b', 'd']); // 같은 지역 묶임
  });
});

describe('groupWines variety', () => {
  it('블렌드는 각 품종 그룹에 모두 들어가고, 없으면 미상', () => {
    const sections = groupWines(
      [
        wine({ name: 'blend', varieties: [{ grape: 'Merlot', percent: 60 }, { grape: 'Cabernet Sauvignon', percent: 40 }] }),
        wine({ name: 'plain' }), // 품종 미상
      ],
      'variety',
    );
    const byTitle = Object.fromEntries(sections.map((s) => [s.title, s.data.map((w) => w.name)]));
    expect(byTitle['Merlot']).toEqual(['blend']);
    expect(byTitle['Cabernet Sauvignon']).toEqual(['blend']);
    expect(byTitle[UNKNOWN_VARIETY]).toEqual(['plain']);
    expect(sections[sections.length - 1].title).toBe(UNKNOWN_VARIETY); // 미상 맨 뒤
  });
});
