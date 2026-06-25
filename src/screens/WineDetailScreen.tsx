/**
 * 와인 상세 화면 — 와인 메타(품종/지역/시세)와 그 와인의 모든 시음 기록.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { deleteTasting, deleteWine, getWine, listTastingsForWine, updateWineReferencePrice } from '../db/repo';
import { lookupPrice } from '../services/priceLookup';
import { getDeviceCurrency } from '../services/locale';
import { deleteLabelPhoto } from '../services/photo';
import type { Tasting, Wine } from '../types/wine';
import { pairingLabel, verdictLabel } from '../ui/verdict';

type Props = NativeStackScreenProps<RootStackParamList, 'WineDetail'>;

function regionText(w: Wine): string {
  const parts = [w.region.country, w.region.region, w.region.subRegion].filter(Boolean);
  return parts.length ? parts.join(' › ') : '지역 미상';
}

function varietiesText(w: Wine): string {
  if (w.varieties.length === 0) return '품종 미상';
  return w.varieties
    .map((v) => (v.percent != null ? `${v.grape} ${v.percent}%` : v.grape))
    .join(', ');
}

export default function WineDetailScreen({ route, navigation }: Props) {
  const { wineId } = route.params;
  const [wine, setWine] = useState<Wine | null>(null);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [looking, setLooking] = useState(false);

  async function lookupPriceNow() {
    if (!wine || looking) return;
    setLooking(true);
    try {
      const ref = await lookupPrice({
        name: wine.name,
        producer: wine.producer,
        vintage: wine.vintage,
        preferredCurrency: getDeviceCurrency(),
      });
      if (ref) {
        await updateWineReferencePrice(wine.id, ref);
        setWine({ ...wine, referencePrice: ref });
      } else {
        Alert.alert('시세를 못 찾았어요', '직접 가격을 기록하면 적정가는 그 값으로 판단해요.');
      }
    } catch {
      Alert.alert('시세 조회 실패', '잠시 후 다시 시도해 주세요.');
    } finally {
      setLooking(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getWine(wineId), listTastingsForWine(wineId)])
        .then(([w, ts]) => { if (active) { setWine(w); setTastings(ts); } })
        .catch((e) => console.warn('load wine detail failed', e));
      return () => { active = false; };
    }, [wineId]),
  );

  function confirmDeleteWine() {
    if (!wine) return;
    Alert.alert('이 와인을 삭제할까요?', '딸린 시음 기록도 함께 삭제됩니다. 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteWine(wine.id);
          await deleteLabelPhoto(wine.labelImageUri); // 라벨 사진 파일도 정리
          navigation.goBack();
        },
      },
    ]);
  }

  function confirmDeleteTasting(id: string) {
    Alert.alert('이 기록을 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteTasting(id);
          setTastings((prev) => prev.filter((t) => t.id !== id));
        },
      },
    ]);
  }

  if (!wine) return <View style={styles.center}><Text>불러오는 중…</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {wine.labelImageUri ? (
        <Image source={{ uri: wine.labelImageUri }} style={styles.label_image} resizeMode="cover" />
      ) : null}
      <Text style={styles.name}>{wine.name}</Text>
      {wine.producer ? <Text style={styles.sub}>{wine.producer}</Text> : null}
      <Text style={styles.meta}>{varietiesText(wine)}</Text>
      <Text style={styles.meta}>{regionText(wine)}</Text>
      {wine.vintage ? <Text style={styles.meta}>빈티지 {wine.vintage}</Text> : null}
      {wine.referencePrice ? (
        <Text style={styles.meta}>
          현지 평균가 {wine.referencePrice.avg.toLocaleString()} {wine.referencePrice.currency}{' '}
          ({wine.referencePrice.source})
        </Text>
      ) : (
        <Text style={styles.metaMuted}>현지 시세 미조회</Text>
      )}
      <Pressable
        style={[styles.lookupBtn, looking && styles.lookupBtnDisabled]}
        onPress={lookupPriceNow}
        disabled={looking}
      >
        <Text style={styles.lookupText}>
          {looking ? '조회 중…' : wine.referencePrice ? '시세 다시 조회' : '현지 시세 조회'}
        </Text>
      </Pressable>

      <Text style={styles.section}>시음 기록 ({tastings.length})</Text>
      {tastings.map((t) => (
        <View key={t.id} style={styles.tasting}>
          <View style={styles.tHeader}>
            <Text style={styles.tDate}>{t.tastedAt.slice(0, 10)}</Text>
            <View style={styles.tActions}>
              <Pressable hitSlop={8} onPress={() => navigation.navigate('AddTasting', { wineId, tastingId: t.id })}>
                <Text style={styles.tEdit}>수정</Text>
              </Pressable>
              <Pressable hitSlop={8} onPress={() => confirmDeleteTasting(t.id)}>
                <Text style={styles.tDelete}>삭제</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.tLine}>
            {t.pricePaid.toLocaleString()} {t.currency} ·{' '}
            {t.purchaseType === 'restaurant' ? '식당' : '소매'} · {verdictLabel(t.priceVerdict)}
          </Text>
          {t.foodPairing ? <Text style={styles.tLine}>🍽 {t.foodPairing} · 페어링 {pairingLabel(t.pairingRating)}</Text> : null}
          {t.tasteRating != null ? <Text style={styles.tLine}>맛 {t.tasteRating}/5 · 가성비 {t.valueRating ?? '-'}/5</Text> : null}
          {t.notes ? <Text style={styles.tNote}>{t.notes}</Text> : null}
        </View>
      ))}

      <Pressable style={styles.btn} onPress={() => navigation.navigate('AddTasting', { wineId })}>
        <Text style={styles.btnText}>＋ 이 와인 기록 추가</Text>
      </Pressable>
      <Pressable style={styles.deleteWine} onPress={confirmDeleteWine}>
        <Text style={styles.deleteWineText}>이 와인 삭제</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label_image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10, backgroundColor: '#eee' },
  name: { fontSize: 22, fontWeight: '800', color: '#3d1422' },
  sub: { fontSize: 15, color: '#7b2d44' },
  meta: { fontSize: 14, color: '#444' },
  metaMuted: { fontSize: 14, color: '#aaa' },
  lookupBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#efe3e8', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16 },
  lookupBtnDisabled: { opacity: 0.5 },
  lookupText: { color: '#7b2d44', fontWeight: '700', fontSize: 13 },
  section: { marginTop: 18, fontSize: 16, fontWeight: '700', color: '#3d1422' },
  tasting: { marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: '#f5f0f2', gap: 3 },
  tHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tActions: { flexDirection: 'row', gap: 14 },
  tEdit: { fontSize: 12, color: '#7b2d44', fontWeight: '700' },
  tDelete: { fontSize: 12, color: '#b0457a', fontWeight: '700' },
  tDate: { fontSize: 12, color: '#888' },
  tLine: { fontSize: 14, color: '#333' },
  tNote: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  btn: { marginTop: 22, backgroundColor: '#7b2d44', paddingVertical: 13, borderRadius: 24, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  deleteWine: { marginTop: 12, marginBottom: 30, paddingVertical: 12, alignItems: 'center' },
  deleteWineText: { color: '#b0457a', fontWeight: '700' },
});
