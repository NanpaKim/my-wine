/**
 * SQLite 스키마 정의 및 초기화.
 *
 * wines(1) ── tastings(N) 관계. varieties/region/referencePrice 같은 구조체는
 * 정규화 대신 JSON 문자열 컬럼으로 저장한다(개인용 앱이라 조회 패턴이 단순하고,
 * 품종/지역은 와인 단위로 통째로 읽고 쓰기 때문).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

/** 스키마 버전. 변경 시 마이그레이션 분기점으로 사용. */
export const SCHEMA_VERSION = 1;

const CREATE_WINES = `
CREATE TABLE IF NOT EXISTS wines (
  id              TEXT PRIMARY KEY NOT NULL,
  name            TEXT NOT NULL,
  producer        TEXT,
  vintage         INTEGER,
  varieties_json  TEXT NOT NULL DEFAULT '[]',
  region_json     TEXT NOT NULL DEFAULT '{}',
  label_image_uri TEXT,
  reference_json  TEXT,
  created_at      TEXT NOT NULL
);`;

const CREATE_TASTINGS = `
CREATE TABLE IF NOT EXISTS tastings (
  id             TEXT PRIMARY KEY NOT NULL,
  wine_id        TEXT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  tasted_at      TEXT NOT NULL,
  purchase_type  TEXT NOT NULL,
  price_paid     REAL NOT NULL,
  currency       TEXT NOT NULL,
  food_pairing   TEXT,
  pairing_rating TEXT,
  taste_rating   INTEGER,
  value_rating   INTEGER,
  price_verdict  TEXT NOT NULL,
  notes          TEXT,
  created_at     TEXT NOT NULL
);`;

const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_tastings_wine ON tastings(wine_id);
CREATE INDEX IF NOT EXISTS idx_tastings_date ON tastings(tasted_at);`;

/**
 * 스키마를 생성한다. 앱 시작 시 한 번 호출.
 * 외래 키 제약을 켜고 wines/tastings 테이블과 인덱스를 보장한다.
 */
export async function initSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(CREATE_WINES);
  await db.execAsync(CREATE_TASTINGS);
  await db.execAsync(CREATE_INDEXES);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}
