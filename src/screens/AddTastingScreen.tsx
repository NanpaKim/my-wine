/**
 * 시음 기록 추가 화면.
 *
 * 가격/구입처/음식/페어링/맛·가성비 평점/날짜를 입력받아 Tasting을 저장한다.
 * 저장 시 와인의 현지 시세(referencePrice.avg)와 judgePrice()로 적정가를 판정해
 * priceVerdict에 함께 기록한다(DESIGN.md §4).
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { getTasting, getWine, insertTasting, newId, updateTasting } from '../db/repo';
import { judgePrice } from '../logic/priceVerdict';
import { getFxRate } from '../services/fx';
import { getDeviceCurrency } from '../services/locale';
import type { PurchaseType, Rating3, Tasting, Wine } from '../types/wine';
import { Chip, FieldLabel, Input, PrimaryButton, ScreenBackground, StarRating } from '../ui/components';
import { colors, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTasting'>;

const PAIRINGS: { key: Rating3; label: string }[] = [
  { key: 'good', label: '잘 어울림' },
  { key: 'ok', label: '보통' },
  { key: 'bad', label: '별로' },
];

export default function AddTastingScreen({ route, navigation }: Props) {
  const { wineId, tastingId } = route.params;
  const isEdit = !!tastingId;
  const [wine, setWine] = useState<Wine | null>(null);
  // 수정 모드: 기존 기록의 불변 필드(id·생성시각) 보존용.
  const [editing, setEditing] = useState<Tasting | null>(null);

  const [purchaseType, setPurchaseType] = useState<PurchaseType>('retail');
  const [price, setPrice] = useState('');
  const [food, setFood] = useState('');
  const [pairing, setPairing] = useState<Rating3 | null>(null);
  const [taste, setTaste] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  // 기본 마신 날짜 = 오늘(YYYY-MM-DD). 실제 앱에선 사진 EXIF/날짜 선택기로 대체.
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    getWine(wineId).then(setWine).catch((e) => console.warn('getWine failed', e));
  }, [wineId]);

  // 수정 모드면 기존 기록을 불러와 입력칸을 채운다.
  useEffect(() => {
    if (!tastingId) return;
    getTasting(tastingId)
      .then((t) => {
        if (!t) return;
        setEditing(t);
        setPurchaseType(t.purchaseType);
        setPrice(String(t.pricePaid));
        setFood(t.foodPairing ?? '');
        setPairing(t.pairingRating);
        setTaste(t.tasteRating);
        setValue(t.valueRating);
        setNotes(t.notes ?? '');
        setDate(t.tastedAt.slice(0, 10));
      })
      .catch((e) => console.warn('getTasting failed', e));
  }, [tastingId]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? '기록 수정' : '기록 추가' });
  }, [isEdit, navigation]);

  const priceNum = Number(price);
  const canSave = Number.isFinite(priceNum) && priceNum > 0;

  async function save() {
    if (!canSave) return;

    // 통화는 자동 처리(입력 없음): 결제 통화는 기기 로케일에서, 환율은 무료
    // API 에서 자동 조회. 시세 통화와 결제 통화가 같으면 환산 불필요.
    const paidCurrency = getDeviceCurrency();
    const refCurrency = wine?.referencePrice?.currency ?? null;
    let fxRate: number | null = null;
    if (refCurrency && refCurrency !== paidCurrency) {
      fxRate = await getFxRate(refCurrency, paidCurrency).catch(() => null);
    }
    const { verdict } = judgePrice({
      purchaseType,
      pricePaid: priceNum,
      paidCurrency,
      referenceAvg: wine?.referencePrice?.avg ?? null,
      referenceCurrency: refCurrency,
      fxRate,
    });

    const t: Tasting = {
      id: editing?.id ?? newId(),
      wineId,
      tastedAt: new Date(`${date}T12:00:00`).toISOString(),
      purchaseType,
      pricePaid: priceNum,
      currency: paidCurrency, // 실제 결제 통화(기기 로케일)
      foodPairing: food.trim() || null,
      pairingRating: pairing,
      tasteRating: taste,
      valueRating: value,
      priceVerdict: verdict,
      notes: notes.trim() || null,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    if (isEdit) {
      await updateTasting(t);
    } else {
      await insertTasting(t);
    }
    navigation.replace('WineDetail', { wineId });
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets // 키보드가 입력칸 가리지 않게 자동 인셋(iOS)
      >
        <Field label="구입처">
          <View style={styles.row}>
            {(['retail', 'restaurant'] as PurchaseType[]).map((pt) => (
              <Chip
                key={pt}
                label={pt === 'retail' ? '소매점' : '식당'}
                active={purchaseType === pt}
                onPress={() => setPurchaseType(pt)}
              />
            ))}
          </View>
        </Field>

        <Field label="낸 가격">
          <Input value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="예: 100000" />
        </Field>

        <Field label="마신 날짜">
          <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </Field>

        <Field label="함께 먹은 음식">
          <Input value={food} onChangeText={setFood} placeholder="예: 스테이크" />
        </Field>

        <Field label="페어링 평가">
          <View style={styles.row}>
            {PAIRINGS.map((p) => (
              <Chip key={p.key} label={p.label} active={pairing === p.key} onPress={() => setPairing(p.key)} />
            ))}
          </View>
        </Field>

        <Field label="맛 평점">
          <StarRating value={taste} onSelect={setTaste} />
        </Field>

        <Field label="가격 대비 가치">
          <StarRating value={value} onSelect={setValue} color={colors.cheap} />
        </Field>

        <Field label="메모">
          <Input value={notes} onChangeText={setNotes} multiline placeholder="향, 바디감, 함께한 자리…" />
        </Field>

        <PrimaryButton
          label={isEdit ? '수정 저장' : '기록 저장'}
          onPress={save}
          style={[styles.save, !canSave && styles.saveDisabled]}
        />
      </ScrollView>
    </ScreenBackground>
  );
}

/** 라벨 + 입력을 묶는 폼 필드 래퍼. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(5), paddingBottom: spacing(15), gap: spacing(5) },
  field: { gap: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5) },
  save: { marginTop: spacing(2) },
  saveDisabled: { opacity: 0.45 },
});
