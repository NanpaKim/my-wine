/**
 * OCR 인식 결과 확인·보정 화면 (DESIGN.md §5 "사용자 확인·보정 화면").
 *
 * CaptureScreen에서 넘어온 줄 텍스트를 wikidataMatcher로 매칭해 품종/지역을
 * 추정하고, 와인 이름처럼 사전 매칭이 안 되는 자유 텍스트는 사용자가 OCR
 * 줄 중 하나를 탭해 채우거나 직접 입력하게 한다. 저장 시 Wine을 만들어
 * AddTasting으로 넘어간다(현지 시세 자동 조회는 그 화면에서 처리).
 */

import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { insertWine, newId } from '../db/repo';
import { wikidataMatcher } from '../services/wikidata';
import type { Variety, Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

function varietyText(v: Variety): string {
  return v.percent != null ? `${v.grape} ${v.percent}%` : v.grape;
}

export default function ReviewScreen({ route, navigation }: Props) {
  const { lines } = route.params;
  const [matching, setMatching] = useState(true);
  const [confidence, setConfidence] = useState(0);

  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [newGrape, setNewGrape] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [subRegion, setSubRegion] = useState('');

  useEffect(() => {
    wikidataMatcher
      .match(lines)
      .then((result) => {
        setVarieties(result.varieties);
        setConfidence(result.confidence);
        if (result.region) {
          setCountry(result.region.country);
          setRegion(result.region.region ?? '');
          setSubRegion(result.region.subRegion ?? '');
        }
      })
      .catch((e) => console.warn('wikidata match failed', e))
      .finally(() => setMatching(false));
  }, [lines]);

  function removeVariety(grape: string) {
    setVarieties((vs) => vs.filter((v) => v.grape !== grape));
  }

  function addVariety() {
    const grape = newGrape.trim();
    if (!grape || varieties.some((v) => v.grape === grape)) return;
    setVarieties((vs) => [...vs, { grape, percent: null }]);
    setNewGrape('');
  }

  async function save() {
    if (!name.trim()) return;
    const wine: Wine = {
      id: newId(),
      name: name.trim(),
      producer: producer.trim() || null,
      vintage: vintage ? Number(vintage) : null,
      varieties,
      region: { country: country.trim(), region: region.trim() || null, subRegion: subRegion.trim() || null },
      labelImageUri: null,
      referencePrice: null,
      createdAt: new Date().toISOString(),
    };
    await insertWine(wine);
    navigation.replace('AddTasting', { wineId: wine.id });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {matching ? (
        <Text style={styles.hint}>품종·지역 매칭 중…</Text>
      ) : (
        <Text style={confidence >= 0.5 ? styles.hintOk : styles.hintLow}>
          {confidence >= 0.5
            ? '자동 인식 결과예요. 틀린 부분만 고쳐주세요.'
            : '자동 인식이 불확실해요. 꼭 확인해주세요.'}
        </Text>
      )}

      <Text style={styles.label}>와인 이름 *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="라벨에서 골라 입력하세요" />
      {lines.length > 0 && (
        <View style={styles.row}>
          {lines.slice(0, 6).map((line, i) => (
            <Pressable key={i} style={styles.lineChip} onPress={() => setName(line)}>
              <Text style={styles.lineChipText} numberOfLines={1}>{line}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>생산자</Text>
      <TextInput style={styles.input} value={producer} onChangeText={setProducer} placeholder="예: Château Margaux" />

      <Text style={styles.label}>빈티지</Text>
      <TextInput style={styles.input} value={vintage} onChangeText={setVintage} keyboardType="numeric" placeholder="예: 2018" />

      <Text style={styles.label}>품종</Text>
      <View style={styles.row}>
        {varieties.map((v) => (
          <Pressable key={v.grape} style={styles.chip} onPress={() => removeVariety(v.grape)}>
            <Text style={styles.chipText}>{varietyText(v)} ✕</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex1]}
          value={newGrape}
          onChangeText={setNewGrape}
          placeholder="품종 추가"
          onSubmitEditing={addVariety}
        />
        <Pressable style={styles.addBtn} onPress={addVariety}>
          <Text style={styles.btnText}>추가</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>국가</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="예: France" />

      <Text style={styles.label}>산지</Text>
      <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="예: Bordeaux" />

      <Text style={styles.label}>세부 AOC/AVA</Text>
      <TextInput style={styles.input} value={subRegion} onChangeText={setSubRegion} placeholder="예: Margaux" />

      <Pressable style={[styles.save, !name.trim() && styles.saveDisabled]} onPress={save} disabled={!name.trim()}>
        <Text style={styles.saveText}>저장</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 8 },
  hint: { fontSize: 13, color: '#888' },
  hintOk: { fontSize: 13, color: '#2d7b44' },
  hintLow: { fontSize: 13, color: '#b3401f', fontWeight: '600' },
  label: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#3d1422' },
  input: { borderWidth: 1, borderColor: '#d8c8ce', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  flex1: { flex: 1 },
  lineChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#f5f0f2', maxWidth: 160 },
  lineChipText: { color: '#7b2d44', fontSize: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#7b2d44' },
  chipText: { color: '#fff', fontWeight: '600' },
  addBtn: { backgroundColor: '#7b2d44', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  save: { marginTop: 22, backgroundColor: '#7b2d44', paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
