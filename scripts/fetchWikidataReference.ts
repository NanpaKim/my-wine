/**
 * Wikidata SPARQL에서 품종/지역 기준 데이터를 받아 assets/reference/*.json 생성.
 *
 *   실행: npm run fetch-reference   (ts-node scripts/fetchWikidataReference.ts)
 *
 * query.wikidata.org는 키가 필요 없는 공개 엔드포인트다(DESIGN.md §2). 다만 일부
 * 네트워크/프록시 환경에서는 막힐 수 있으므로, 라이브 조회에 실패하면 큐레이션된
 * 시드(seedReference.ts)로 폴백해 항상 JSON을 생성한다. 따라서 네트워크가 되는
 * 머신에서 실행하면 최신 Wikidata로 갱신되고, 막힌 환경에서도 베이스라인이 남는다.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SEED_GRAPES, SEED_REGIONS } from './seedReference';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'my-wine/0.1 (https://github.com/NanpaKim/my-wine)';
const OUT_DIR = join(__dirname, '..', 'assets', 'reference');

/** 와인 양조용 포도 품종(grape variety, wd:Q5777267)의 영문 라벨. */
const GRAPES_QUERY = `
SELECT DISTINCT ?label WHERE {
  ?v wdt:P31 wd:Q5777267 .
  ?v rdfs:label ?label .
  FILTER(lang(?label) = "en")
} ORDER BY ?label`;

/** 와인 산지(wine region, wd:Q1410733)와 소속 국가. */
const REGIONS_QUERY = `
SELECT DISTINCT ?regionLabel ?countryLabel WHERE {
  ?r wdt:P31 wd:Q1410733 .
  OPTIONAL { ?r wdt:P17 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?countryLabel ?regionLabel`;

interface SparqlBinding {
  [key: string]: { value: string } | undefined;
}

async function runSparql(query: string): Promise<SparqlBinding[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
  const data = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
  return data.results?.bindings ?? [];
}

async function fetchGrapes(): Promise<string[]> {
  const rows = await runSparql(GRAPES_QUERY);
  const set = new Set(SEED_GRAPES);
  for (const b of rows) {
    const label = b.label?.value?.trim();
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

async function fetchRegions(): Promise<typeof SEED_REGIONS> {
  const rows = await runSparql(REGIONS_QUERY);
  // 시드의 (country, region) → subRegions 맵으로 시작.
  const map = new Map<string, { country: string; region: string; subRegions: Set<string> }>();
  for (const s of SEED_REGIONS) {
    map.set(`${s.country}|${s.region}`, { country: s.country, region: s.region, subRegions: new Set(s.subRegions) });
  }
  for (const b of rows) {
    const region = b.regionLabel?.value?.trim();
    const country = b.countryLabel?.value?.trim() || 'Unknown';
    if (!region) continue;
    const key = `${country}|${region}`;
    if (!map.has(key)) map.set(key, { country, region, subRegions: new Set() });
  }
  return [...map.values()]
    .map((r) => ({ country: r.country, region: r.region, subRegions: [...r.subRegions] }))
    .sort((a, b) => a.country.localeCompare(b.country) || a.region.localeCompare(b.region));
}

async function main(): Promise<void> {
  let grapes: string[];
  let regions: typeof SEED_REGIONS;
  let live = false;

  try {
    console.log('Fetching grape varieties + wine regions from Wikidata…');
    [grapes, regions] = await Promise.all([fetchGrapes(), fetchRegions()]);
    live = true;
    console.log(`Live fetch OK: ${grapes.length} grapes, ${regions.length} regions.`);
  } catch (err) {
    console.warn(`Live Wikidata fetch failed (${(err as Error).message}). Falling back to bundled seed.`);
    grapes = [...SEED_GRAPES].sort((a, b) => a.localeCompare(b));
    regions = SEED_REGIONS;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const meta = { generatedAt: new Date().toISOString(), source: live ? 'wikidata+seed' : 'seed', counts: { grapes: grapes.length, regions: regions.length } };
  await writeFile(join(OUT_DIR, 'grapes.json'), JSON.stringify({ ...meta, grapes }, null, 2) + '\n');
  await writeFile(join(OUT_DIR, 'regions.json'), JSON.stringify({ ...meta, regions }, null, 2) + '\n');
  console.log(`Wrote ${grapes.length} grapes and ${regions.length} regions to assets/reference/ (source: ${meta.source}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
