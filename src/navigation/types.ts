/** 네비게이션 스택 파라미터 정의. */
export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  /** 와인 상세 — 와인 id를 전달. */
  WineDetail: { wineId: string };
  /** 시음 기록 추가 — 어떤 와인에 대한 기록인지 id 전달. */
  AddTasting: { wineId: string };
};
