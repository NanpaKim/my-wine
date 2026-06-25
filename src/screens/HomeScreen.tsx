/**
 * 홈 화면 — 저장된 와인 목록을 지역별/품종별로 묶어 보여준다.
 * 상단 토글로 분류 기준 전환. 와인을 누르면 상세, '삭제'로 와인+기록 삭제.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { deleteWine, listWines } from '../db/repo';
import { deleteLabelPhoto } from '../services/photo';
import { groupWines, type GroupMode } from '../logic/grouping';
import type { Wine } from '../types/wine';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function wineSubtitle(w: Wine): string {
  const parts = [w.producer, w.vintage ? String(w.vintage) : null].filter(Boolean);
  return parts.join(' · ');
}

export default function HomeScreen({ navigation }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [mode, setMode] = useState<GroupMode>('region');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listWines()
        .then((rows) => { if (active) setWines(rows); })
        .catch((e) => console.warn('listWines failed', e));
      return () => { active = false; };
    }, []),
  );

  function confirmDelete(w: Wine) {
    Alert.alert('이 와인을 삭제할까요?', '딸린 시음 기록도 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteWine(w.id);
          await deleteLabelPhoto(w.labelImageUri);
          setWines((prev) => prev.filter((x) => x.id !== w.id));
        },
      },
    ]);
  }

  // 품종별 보기에선 같은 와인이 여러 섹션에 들어가므로 섹션별 고유 키로 감싼다.
  const sections = groupWines(wines, mode).map((s) => ({
    title: s.title,
    data: s.data.map((wine) => ({ wine, key: `${s.title}::${wine.id}` })),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        {(['region', 'variety'] as GroupMode[]).map((m) => (
          <Pressable key={m} style={[styles.tab, mode === m && styles.tabOn]} onPress={() => setMode(m)}>
            <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'region' ? '지역별' : '품종별'}</Text>
          </Pressable>
        ))}
      </View>

      {wines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 와인이 없어요.{'\n'}라벨을 찍어 첫 와인을 추가해보세요.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title} ({section.data.length})</Text>
          )}
          renderItem={({ item: { wine } }) => (
            <View style={styles.card}>
              <Pressable style={styles.cardBody} onPress={() => navigation.navigate('WineDetail', { wineId: wine.id })}>
                <Text style={styles.name}>{wine.name}</Text>
                {wineSubtitle(wine) ? <Text style={styles.sub}>{wineSubtitle(wine)}</Text> : null}
              </Pressable>
              <Pressable hitSlop={8} onPress={() => confirmDelete(wine)} style={styles.delBtn}>
                <Text style={styles.delText}>삭제</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Capture')}>
        <Text style={styles.fabText}>＋ 라벨 촬영</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toggle: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 18, backgroundColor: '#efe6e9', alignItems: 'center' },
  tabOn: { backgroundColor: '#7b2d44' },
  tabText: { color: '#7b2d44', fontWeight: '700' },
  tabTextOn: { color: '#fff' },
  list: { padding: 16, paddingTop: 8, gap: 8 },
  sectionHeader: { marginTop: 14, marginBottom: 2, fontSize: 13, fontWeight: '800', color: '#7b2d44' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center', color: '#666', lineHeight: 22 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#f5f0f2' },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#3d1422' },
  sub: { fontSize: 13, color: '#666' },
  delBtn: { paddingLeft: 12, paddingVertical: 4 },
  delText: { color: '#b0457a', fontWeight: '700', fontSize: 13 },
  fab: { position: 'absolute', right: 20, bottom: 28, backgroundColor: '#7b2d44', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28 },
  fabText: { color: '#fff', fontWeight: '700' },
});
