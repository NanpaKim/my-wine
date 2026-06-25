/**
 * 라벨 사진 저장 — 줄여서(리사이즈+압축) 영구 폴더에 보관.
 *
 * 촬영 원본은 캐시(임시)에 저장돼 OS가 비울 수 있다. 라벨은 글자만 보이면
 * 되므로 폭 1000px·JPEG 압축으로 줄여(보통 수백 KB) documentDirectory(영구)
 * 아래 전용 폴더에 옮긴다. 와인 삭제 시 사진 파일도 함께 정리한다.
 * 모두 기기 내부 저장 — 외부 전송 없음.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const DIR = FileSystem.documentDirectory + 'wine-labels/';

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/**
 * 촬영 사진(캐시 URI)을 라벨용으로 줄여 영구 폴더에 저장하고 그 경로를 반환.
 * 실패하면 원본 URI를 그대로 반환(기록은 끊기지 않게).
 */
export async function saveLabelPhoto(srcUri: string, id: string): Promise<string> {
  try {
    const resized = await ImageManipulator.manipulateAsync(
      srcUri,
      [{ resize: { width: 1000 } }], // 라벨 가독 충분 + 용량 급감
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );
    await ensureDir();
    const dest = `${DIR}${id}.jpg`;
    await FileSystem.moveAsync({ from: resized.uri, to: dest });
    return dest;
  } catch {
    return srcUri; // 실패 시 원본 캐시 URI 유지
  }
}

/** 와인 삭제 시 우리가 만든 라벨 사진 파일을 정리(영구 폴더 안의 것만). */
export async function deleteLabelPhoto(uri: string | null): Promise<void> {
  if (!uri || !uri.startsWith(DIR)) return; // 우리 폴더 파일만 건드림
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // 정리 실패는 무시(다음에 지워지거나 남아도 큰 문제 아님)
  }
}
