/**
 * 큐레이션된 기준 데이터 시드 (오프라인 베이스라인).
 *
 * fetchWikidataReference.ts가 라이브 SPARQL 조회에 성공하면 이 시드 위에 병합하고,
 * 네트워크가 막히거나 실패하면 이 시드만으로 assets/reference/*.json을 생성한다.
 * 따라서 앱은 어떤 환경에서도 최소한의 품종·지역 사전을 갖는다(DESIGN.md §2).
 */

/** 자주 쓰이는 포도 품종(영문 표준명). */
export const SEED_GRAPES: string[] = [
  // Red
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Grenache', 'Tempranillo',
  'Sangiovese', 'Nebbiolo', 'Malbec', 'Cabernet Franc', 'Zinfandel', 'Mourvèdre',
  'Petit Verdot', 'Carménère', 'Barbera', 'Montepulciano', 'Gamay', 'Touriga Nacional',
  'Pinotage', 'Carignan',
  // White
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Gris', 'Gewürztraminer',
  'Chenin Blanc', 'Viognier', 'Sémillon', 'Albariño', 'Verdejo', 'Grüner Veltliner',
  'Moscato', 'Muscat', 'Vermentino', 'Trebbiano', 'Garganega', 'Marsanne', 'Roussanne',
  'Glera', 'Furmint',
];

/** 국가 › 산지 › 세부 AOC/AVA 계층 시드. */
export interface SeedRegion {
  country: string;
  region: string;
  subRegions: string[];
}

export const SEED_REGIONS: SeedRegion[] = [
  {
    country: 'France', region: 'Bordeaux',
    subRegions: ['Margaux', 'Pauillac', 'Saint-Émilion', 'Pomerol', 'Saint-Julien', 'Pessac-Léognan', 'Sauternes'],
  },
  {
    country: 'France', region: 'Burgundy',
    subRegions: ['Chablis', 'Gevrey-Chambertin', 'Vosne-Romanée', 'Meursault', 'Puligny-Montrachet', 'Pommard'],
  },
  { country: 'France', region: 'Champagne', subRegions: ['Montagne de Reims', 'Côte des Blancs', 'Vallée de la Marne'] },
  { country: 'France', region: 'Rhône', subRegions: ['Châteauneuf-du-Pape', 'Côte-Rôtie', 'Hermitage', 'Gigondas'] },
  { country: 'France', region: 'Loire', subRegions: ['Sancerre', 'Pouilly-Fumé', 'Vouvray', 'Muscadet'] },
  { country: 'France', region: 'Alsace', subRegions: [] },
  {
    country: 'Italy', region: 'Tuscany',
    subRegions: ['Chianti Classico', 'Brunello di Montalcino', 'Bolgheri', 'Vino Nobile di Montepulciano'],
  },
  { country: 'Italy', region: 'Piedmont', subRegions: ['Barolo', 'Barbaresco', 'Barbera d’Alba', 'Gavi'] },
  { country: 'Italy', region: 'Veneto', subRegions: ['Valpolicella', 'Amarone della Valpolicella', 'Soave', 'Prosecco'] },
  {
    country: 'Spain', region: 'Rioja',
    subRegions: ['Rioja Alta', 'Rioja Alavesa', 'Rioja Oriental'],
  },
  { country: 'Spain', region: 'Ribera del Duero', subRegions: [] },
  { country: 'Spain', region: 'Priorat', subRegions: [] },
  { country: 'Portugal', region: 'Douro', subRegions: ['Porto'] },
  {
    country: 'United States', region: 'California',
    subRegions: ['Napa Valley', 'Sonoma County', 'Paso Robles', 'Santa Barbara County'],
  },
  { country: 'United States', region: 'Oregon', subRegions: ['Willamette Valley'] },
  { country: 'United States', region: 'Washington', subRegions: ['Columbia Valley'] },
  { country: 'Argentina', region: 'Mendoza', subRegions: ['Uco Valley', 'Luján de Cuyo'] },
  { country: 'Chile', region: 'Central Valley', subRegions: ['Maipo Valley', 'Colchagua Valley', 'Casablanca Valley'] },
  { country: 'Australia', region: 'South Australia', subRegions: ['Barossa Valley', 'McLaren Vale', 'Coonawarra', 'Clare Valley'] },
  { country: 'Australia', region: 'Victoria', subRegions: ['Yarra Valley'] },
  { country: 'New Zealand', region: 'Marlborough', subRegions: [] },
  { country: 'New Zealand', region: 'Central Otago', subRegions: [] },
  { country: 'Germany', region: 'Mosel', subRegions: [] },
  { country: 'Germany', region: 'Rheingau', subRegions: [] },
  { country: 'South Africa', region: 'Stellenbosch', subRegions: [] },
];
