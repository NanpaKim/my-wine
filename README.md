# my-wine

내가 마신 와인을 사진으로 기록하고, 품종·지역별로 정리하며, 내가 낸 가격이 현지
시세 대비 적절했는지까지 판단해주는 **개인용 와인 기록 앱** (React Native / Expo).

전체 설계와 의사결정 근거는 [`DESIGN.md`](./DESIGN.md) 참조.

## 기술 스택 (완전 무료)

- **앱**: React Native (Expo SDK 54) + TypeScript
- **로컬 저장**: expo-sqlite (`wines` 1 ── N `tastings`)
- **라벨 OCR**: Google Cloud Vision API(TEXT_DETECTION) — 월 1,000건 무료 한도가
  매달 갱신되어 월 100건 미만 사용엔 영구 무료. REST 호출이라 Expo Go에서도 동작.
- **품종/지역 매칭**: Wikidata SPARQL 기준 데이터(`scripts/fetchWikidataReference.ts`)
  + 퍼지 매칭(`src/logic/wikidataMatch.ts`)
- **현지 시세**: Wine-Searcher 무료 API(키 발급 전까지 스텁) → Vivino 비공식 검색
  엔드포인트 직접 호출 → 둘 다 실패 시 수동 입력

### Google Cloud Vision API 키 발급 (OCR 사용 전 필수)

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. "Cloud Vision API" 활성화
3. API 키 발급 → 콘솔에서 **iOS 앱 번들 ID로 키 제한**(키 노출 시 악용 방지)
4. 프로젝트 루트에 `.env.example`을 복사해 `.env`로 만들고 키를 채움:
   ```
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=발급받은키
   ```
   `.env`는 `.gitignore`에 등록돼 있어 커밋되지 않는다.

## 프로젝트 구조

```
src/
  types/wine.ts          데이터 모델 (Wine, Tasting, …)
  db/                    SQLite 스키마 + repository
  logic/priceVerdict.ts  적정가 판단 (순수 함수, 테스트 포함)
  services/              OCR(Cloud Vision) · 시세조회(Vivino) · Wikidata매칭 · 바코드(스텁)
  screens/               Home · Capture · Review · WineDetail · AddTasting
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

> `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`가 없으면 라벨 촬영 후 OCR이 실패하지만,
> 화면의 "직접 입력으로 기록하기" 폴백으로 계속 진행할 수 있다.

## 현황

데이터 모델·DB·적정가 로직·OCR→매칭→보정→저장 파이프라인·현지 시세 자동 조회
(Vivino)까지 동작한다. Wine-Searcher 키 연동, 바코드 보조 매칭은 아직 스텁이다
(DESIGN.md §7 확장 항목).
