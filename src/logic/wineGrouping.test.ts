import { groupWinesByRegion, groupWinesByVariety } from './wineGrouping';
import type { Wine } from '../types/wine';

function makeWine(overrides: Partial<Wine>): Wine {
  return {
    id: overrides.id ?? Math.random().toString(36),
    name: overrides.name ?? 'Test Wine',
    producer: overrides.producer ?? null,
    vintage: overrides.vintage ?? null,
    varieties: overrides.varieties ?? [],
    region: overrides.region ?? { country: '', region: null, subRegion: null },
    labelImageUri: null,
    referencePrice: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupWinesByRegion', () => {
  it('국가·산지 단위로 묶고 라벨 가나다순으로 정렬', () => {
    const wines = [
      makeWine({ id: '1', region: { country: 'France', region: 'Bordeaux', subRegion: null } }),
      makeWine({ id: '2', region: { country: 'France', region: 'Bordeaux', subRegion: 'Margaux' } }),
      makeWine({ id: '3', region: { country: 'Chile', region: null, subRegion: null } }),
    ];
    const groups = groupWinesByRegion(wines);
    expect(groups.map((g) => g.label)).toEqual(['Chile', 'France · Bordeaux']);
    expect(groups.find((g) => g.label === 'France · Bordeaux')?.wines.map((w) => w.id)).toEqual(['1', '2']);
  });

  it('국가 정보가 없으면 미정으로 묶인다', () => {
    const wines = [makeWine({ region: { country: '', region: null, subRegion: null } })];
    expect(groupWinesByRegion(wines)[0].label).toBe('미정');
  });
});

describe('groupWinesByVariety', () => {
  it('블렌드 와인은 각 품종 그룹에 모두 나타난다', () => {
    const wines = [
      makeWine({ id: '1', varieties: [{ grape: 'Cabernet Sauvignon', percent: 60 }, { grape: 'Merlot', percent: 40 }] }),
      makeWine({ id: '2', varieties: [{ grape: 'Merlot', percent: null }] }),
    ];
    const groups = groupWinesByVariety(wines);
    const labels = groups.map((g) => g.label);
    expect(labels).toEqual(['Cabernet Sauvignon', 'Merlot']);
    expect(groups.find((g) => g.label === 'Merlot')?.wines.map((w) => w.id)).toEqual(['1', '2']);
  });

  it('품종 정보가 없으면 미정으로 묶인다', () => {
    const wines = [makeWine({ varieties: [] })];
    expect(groupWinesByVariety(wines)[0].label).toBe('미정');
  });
});
