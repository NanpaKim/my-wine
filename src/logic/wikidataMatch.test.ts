import { levenshtein, matchAll, matchGrapes, matchRegion, normalizeText } from './wikidataMatch';
import type { SeedRegion } from './wikidataMatch';

const GRAPES = ['Cabernet Sauvignon', 'Merlot', 'Syrah', 'Petite Sirah', 'Pinot Noir'];
const REGIONS: SeedRegion[] = [
  { country: 'France', region: 'Bordeaux', subRegions: ['Margaux', 'Pauillac', 'Saint-Émilion'] },
  { country: 'France', region: 'Burgundy', subRegions: [] },
  { country: 'United States', region: 'California', subRegions: ['Napa Valley'] },
];

describe('normalizeText', () => {
  it('lowercases and strips accents/punctuation', () => {
    expect(normalizeText('Saint-Émilion')).toBe('saint emilion');
    expect(normalizeText('CHÂTEAU Margaux!')).toBe('chateau margaux');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('merlot', 'merlot')).toBe(0);
  });
  it('counts single substitution as distance 1', () => {
    expect(levenshtein('merlot', 'merlat')).toBe(1);
  });
  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('matchGrapes', () => {
  it('finds an exact single grape mention', () => {
    const result = matchGrapes(['CHÂTEAU MARGAUX', 'MERLOT', '750ml'], GRAPES);
    expect(result).toEqual([{ grape: 'Merlot', percent: null }]);
  });

  it('finds multiple grapes from a blend label', () => {
    const result = matchGrapes(['CABERNET SAUVIGNON 60%', 'MERLOT 40%'], GRAPES);
    const grapeNames = result.map((v) => v.grape).sort();
    expect(grapeNames).toEqual(['Cabernet Sauvignon', 'Merlot']);
  });

  it('extracts blend percentages from the same line', () => {
    const result = matchGrapes(['CABERNET SAUVIGNON 60%', 'MERLOT 40%'], GRAPES);
    const cab = result.find((v) => v.grape === 'Cabernet Sauvignon');
    const merlot = result.find((v) => v.grape === 'Merlot');
    expect(cab?.percent).toBe(60);
    expect(merlot?.percent).toBe(40);
  });

  it('tolerates a single OCR typo via fuzzy matching', () => {
    // "MERL0T" — OCR misreading O as 0.
    const result = matchGrapes(['MERL0T'], GRAPES);
    expect(result).toEqual([{ grape: 'Merlot', percent: null }]);
  });

  it('does not match an unrelated grape name', () => {
    const result = matchGrapes(['CHARDONNAY RESERVE'], GRAPES);
    expect(result).toEqual([]);
  });

  it('prefers the longer/more specific grape over its substring sibling', () => {
    const result = matchGrapes(['PETITE SIRAH'], GRAPES);
    expect(result.map((v) => v.grape)).toEqual(['Petite Sirah']);
  });
});

describe('matchRegion', () => {
  it('matches sub-region with highest specificity', () => {
    const { region, specificity } = matchRegion(['CHÂTEAU MARGAUX', 'MARGAUX', 'FRANCE'], REGIONS);
    expect(region).toEqual({ country: 'France', region: 'Bordeaux', subRegion: 'Margaux' });
    expect(specificity).toBe(3);
  });

  it('falls back to region-level match when no sub-region present', () => {
    const { region, specificity } = matchRegion(['DOMAINE DE LA CÔTE', 'BURGUNDY'], REGIONS);
    expect(region).toEqual({ country: 'France', region: 'Burgundy', subRegion: null });
    expect(specificity).toBe(2);
  });

  it('falls back to country-level match when nothing more specific found', () => {
    const { region, specificity } = matchRegion(['PRODUCE OF FRANCE'], REGIONS);
    expect(region).toEqual({ country: 'France', region: null, subRegion: null });
    expect(specificity).toBe(1);
  });

  it('returns null when nothing matches', () => {
    const { region, specificity } = matchRegion(['MYSTERY WINERY'], REGIONS);
    expect(region).toBeNull();
    expect(specificity).toBe(0);
  });
});

describe('matchAll', () => {
  it('combines grape + region matches into a high-confidence result', () => {
    const lines = ['CHÂTEAU EXAMPLE', 'MARGAUX', 'CABERNET SAUVIGNON 60%', 'MERLOT 40%', 'FRANCE'];
    const result = matchAll(lines, GRAPES, REGIONS);
    expect(result.region).toEqual({ country: 'France', region: 'Bordeaux', subRegion: 'Margaux' });
    expect(result.varieties.map((v) => v.grape).sort()).toEqual(['Cabernet Sauvignon', 'Merlot']);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('returns zero confidence when nothing matches at all', () => {
    const result = matchAll(['UNKNOWN LABEL TEXT'], GRAPES, REGIONS);
    expect(result).toEqual({ varieties: [], region: null, confidence: 0 });
  });
});
