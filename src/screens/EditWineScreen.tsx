/**
 * 와인 정보 수정 — 이름/생산자/빈티지/국가/지역/품종.
 * 지역·품종을 채우면 홈 목록이 지역별·품종별로 분류된다.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { getWine, updateWine } from '../db/repo';
import { grapesToString, parseGrapes } from '../logic/wineForm';
import type { Wine } from '../types/wine';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={styles.label}>와인 이름</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: Château Margaux" />
      <Text style={styles.label}>생산자</Text>
      <TextInput style={styles.input} value={producer} onChangeText={setProducer} placeholder="예: Château Margaux" />
      <Text style={styles.label}>빈티지</Text>
      <TextInput style={styles.input} value={vintage} onChangeText={setVintage} keyboardType="numeric" placeholder="예: 2015" />
      <Text style={styles.label}>국가</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="예: 프랑스" />
      <Text style={styles.label}>지역 (대산지)</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="예: 보르도" />
      <Text style={styles.label}>품종 (쉼표로 구분)</Text>
      <TextInput style={styles.input} value={grapes} onChangeText={setGrapes} placeholder="예: Merlot, Cabernet Sauvignon" />

      <Pressable style={styles.save} onPress={save} disabled={busy}>
        <Text style={styles.saveText}>{busy ? '저장 중…' : '저장'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 8, paddingBottom: 60 },
  label: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#3d1422' },
  input: { borderWidth: 1, borderColor: '#d8c8ce', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  save: { marginTop: 22, backgroundColor: '#7b2d44', paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
