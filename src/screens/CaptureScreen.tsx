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
import { useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { insertWine, newId } from '../db/repo';
import { saveLabelPhoto } from '../services/photo';
import { parseGrapes } from '../logic/wineForm';
import type { Wine } from '../types/wine';
import { FieldLabel, Input, PrimaryButton, ScreenBackground } from '../ui/components';
import { colors, font, radius, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // null = 아직 촬영 전(카메라 화면). 그 외 = 사진 URI.
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false); // 촬영 후 확인 단계인가
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [grapes, setGrapes] = useState('');

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
      varieties: parseGrapes(grapes),
      region: { country: country.trim(), region: region.trim() || null, subRegion: null },
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

  // 권한 로딩 화면
  if (!permission) {
    return (
      <ScreenBackground style={styles.center}>
        <Text style={styles.info}>카메라 권한 확인 중…</Text>
      </ScreenBackground>
    );
  }

  // 1) 촬영 후 확인 + 이름 입력 단계
  if (reviewing) {
    return (
      <ScreenBackground>
        <ScrollView
          contentContainerStyle={styles.review}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, styles.noPhoto]}>
              <Text style={styles.noPhotoGlyph}>🍷</Text>
              <Text style={styles.noPhotoText}>사진 없음</Text>
            </View>
          )}

          <Field label="와인 이름">
            <Input value={name} onChangeText={setName} placeholder="예: Château Margaux" />
          </Field>
          <Field label="생산자 (선택)">
            <Input value={producer} onChangeText={setProducer} placeholder="예: Château Margaux" />
          </Field>
          <Field label="빈티지 (선택)">
            <Input value={vintage} onChangeText={setVintage} keyboardType="numeric" placeholder="예: 2015" />
          </Field>
          <Field label="국가 (선택)">
            <Input value={country} onChangeText={setCountry} placeholder="예: 프랑스" />
          </Field>
          <Field label="지역 (선택)">
            <Input value={region} onChangeText={setRegion} placeholder="예: 보르도" />
          </Field>
          <Field label="품종 (선택, 쉼표로 구분)">
            <Input value={grapes} onChangeText={setGrapes} placeholder="예: Merlot, Cabernet Sauvignon" />
          </Field>

          <PrimaryButton
            label={busy ? '저장 중…' : '이 와인 기록 시작'}
            onPress={createAndContinue}
            style={styles.reviewBtn}
          />
          <Pressable style={styles.retake} onPress={() => { setReviewing(false); setPhotoUri(null); }}>
            <Text style={styles.retakeText}>다시 촬영</Text>
          </Pressable>
        </ScrollView>
      </ScreenBackground>
    );
  }

  // 2) 권한 없으면 요청
  if (!permission.granted) {
    return (
      <ScreenBackground style={styles.center}>
        <Text style={styles.infoTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.info}>라벨을 촬영해 와인을 기록하려면{'\n'}카메라 접근을 허용해 주세요.</Text>
        <View style={styles.permActions}>
          <PrimaryButton label="카메라 권한 허용" onPress={requestPermission} />
          <PrimaryButton label="사진 없이 직접 입력" variant="outline" onPress={skipPhoto} />
        </View>
      </ScreenBackground>
    );
  }

  // 3) 카메라 미리보기 + 촬영
  return (
    <View style={styles.cameraFlex}>
      <CameraView ref={cameraRef} style={styles.cameraFlex} facing="back" />
      {/* 라벨 정렬 가이드 프레임 */}
      <View style={styles.guide} pointerEvents="none" />
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

/** 라벨 + 입력 래퍼. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing(6), gap: spacing(3) },
  infoTitle: { ...font.heading, color: colors.text },
  info: { ...font.body, textAlign: 'center', color: colors.textMuted, lineHeight: 22 },
  permActions: { width: '100%', gap: spacing(3), marginTop: spacing(4) },

  // 카메라
  cameraFlex: { flex: 1, backgroundColor: '#000' },
  guide: {
    position: 'absolute',
    top: '18%',
    bottom: '26%',
    left: '12%',
    right: '12%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.lg,
  },
  controls: {
    position: 'absolute', bottom: 44, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  shutter: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  skip: { width: 90, alignItems: 'center' },
  skipText: { ...font.bodyStrong, color: '#fff' },

  // 확인 폼
  review: { padding: spacing(5), paddingBottom: spacing(15), gap: spacing(5) },
  preview: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: spacing(2), borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  noPhotoGlyph: { fontSize: 40, opacity: 0.8 },
  noPhotoText: { ...font.body, color: colors.textFaint },
  field: { gap: 0 },
  reviewBtn: { marginTop: spacing(2) },
  retake: { alignItems: 'center', paddingVertical: spacing(2) },
  retakeText: { ...font.caption, color: colors.gold },
});
