/**
 * 라벨 OCR 서비스 인터페이스 + 스텁.
 *
 * 실제 구현은 on-device ML Kit Text Recognition으로 교체한다(DESIGN.md §2, §5).
 * 네이티브 모듈이라 Expo dev build에서만 동작하므로, 지금은 인터페이스만 고정해
 * 둔다. 상위 코드는 이 인터페이스에만 의존한다.
 */

export interface OcrResult {
  /** 라벨에서 추출한 전체 텍스트(줄바꿈 포함). */
  rawText: string;
  /** 줄 단위 텍스트. 생산자/품종/지역명 매칭에 사용. */
  lines: string[];
}

export interface OcrService {
  /** 라벨 이미지(file URI)를 받아 텍스트를 추출한다. */
  recognize(imageUri: string): Promise<OcrResult>;
}

/** 미구현 스텁. dev build에서 ML Kit 구현으로 교체 예정. */
export const ocrService: OcrService = {
  async recognize(_imageUri: string): Promise<OcrResult> {
    throw new Error(
      'OCR not implemented yet — requires ML Kit native module (Expo dev build). See DESIGN.md §5.',
    );
  },
};
