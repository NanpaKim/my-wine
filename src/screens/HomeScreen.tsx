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
import { groupWines, type GroupMode, type SortMode } from '../logic/grouping';
import type { Wine } from '../types/wine';
import { PrimaryButton, ScreenBackground } from '../ui/components';
import { colors, font, radius, shadow, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function wineSubtitle(w: Wine): string {
  const parts = [w.producer, w.vintage ? String(w.vintage) : null].filter(Boolean);
  return parts.join(' · ');
}

export default function HomeScreen({ navigation }: Props) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [mode, setMode] = useState<GroupMode>('region');
  const [sort, setSort] = useState<SortMode>('name');

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
  const sections = groupWines(wines, mode, sort).map((s) => ({
    title: s.title,
    data: s.data.map((wine) => ({ wine, key: `${s.title}::${wine.id}` })),
  }));

  return (
    <ScreenBackground>
      {/* 분류/정렬 컨트롤 */}
      <View style={styles.controls}>
        <View style={styles.segment}>
          {(['region', 'variety'] as GroupMode[]).map((m) => (
            <Pressable key={m} style={[styles.tab, mode === m && styles.tabOn]} onPress={() => setMode(m)}>
              <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'region' ? '지역별' : '품종별'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sortRow}>
          {(['name', 'recent'] as SortMode[]).map((s) => (
            <Pressable key={s} style={[styles.sortChip, sort === s && styles.sortChipOn]} onPress={() => setSort(s)}>
              <Text style={[styles.sortText, sort === s && styles.sortTextOn]}>{s === 'name' ? '가나다순' : '최신순'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {wines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyGlyph}>🍷</Text>
          <Text style={styles.emptyTitle}>아직 와인이 없어요</Text>
          <Text style={styles.emptyText}>라벨을 찍어 첫 와인을 추가해보세요.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item: { wine } }) => (
            <View style={styles.card}>
              <View style={styles.accent} />
              <Pressable style={styles.cardBody} onPress={() => navigation.navigate('WineDetail', { wineId: wine.id })}>
                <Text style={styles.name} numberOfLines={1}>{wine.name}</Text>
                {wineSubtitle(wine) ? <Text style={styles.sub} numberOfLines={1}>{wineSubtitle(wine)}</Text> : null}
              </Pressable>
              <Pressable hitSlop={8} onPress={() => confirmDelete(wine)} style={styles.delBtn}>
                <Text style={styles.delText}>삭제</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <View style={styles.fabWrap}>
        <PrimaryButton label="＋  라벨 촬영" onPress={() => navigation.navigate('Capture')} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing(5), paddingTop: spacing(3), gap: spacing(3) },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.primary },
  tabText: { ...font.bodyStrong, color: colors.textMuted },
  tabTextOn: { color: colors.onPrimary },
  sortRow: { flexDirection: 'row', gap: spacing(2) },
  sortChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  sortChipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  sortText: { ...font.caption, color: colors.textFaint },
  sortTextOn: { color: colors.gold },

  list: { padding: spacing(5), paddingTop: spacing(4), paddingBottom: spacing(28) },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(8), gap: spacing(2) },
  emptyGlyph: { fontSize: 52, marginBottom: spacing(1) },
  emptyTitle: { ...font.heading, color: colors.text },
  emptyText: { ...font.body, textAlign: 'center', color: colors.textMuted, lineHeight: 22 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(4), marginBottom: spacing(2) },
  sectionTitle: { ...font.overline, color: colors.gold, textTransform: 'uppercase' },
  sectionCount: {
    ...font.caption,
    color: colors.textFaint,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    marginBottom: spacing(2.5),
    ...shadow.card,
  },
  accent: { width: 4, alignSelf: 'stretch', backgroundColor: colors.primaryDim },
  cardBody: { flex: 1, paddingVertical: spacing(4), paddingHorizontal: spacing(4), gap: 4 },
  name: { ...font.bodyStrong, fontSize: 16, color: colors.text },
  sub: { ...font.body, color: colors.textMuted },
  delBtn: { paddingHorizontal: spacing(4), paddingVertical: spacing(4) },
  delText: { ...font.caption, color: colors.expensive },

  fabWrap: { position: 'absolute', left: spacing(5), right: spacing(5), bottom: spacing(7) },
});
