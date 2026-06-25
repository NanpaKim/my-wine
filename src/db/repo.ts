/**
 * 데이터 접근 계층(Repository). expo-sqlite 비동기 API 위에 wines/tastings
 * CRUD 헬퍼를 제공한다. 화면/서비스는 이 모듈만 사용하고 SQL을 직접 다루지 않는다.
 */

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Tasting, Wine } from '../types/wine';
import { initSchema } from './schema';

const DB_NAME = 'my-wine.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

/** DB 연결을 열고 스키마를 보장한다(싱글턴). */
export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

/** 충돌 가능성이 낮은 로컬 ID 생성(개인용 단일 기기 기준). */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- 행(row) ↔ 도메인 객체 매핑 -------------------------------------------

interface WineRow {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  varieties_json: string;
  region_json: string;
  label_image_uri: string | null;
  reference_json: string | null;
  created_at: string;
}

function rowToWine(r: WineRow): Wine {
  return {
    id: r.id,
    name: r.name,
    producer: r.producer,
    vintage: r.vintage,
    varieties: JSON.parse(r.varieties_json),
    region: JSON.parse(r.region_json),
    labelImageUri: r.label_image_uri,
    referencePrice: r.reference_json ? JSON.parse(r.reference_json) : null,
    createdAt: r.created_at,
  };
}

interface TastingRow {
  id: string;
  wine_id: string;
  tasted_at: string;
  purchase_type: Tasting['purchaseType'];
  price_paid: number;
  currency: string;
  food_pairing: string | null;
  pairing_rating: Tasting['pairingRating'];
  taste_rating: number | null;
  value_rating: number | null;
  price_verdict: Tasting['priceVerdict'];
  notes: string | null;
  created_at: string;
}

function rowToTasting(r: TastingRow): Tasting {
  return {
    id: r.id,
    wineId: r.wine_id,
    tastedAt: r.tasted_at,
    purchaseType: r.purchase_type,
    pricePaid: r.price_paid,
    currency: r.currency,
    foodPairing: r.food_pairing,
    pairingRating: r.pairing_rating,
    tasteRating: r.taste_rating,
    valueRating: r.value_rating,
    priceVerdict: r.price_verdict,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

// --- Wine CRUD -------------------------------------------------------------

export async function insertWine(wine: Wine): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO wines
       (id, name, producer, vintage, varieties_json, region_json, label_image_uri, reference_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    wine.id,
    wine.name,
    wine.producer,
    wine.vintage,
    JSON.stringify(wine.varieties),
    JSON.stringify(wine.region),
    wine.labelImageUri,
    wine.referencePrice ? JSON.stringify(wine.referencePrice) : null,
    wine.createdAt,
  );
}

export async function getWine(id: string): Promise<Wine | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WineRow>('SELECT * FROM wines WHERE id = ?', id);
  return row ? rowToWine(row) : null;
}

/** 와인의 현지 시세를 갱신한다(자동 조회 성공 또는 사용자 수동 입력 시 사용). */
export async function updateWineReferencePrice(
  wineId: string,
  referencePrice: Wine['referencePrice'],
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE wines SET reference_json = ? WHERE id = ?',
    referencePrice ? JSON.stringify(referencePrice) : null,
    wineId,
  );
}

export async function listWines(): Promise<Wine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WineRow>('SELECT * FROM wines ORDER BY created_at DESC');
  return rows.map(rowToWine);
}

// --- Tasting CRUD ----------------------------------------------------------

export async function insertTasting(t: Tasting): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tastings
       (id, wine_id, tasted_at, purchase_type, price_paid, currency, food_pairing,
        pairing_rating, taste_rating, value_rating, price_verdict, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    t.id,
    t.wineId,
    t.tastedAt,
    t.purchaseType,
    t.pricePaid,
    t.currency,
    t.foodPairing,
    t.pairingRating,
    t.tasteRating,
    t.valueRating,
    t.priceVerdict,
    t.notes,
    t.createdAt,
  );
}

/** 한 와인의 모든 시음 기록(최신순). */
export async function listTastingsForWine(wineId: string): Promise<Tasting[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TastingRow>(
    'SELECT * FROM tastings WHERE wine_id = ? ORDER BY tasted_at DESC',
    wineId,
  );
  return rows.map(rowToTasting);
}

/** 전체 시음 기록(최신순) — 홈 화면 타임라인용. */
export async function listAllTastings(): Promise<Tasting[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TastingRow>('SELECT * FROM tastings ORDER BY tasted_at DESC');
  return rows.map(rowToTasting);
}
