# my-wine

내가 마신 와인을 사진으로 기록하고, 품종·지역별로 정리하며, 내가 낸 가격이 현지
시세 대비 적절했는지까지 판단해주는 **개인용 와인 기록 앱** (React Native / Expo).

전체 설계와 의사결정 근거는 [`DESIGN.md`](./DESIGN.md) 참조.

## 기술 스택 (완전 무료)

- **앱**: React Native (Expo SDK 56) + TypeScript
- **로컬 저장**: expo-sqlite (`wines` 1 ── N `tastings`)
- **라벨 OCR**: on-device ML Kit (인터페이스/스텁 — dev build에서 연동 예정)
- **품종/지역 기준 데이터**: Wikidata SPARQL (`scripts/fetchWikidataReference.ts`)
- **현지 시세**: Wine-Searcher 무료 API → Vivino 폴백 → 수동 입력 (스텁)
- **바코드 보조**: Open Food Facts API (구현)

## 프로젝트 구조

```
src/
  types/wine.ts          데이터 모델 (Wine, Tasting, …)
  db/                    SQLite 스키마 + repository
  logic/priceVerdict.ts  적정가 판단 (순수 함수, 테스트 포함)
  services/              OCR · 시세조회 · Wikidata매칭 · 바코드 (인터페이스+스텁)
  screens/               Home · Capture · WineDetail · AddTasting
  navigation/            스택 네비게이션 타입
scripts/
  fetchWikidataReference.ts  품종·지역 기준 데이터 생성 → assets/reference/
assets/reference/        생성된 기준 데이터 (오프라인 베이스라인 포함)
```

## 개발

```bash
npm install
npm start            # Expo 개발 서버 (카메라/OCR은 dev build 필요)
npm run typecheck    # tsc --noEmit
npm test             # 적정가 판단 로직 유닛 테스트
npm run fetch-reference   # Wikidata에서 품종/지역 기준 데이터 갱신
```

> 카메라·ML Kit OCR 등 네이티브 모듈은 Expo Go가 아닌 dev build에서 동작한다
> (DESIGN.md §5). 현재 스캐폴딩은 화면 전환·DB 저장·적정가 판정까지 동작한다.

## 현황

초기 스캐폴딩 단계. 데이터 모델·DB·적정가 로직·화면 골격·기준 데이터 스크립트가
구현되어 있고, 외부 인식/시세 연동은 인터페이스+스텁으로 분리되어 있다
(DESIGN.md §7 확장 항목).
