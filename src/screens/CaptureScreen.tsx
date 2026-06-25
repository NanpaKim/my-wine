/**
 * 라벨 촬영 화면.
 *
 * 인식 파이프라인(DESIGN.md §5)의 진입점. 1단계로 카메라 촬영 + 사진 첨부 +
 * 와인 이름 수동 입력까지 구현한다(Expo Go 에서 동작). OCR/Wikidata 자동
 * 매칭은 네이티브 모듈(ML Kit)이 필요해 dev build 단계에서 붙인다.
 *
 * 흐름: 카메라 미리보기 → 촬영(또는 '사진 없이') → 사진+이름 확인 → 와인 생성
 *      → AddTasting.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { insertWine, newId } from '../db/repo';
import { saveLabelPhoto } from '../services/photo';
import type { Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // null = 아직 촬영 전(카메라 화면). 'none' = 사진 없이 진행. 그 외 = 사진 URI.
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false); // 촬영 후 확인 단계인가
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');

  async function takePhoto() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhotoUri(photo?.uri ?? null);
      setReviewing(true);
    } catch {
      setReviewing(true); // 실패해도 이름 입력으로 넘어가 기록은 가능
    } finally {
      setBusy(false);
    }
  }

  function skipPhoto() {
    setPhotoUri(null);
    setReviewing(true);
  }

  async function createAndContinue() {
    if (busy) return;
    setBusy(true);
    const id = newId();
    // 촬영 사진이 있으면 줄여서 영구 폴더에 저장(캐시→보관). 없으면 null.
    const labelImageUri = photoUri ? await saveLabelPhoto(photoUri, id) : null;
    const wine: Wine = {
      id,
      name: name.trim() || '새 와인',
      producer: producer.trim() || null,
      vintage: vintage.trim() ? Number(vintage.trim()) : null,
      varieties: [],
      region: { country: '', region: null, subRegion: null },
      labelImageUri,
      referencePrice: null,
      createdAt: new Date().toISOString(),
    };
    try {
      await insertWine(wine);
      navigation.replace('AddTasting', { wineId: wine.id });
    } finally {
      setBusy(false);
    }
  }

  // 권한 로딩/거부 화면
  if (!permission) {
    return <View style={styles.center}><Text>카메라 권한 확인 중…</Text></View>;
  }

  // 1) 촬영 후 확인 + 이름 입력 단계
  if (reviewing) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.review} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={[styles.preview, styles.noPhoto]}><Text style={styles.noPhotoText}>사진 없음</Text></View>
        )}

        <Text style={styles.label}>와인 이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: Château Margaux" />
        <Text style={styles.label}>생산자 (선택)</Text>
        <TextInput style={styles.input} value={producer} onChangeText={setProducer} placeholder="예: Château Margaux" />
        <Text style={styles.label}>빈티지 (선택)</Text>
        <TextInput style={styles.input} value={vintage} onChangeText={setVintage} keyboardType="numeric" placeholder="예: 2015" />

        <Pressable style={styles.primary} onPress={createAndContinue} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? '저장 중…' : '이 와인 기록 시작'}</Text>
        </Pressable>
        <Pressable style={styles.retake} onPress={() => { setReviewing(false); setPhotoUri(null); }}>
          <Text style={styles.retakeText}>다시 촬영</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // 2) 권한 없으면 요청
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>라벨을 촬영하려면 카메라 권한이 필요해요.</Text>
        <Pressable style={styles.primary} onPress={requestPermission}>
          <Text style={styles.primaryText}>카메라 권한 허용</Text>
        </Pressable>
        <Pressable style={[styles.primary, styles.secondary]} onPress={skipPhoto}>
          <Text style={styles.primaryText}>사진 없이 직접 입력</Text>
        </Pressable>
      </View>
    );
  }

  // 3) 카메라 미리보기 + 촬영
  return (
    <View style={styles.flex}>
      <CameraView ref={cameraRef} style={styles.flex} facing="back" />
      <View style={styles.controls}>
        <Pressable style={styles.skip} onPress={skipPhoto}>
          <Text style={styles.skipText}>사진 없이</Text>
        </Pressable>
        <Pressable style={styles.shutter} onPress={takePhoto} disabled={busy}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#fff' },
  info: { textAlign: 'center', color: '#555', lineHeight: 22 },
  controls: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  shutter: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  skip: { width: 80, alignItems: 'center' },
  skipText: { color: '#fff', fontWeight: '700' },
  review: { padding: 20, gap: 8, backgroundColor: '#fff', paddingBottom: 60 },
  preview: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#eee' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { color: '#999' },
  label: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#3d1422' },
  input: { borderWidth: 1, borderColor: '#d8c8ce', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  primary: { marginTop: 18, backgroundColor: '#7b2d44', paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { backgroundColor: '#9a6b78', marginTop: 12 },
  retake: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  retakeText: { color: '#7b2d44', fontWeight: '700' },
});
