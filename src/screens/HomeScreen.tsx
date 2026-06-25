/**
 * 홈 화면 — 시음 기록 타임라인 + 품종/지역별 와인 목록.
 * 저장된 Tasting을 최신순으로 보여주거나, Wine을 품종/지역별로 묶어 보여준다.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { listAllTastings, listWines } from '../db/repo';
import { groupWinesByRegion, groupWinesByVariety } from '../logic/wineGrouping';
import type { Tasting, Wine } from '../types/wine';
import { verdictLabel } from '../ui/verdict';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Tab = 'timeline' | 'variety' | 'region';

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: '타임라인' },
  { key: 'variety', label: '품종별' },
  { key: 'region', label: '지역별' },
];

function wineSubtitle(wine: Wine): string {
  const variety = wine.varieties.map((v) => v.grape).join(', ') || '품종 미정';
  const region = wine.region.region ? `${wine.region.country} · ${wine.region.region}` : wine.region.country || '지역 미정';
  return `${variety} · ${region}`;
}

export default function HomeScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('timeline');
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);

  // 화면에 들어올 때마다 최신 기록을 다시 읽는다(기록 추가 후 갱신).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listAllTastings()
        .then((rows) => { if (active) setTastings(rows); })
        .catch((e) => console.warn('listAllTastings failed', e));
      listWines()
        .then((rows) => { if (active) setWines(rows); })
        .catch((e) => console.warn('listWines failed', e));
      return () => { active = false; };
    }, []),
  );

  const groups =
    tab === 'variety' ? groupWinesByVariety(wines) : tab === 'region' ? groupWinesByRegion(wines) : [];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabOn]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'timeline' ? (
        tastings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 기록이 없어요.{'\n'}와인 라벨을 찍어 첫 기록을 남겨보세요.</Text>
          </View>
        ) : (
          <FlatList
            data={tastings}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate('WineDetail', { wineId: item.wineId })}
              >
                <Text style={styles.date}>{item.tastedAt.slice(0, 10)}</Text>
                <Text style={styles.price}>
                  {item.pricePaid.toLocaleString()} {item.currency} ·{' '}
                  {item.purchaseType === 'restaurant' ? '식당' : '소매'} · {verdictLabel(item.priceVerdict)}
                </Text>
                {item.foodPairing ? <Text style={styles.food}>🍽 {item.foodPairing}</Text> : null}
              </Pressable>
            )}
          />
        )
      ) : wines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 등록된 와인이 없어요.</Text>
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.list}
          sections={groups.map((g) => ({ title: `${g.label} (${g.wines.length})`, data: g.wines }))}
          keyExtractor={(w, i) => `${w.id}-${i}`}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('WineDetail', { wineId: item.id })}>
              <Text style={styles.wineName}>{item.name}</Text>
              <Text style={styles.food}>{wineSubtitle(item)}</Text>
            </Pressable>
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
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#efe6e9' },
  tabOn: { backgroundColor: '#7b2d44' },
  tabText: { color: '#7b2d44', fontWeight: '600', fontSize: 13 },
  tabTextOn: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center', color: '#666', lineHeight: 22 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#7b2d44', backgroundColor: '#fff', paddingVertical: 6 },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#f5f0f2', gap: 4, marginBottom: 4 },
  wineName: { fontSize: 15, fontWeight: '700', color: '#3d1422' },
  date: { fontSize: 12, color: '#888' },
  price: { fontSize: 15, fontWeight: '600', color: '#5a1f33' },
  food: { fontSize: 13, color: '#555' },
  fab: { position: 'absolute', right: 20, bottom: 28, backgroundColor: '#7b2d44', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28 },
  fabText: { color: '#fff', fontWeight: '700' },
});
