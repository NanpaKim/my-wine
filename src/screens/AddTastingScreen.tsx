/**
 * 시음 기록 추가 화면.
 *
 * 가격/구입처/음식/페어링/맛·가성비 평점/날짜를 입력받아 Tasting을 저장한다.
 * 저장 시 와인의 현지 시세(referencePrice.avg)와 judgePrice()로 적정가를 판정해
 * priceVerdict에 함께 기록한다(DESIGN.md §4).
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { getWine, insertTasting, newId, updateWineReferencePrice } from '../db/repo';
import { judgePrice } from '../logic/priceVerdict';
import { lookupPrice, manualReferencePrice } from '../services/priceLookup';
import type { PurchaseType, Rating3, Tasting, Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTasting'>;

const PAIRINGS: { key: Rating3; label: string }[] = [
  { key: 'good', label: '잘 어울림' },
  { key: 'ok', label: '보통' },
  { key: 'bad', label: '별로' },
];

export default function AddTastingScreen({ route, navigation }: Props) {
  const { wineId } = route.params;
  const [wine, setWine] = useState<Wine | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [purchaseType, setPurchaseType] = useState<PurchaseType>('retail');
  const [price, setPrice] = useState('');
  const [food, setFood] = useState('');
  const [pairing, setPairing] = useState<Rating3 | null>(null);
  const [taste, setTaste] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  // 기본 마신 날짜 = 오늘(YYYY-MM-DD). 실제 앱에선 사진 EXIF/날짜 선택기로 대체.
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  // 자동 시세 조회(Wine-Searcher/Vivino)가 아직 비어 있는 와인을 위한 수동 입력.
  const [manualAvg, setManualAvg] = useState('');
  const [currency, setCurrency] = useState('KRW');

  useEffect(() => {
    let active = true;
    getWine(wineId)
      .then(async (w) => {
        if (!active) return;
        setWine(w);
        if (w && !w.referencePrice) {
          setLookingUp(true);
          const found = await lookupPrice({ name: w.name, producer: w.producer, vintage: w.vintage });
          if (!active) return;
          if (found) {
            await updateWineReferencePrice(wineId, found);
            if (active) setWine({ ...w, referencePrice: found });
          }
          setLookingUp(false);
        }
      })
      .catch((e) => console.warn('getWine failed', e));
    return () => { active = false; };
  }, [wineId]);

  async function save() {
    const pricePaid = Number(price);
    if (!Number.isFinite(pricePaid) || pricePaid <= 0) return;

    let referencePrice = wine?.referencePrice ?? null;
    if (!referencePrice && manualAvg.trim()) {
      const avg = Number(manualAvg);
      if (Number.isFinite(avg) && avg > 0) {
        referencePrice = manualReferencePrice(avg, currency.trim() || 'KRW');
        await updateWineReferencePrice(wineId, referencePrice);
      }
    }

    const { verdict } = judgePrice({
      purchaseType,
      pricePaid,
      referenceAvg: referencePrice?.avg ?? null,
    });

    const t: Tasting = {
      id: newId(),
      wineId,
      tastedAt: new Date(`${date}T12:00:00`).toISOString(),
      purchaseType,
      pricePaid,
      currency: referencePrice?.currency ?? (currency.trim() || 'KRW'),
      foodPairing: food.trim() || null,
      pairingRating: pairing,
      tasteRating: taste ? Number(taste) : null,
      valueRating: value ? Number(value) : null,
      priceVerdict: verdict,
      notes: notes.trim() || null,
      createdAt: new Date().toISOString(),
    };
    await insertTasting(t);
    navigation.replace('WineDetail', { wineId });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>구입처</Text>
      <View style={styles.row}>
        {(['retail', 'restaurant'] as PurchaseType[]).map((pt) => (
          <Pressable
            key={pt}
            style={[styles.chip, purchaseType === pt && styles.chipOn]}
            onPress={() => setPurchaseType(pt)}
          >
            <Text style={[styles.chipText, purchaseType === pt && styles.chipTextOn]}>
              {pt === 'retail' ? '소매점' : '식당'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>낸 가격</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="예: 100000" />

      {lookingUp && (
        <View style={styles.referenceBox}>
          <Text style={styles.referenceHint}>현지 시세 자동 조회 중…</Text>
        </View>
      )}

      {wine && !wine.referencePrice && !lookingUp && (
        <View style={styles.referenceBox}>
          <Text style={styles.referenceHint}>
            현지 시세를 자동으로 찾지 못했어요. 알고 있다면 입력하면 적정가 판정에 바로 쓰입니다(모르면 비워두세요).
          </Text>
          <Text style={styles.label}>현지 평균 소매가</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={manualAvg}
              onChangeText={setManualAvg}
              keyboardType="numeric"
              placeholder="예: 45000"
            />
            <TextInput
              style={[styles.input, styles.currencyInput]}
              value={currency}
              onChangeText={setCurrency}
              placeholder="KRW"
              autoCapitalize="characters"
              maxLength={3}
            />
          </View>
        </View>
      )}

      <Text style={styles.label}>마신 날짜</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>함께 먹은 음식</Text>
      <TextInput style={styles.input} value={food} onChangeText={setFood} placeholder="예: 스테이크" />

      <Text style={styles.label}>페어링 평가</Text>
      <View style={styles.row}>
        {PAIRINGS.map((p) => (
          <Pressable key={p.key} style={[styles.chip, pairing === p.key && styles.chipOn]} onPress={() => setPairing(p.key)}>
            <Text style={[styles.chipText, pairing === p.key && styles.chipTextOn]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>맛 평점 (1~5)</Text>
      <TextInput style={styles.input} value={taste} onChangeText={setTaste} keyboardType="numeric" placeholder="예: 4" />

      <Text style={styles.label}>가격 대비 가치 (1~5)</Text>
      <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="numeric" placeholder="예: 3" />

      <Text style={styles.label}>메모</Text>
      <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline placeholder="자유롭게…" />

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>저장</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 8 },
  label: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#3d1422' },
  input: { borderWidth: 1, borderColor: '#d8c8ce', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  currencyInput: { width: 64, textAlign: 'center' },
  referenceBox: { backgroundColor: '#f7eef1', borderRadius: 10, padding: 12, marginTop: 4 },
  referenceHint: { fontSize: 12.5, color: '#7b2d44', marginBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#efe6e9' },
  chipOn: { backgroundColor: '#7b2d44' },
  chipText: { color: '#7b2d44', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  save: { marginTop: 22, backgroundColor: '#7b2d44', paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
