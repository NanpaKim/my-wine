/** 네비게이션 스택 파라미터 정의. */
export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  /** 와인 상세 — 와인 id를 전달. */
  WineDetail: { wineId: string };
  /** 와인 정보 수정 — 이름/생산자/빈티지/지역/품종. */
  EditWine: { wineId: string };
  /** 시음 기록 추가/수정 — 와인 id 필수. tastingId 가 있으면 그 기록을 수정. */
  AddTasting: { wineId: string; tastingId?: string };
};
