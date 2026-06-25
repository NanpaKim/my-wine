/**
 * 라벨 촬영 화면.
 *
 * 인식 파이프라인(DESIGN.md §5)의 진입점: 카메라로 라벨을 찍고 → OCR(Google
 * Cloud Vision) → 텍스트 줄을 ReviewScreen으로 넘겨 품종/지역 매칭·보정을
 * 거친다. OCR이 실패해도(키 미설정, 네트워크 오류 등) "직접 입력으로
 * 기록하기" 폴백은 항상 남겨둔다.
 */

import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { insertWine, newId } from '../db/repo';
import { ocrService } from '../services/ocr';
import type { Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // OCR 연동 전/실패 시의 폴백: 빈 와인을 만들고 바로 기록 추가로 넘어간다.
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

  async function captureAndRecognize() {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) throw new Error('사진 캡처에 실패했어요.');
      const { lines } = await ocrService.recognize(photo.base64);
      if (lines.length === 0) {
        Alert.alert('인식 실패', '라벨에서 텍스트를 찾지 못했어요. 다시 찍거나 직접 입력해주세요.');
        return;
      }
      navigation.navigate('Review', { lines });
    } catch (e) {
      console.warn('OCR failed', e);
      Alert.alert('인식 실패', '자동 인식에 실패했어요. 다시 찍거나 직접 입력해주세요.');
    } finally {
      setProcessing(false);
    }
  }

  if (!permission) {
    return <View style={styles.center}><Text>카메라 권한 확인 중…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>라벨을 촬영하려면 카메라 권한이 필요해요.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>카메라 권한 허용</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.secondary]} onPress={createBlankWineAndContinue}>
          <Text style={styles.btnText}>직접 입력으로 기록하기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.controls}>
        <Pressable style={styles.shutter} onPress={captureAndRecognize} disabled={processing}>
          {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.shutterText}>📷</Text>}
        </Pressable>
        <Pressable style={[styles.btn, styles.secondary]} onPress={createBlankWineAndContinue}>
          <Text style={styles.btnText}>직접 입력으로 기록하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: { padding: 20, gap: 14, alignItems: 'center', backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#fff' },
  info: { textAlign: 'center', color: '#555', lineHeight: 22 },
  shutter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7b2d44', alignItems: 'center', justifyContent: 'center' },
  shutterText: { fontSize: 26 },
  btn: { backgroundColor: '#7b2d44', paddingVertical: 13, paddingHorizontal: 22, borderRadius: 24 },
  secondary: { backgroundColor: '#9a6b78' },
  btnText: { color: '#fff', fontWeight: '700' },
});
