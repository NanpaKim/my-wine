/**
 * 라벨 촬영 화면 (골격).
 *
 * 인식 파이프라인(DESIGN.md §5)의 진입점: 카메라로 라벨을 찍고 → OCR → Wikidata
 * 매칭 → 와인 생성 → 시세 조회 → 보정. OCR/매칭은 아직 스텁이므로, 이 골격은
 * 카메라 권한 흐름과 "수동으로 와인 만들기" 폴백 경로까지만 구현한다.
 */

import { useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { insertWine, newId } from '../db/repo';
import type { Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  // OCR 연동 전까지의 폴백: 빈 와인을 만들고 바로 기록 추가로 넘어간다.
  // (추후 OCR/매칭 결과로 name/varieties/region을 채운 뒤 이 화면에서 보정한다.)
  async function createBlankWineAndContinue() {
    const wine: Wine = {
      id: newId(),
      name: '새 와인',
      producer: null,
      vintage: null,
      varieties: [],
      region: { country: '', region: null, subRegion: null },
      labelImageUri: null,
      referencePrice: null,
      createdAt: new Date().toISOString(),
    };
    await insertWine(wine);
    navigation.replace('AddTasting', { wineId: wine.id });
  }

  if (!permission) {
    return <View style={styles.center}><Text>카메라 권한 확인 중…</Text></View>;
  }

  return (
    <View style={styles.center}>
      {!permission.granted ? (
        <>
          <Text style={styles.info}>라벨을 촬영하려면 카메라 권한이 필요해요.</Text>
          <Pressable style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>카메라 권한 허용</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.info}>카메라 미리보기 + OCR은 dev build에서 연동 예정입니다.{'\n'}(DESIGN.md §5)</Text>
      )}

      <Pressable style={[styles.btn, styles.secondary]} onPress={createBlankWineAndContinue}>
        <Text style={styles.btnText}>직접 입력으로 기록하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#fff' },
  info: { textAlign: 'center', color: '#555', lineHeight: 22 },
  btn: { backgroundColor: '#7b2d44', paddingVertical: 13, paddingHorizontal: 22, borderRadius: 24 },
  secondary: { backgroundColor: '#9a6b78' },
  btnText: { color: '#fff', fontWeight: '700' },
});
