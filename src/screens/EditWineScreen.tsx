/**
 * 와인 정보 수정 — 이름/생산자/빈티지/국가/지역/품종.
 * 지역·품종을 채우면 홈 목록이 지역별·품종별로 분류된다.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { getWine, updateWine } from '../db/repo';
import { grapesToString, parseGrapes } from '../logic/wineForm';
import type { Wine } from '../types/wine';
import { FieldLabel, Input, PrimaryButton, ScreenBackground } from '../ui/components';
import { spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EditWine'>;

export default function EditWineScreen({ route, navigation }: Props) {
  const { wineId } = route.params;
  const [wine, setWine] = useState<Wine | null>(null);
  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [grapes, setGrapes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWine(wineId)
      .then((w) => {
        if (!w) return;
        setWine(w);
        setName(w.name);
        setProducer(w.producer ?? '');
        setVintage(w.vintage != null ? String(w.vintage) : '');
        setCountry(w.region.country ?? '');
        setRegion(w.region.region ?? '');
        setGrapes(grapesToString(w.varieties));
      })
      .catch((e) => console.warn('getWine failed', e));
  }, [wineId]);

  async function save() {
    if (!wine || busy) return;
    setBusy(true);
    const updated: Wine = {
      ...wine,
      name: name.trim() || '새 와인',
      producer: producer.trim() || null,
      vintage: vintage.trim() ? Number(vintage.trim()) : null,
      region: { country: country.trim(), region: region.trim() || null, subRegion: wine.region.subRegion ?? null },
      varieties: parseGrapes(grapes),
    };
    try {
      await updateWine(updated);
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Field label="와인 이름">
          <Input value={name} onChangeText={setName} placeholder="예: Château Margaux" />
        </Field>
        <Field label="생산자">
          <Input value={producer} onChangeText={setProducer} placeholder="예: Château Margaux" />
        </Field>
        <Field label="빈티지">
          <Input value={vintage} onChangeText={setVintage} keyboardType="numeric" placeholder="예: 2015" />
        </Field>
        <Field label="국가">
          <Input value={country} onChangeText={setCountry} placeholder="예: 프랑스" />
        </Field>
        <Field label="지역 (대산지)">
          <Input value={region} onChangeText={setRegion} placeholder="예: 보르도" />
        </Field>
        <Field label="품종 (쉼표로 구분)">
          <Input value={grapes} onChangeText={setGrapes} placeholder="예: Merlot, Cabernet Sauvignon" />
        </Field>

        <PrimaryButton label={busy ? '저장 중…' : '저장'} onPress={save} style={styles.save} />
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
  save: { marginTop: spacing(2) },
});
