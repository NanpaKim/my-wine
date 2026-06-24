/**
 * 홈 화면 — 시음 기록 타임라인.
 * 저장된 Tasting을 최신순으로 보여주고, 라벨 촬영(Capture)으로 진입한다.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/types';
import { listAllTastings } from '../db/repo';
import type { Tasting } from '../types/wine';
import { verdictLabel } from '../ui/verdict';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [tastings, setTastings] = useState<Tasting[]>([]);

  // 화면에 들어올 때마다 최신 기록을 다시 읽는다(기록 추가 후 갱신).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listAllTastings()
        .then((rows) => { if (active) setTastings(rows); })
        .catch((e) => console.warn('listAllTastings failed', e));
      return () => { active = false; };
    }, []),
  );

  return (
    <View style={styles.container}>
      {tastings.length === 0 ? (
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
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Capture')}>
        <Text style={styles.fabText}>＋ 라벨 촬영</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center', color: '#666', lineHeight: 22 },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#f5f0f2', gap: 4 },
  date: { fontSize: 12, color: '#888' },
  price: { fontSize: 15, fontWeight: '600', color: '#5a1f33' },
  food: { fontSize: 13, color: '#555' },
  fab: { position: 'absolute', right: 20, bottom: 28, backgroundColor: '#7b2d44', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28 },
  fabText: { color: '#fff', fontWeight: '700' },
});
