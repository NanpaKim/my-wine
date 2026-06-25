/**
 * 라벨 OCR 서비스 인터페이스 + 구현.
 *
 * Google Cloud Vision API(TEXT_DETECTION)를 직접 호출한다. 월 1,000건 무료
 * 한도가 매달 갱신되므로(DESIGN.md §2), 월 100건 미만으로 쓰는 이 앱에는
 * 영구적으로 무료다. 네이티브 모듈이 아니라 REST 호출이라 Expo Go에서도
 * 그대로 동작한다(dev build 불필요).
 *
 * API 키는 EXPO_PUBLIC_GOOGLE_VISION_API_KEY 환경변수로 주입한다(.env, 커밋 금지).
 * 키 발급/제한 설정은 README 참조.
 */

export interface OcrResult {
  /** 라벨에서 추출한 전체 텍스트(줄바꿈 포함). */
  rawText: string;
  /** 줄 단위 텍스트. 생산자/품종/지역명 매칭에 사용. */
  lines: string[];
}

export interface OcrService {
  /** 라벨 이미지(base64, data URL 접두사 없이)를 받아 텍스트를 추출한다. */
  recognize(base64Image: string): Promise<OcrResult>;
}

interface VisionAnnotateResponse {
  responses?: {
    textAnnotations?: { description?: string }[];
    error?: { message?: string };
  }[];
}

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

export const ocrService: OcrService = {
  async recognize(base64Image: string): Promise<OcrResult> {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error(
        'EXPO_PUBLIC_GOOGLE_VISION_API_KEY가 설정되지 않았어요. .env에 Google Cloud Vision API 키를 넣어주세요(README 참조).',
      );
    }

    const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      }),
    });

    const json = (await res.json()) as VisionAnnotateResponse;
    const first = json.responses?.[0];
    if (!res.ok || first?.error) {
      throw new Error(first?.error?.message ?? `Vision API HTTP ${res.status}`);
    }

    // textAnnotations[0]은 전체 텍스트 요약, [1.. ]은 단어별 — 줄 단위는 [0]을 분리해서 쓴다.
    const rawText = first?.textAnnotations?.[0]?.description ?? '';
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    return { rawText, lines };
  },
};
