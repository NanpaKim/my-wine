/**
 * my-wine 핵심 데이터 모델.
 * 설계 근거는 DESIGN.md §3 데이터 모델 참조.
 */

/** 포도 품종 + 블렌드 비율. 예: { grape: "Merlot", percent: 40 } */
export interface Variety {
  grape: string;
  /** 블렌드 비율(%). 단일 품종이거나 비율 미상이면 null. */
  percent: number | null;
}

/** 국가 › 산지 › 세부 AOC/AVA 계층. 예: France › Bordeaux › Margaux */
export interface Region {
  country: string;
  /** 대산지. 예: Bordeaux */
  region: string | null;
  /** 세부 AOC/AVA. 예: Margaux */
  subRegion: string | null;
}

/** 시세 조회 출처. DESIGN.md §4 폴백 순서와 대응. */
export type PriceSource = 'wine-searcher' | 'vivino' | 'manual';

/** 조회된 현지 소매 시세(750ml, ex-tax 기준). */
export interface ReferencePrice {
  min: number | null;
  avg: number;
  max: number | null;
  /** ISO 4217 통화 코드. 예: "KRW", "EUR" */
  currency: string;
  source: PriceSource;
  /** 조회 시각(ISO 8601). */
  fetchedAt: string;
}

/** 와인 자체(라벨에서 식별되는 정보). 한 와인에 여러 시음(Tasting)이 달린다. */
export interface Wine {
  id: string;
  name: string;
  producer: string | null;
  /** 빈티지(연도). NV(논빈티지)면 null. */
  vintage: number | null;
  varieties: Variety[];
  region: Region;
  /** 라벨 사진의 로컬 경로(file URI). */
  labelImageUri: string | null;
  /** 마지막으로 조회된 현지 시세. 미조회면 null. */
  referencePrice: ReferencePrice | null;
  createdAt: string;
}

/** 구입처 유형. */
export type PurchaseType = 'restaurant' | 'retail';

/** 페어링/평점에 쓰는 3단계 척도. */
export type Rating3 = 'good' | 'ok' | 'bad';

/**
 * 적정가 자동 판정 결과.
 * - cheap/fair/expensive: 시세 대비 판정
 * - unknown: 시세를 구하지 못해 판단 불가
 */
export type PriceVerdict = 'cheap' | 'fair' | 'expensive' | 'unknown';

/** 한 번의 시음 이벤트(내가 마신 기록). */
export interface Tasting {
  id: string;
  wineId: string;
  /** 마신 날짜(ISO 8601). 사진 EXIF 또는 수동 입력. */
  tastedAt: string;
  purchaseType: PurchaseType;
  /** 내가 실제로 낸 가격. */
  pricePaid: number;
  /** pricePaid의 통화(ISO 4217). */
  currency: string;
  /** 함께 먹은 음식(자유 텍스트). */
  foodPairing: string | null;
  /** 음식과 어울렸는지. */
  pairingRating: Rating3 | null;
  /** 맛 자체 평점(1~5). */
  tasteRating: number | null;
  /** 가격 대비 가치 평점(1~5). 맛 평점과 분리. */
  valueRating: number | null;
  /** 적정가 자동 판정 결과(저장 시점 기준). */
  priceVerdict: PriceVerdict;
  notes: string | null;
  createdAt: string;
}
