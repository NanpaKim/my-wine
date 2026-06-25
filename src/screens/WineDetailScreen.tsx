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
import { pairingLabel, verdictLabel, verdictTone } from '../ui/verdict';
import { Badge, PrimaryButton, ScreenBackground, StarRating } from '../ui/components';
import { colors, font, radius, shadow, spacing } from '../ui/theme';

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

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}. ${Number(m)}. ${Number(d)}`;
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

  if (!wine) {
    return (
      <ScreenBackground style={styles.center}>
        <Text style={styles.loading}>불러오는 중…</Text>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {wine.labelImageUri ? (
          <Image source={{ uri: wine.labelImageUri }} style={styles.labelImage} resizeMode="cover" />
        ) : null}

        {/* 히어로 */}
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <Text style={styles.name}>{wine.name}</Text>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('EditWine', { wineId })}>
              <Text style={styles.editWine}>수정</Text>
            </Pressable>
          </View>
          {wine.producer ? <Text style={styles.producer}>{wine.producer}</Text> : null}
          <View style={styles.tags}>
            <Badge label={varietiesText(wine)} fg={colors.gold} bg={colors.goldSoft} glyph="❧" />
            <Badge label={regionText(wine)} fg={colors.textMuted} bg={colors.surfaceAlt} glyph="◎" />
            {wine.vintage ? <Badge label={`빈티지 ${wine.vintage}`} fg={colors.textMuted} bg={colors.surfaceAlt} /> : null}
          </View>
        </View>

        {/* 현지 시세 카드 */}
        <View style={styles.priceCard}>
          <Text style={styles.overline}>현지 평균가</Text>
          {wine.referencePrice ? (
            <>
              <Text style={styles.priceValue}>
                {wine.referencePrice.avg.toLocaleString()}
                <Text style={styles.priceCurrency}> {wine.referencePrice.currency}</Text>
              </Text>
              <Text style={styles.priceSource}>출처 · {wine.referencePrice.source}</Text>
            </>
          ) : (
            <Text style={styles.priceMuted}>아직 시세를 조회하지 않았어요</Text>
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
        </View>

        {/* 시음 기록 */}
        <View style={styles.sectionHead}>
          <Text style={styles.section}>시음 기록</Text>
          <Text style={styles.sectionCount}>{tastings.length}</Text>
        </View>

        {tastings.length === 0 ? (
          <Text style={styles.priceMuted}>아직 이 와인의 기록이 없어요.</Text>
        ) : (
          tastings.map((t) => {
            const tone = verdictTone(t.priceVerdict);
            return (
              <View key={t.id} style={styles.tasting}>
                <View style={styles.tTop}>
                  <Text style={styles.tDate}>{formatDate(t.tastedAt)}</Text>
                  <View style={styles.tActions}>
                    <Pressable hitSlop={8} onPress={() => navigation.navigate('AddTasting', { wineId, tastingId: t.id })}>
                      <Text style={styles.tEdit}>수정</Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDeleteTasting(t.id)}>
                      <Text style={styles.tDelete}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.tPriceRow}>
                  <Text style={styles.tPrice}>
                    {t.pricePaid.toLocaleString()} {t.currency}
                    <Text style={styles.tType}>  ·  {t.purchaseType === 'restaurant' ? '식당' : '소매'}</Text>
                  </Text>
                  <Badge label={verdictLabel(t.priceVerdict)} fg={tone.fg} bg={tone.bg} glyph={tone.glyph} />
                </View>
                {t.foodPairing ? (
                  <Text style={styles.tLine}>🍽  {t.foodPairing} · 페어링 {pairingLabel(t.pairingRating)}</Text>
                ) : null}
                {t.tasteRating != null ? (
                  <View style={styles.tRatings}>
                    <Text style={styles.tRatingLabel}>맛</Text>
                    <StarRating value={t.tasteRating} size={14} />
                    <Text style={styles.tRatingLabel}>  가성비</Text>
                    <StarRating value={t.valueRating} size={14} color={colors.cheap} />
                  </View>
                ) : null}
                {t.notes ? <Text style={styles.tNote}>“{t.notes}”</Text> : null}
              </View>
            );
          })
        )}

        <PrimaryButton
          label="＋  이 와인 기록 추가"
          onPress={() => navigation.navigate('AddTasting', { wineId })}
          style={styles.addBtn}
        />
        <Pressable style={styles.deleteWine} onPress={confirmDeleteWine}>
          <Text style={styles.deleteWineText}>이 와인 삭제</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(5), paddingBottom: spacing(12), gap: spacing(4) },
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { ...font.body, color: colors.textMuted },

  labelImage: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surface },

  hero: { gap: spacing(2) },
  heroHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) },
  name: { ...font.display, color: colors.text, flex: 1 },
  editWine: { ...font.caption, color: colors.gold, paddingTop: 6 },
  producer: { ...font.heading, color: colors.gold, marginTop: -2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(1) },

  priceCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing(5),
    gap: 4,
    ...shadow.card,
  },
  overline: { ...font.overline, color: colors.textFaint, textTransform: 'uppercase' },
  priceValue: { ...font.display, color: colors.text, marginTop: 2 },
  priceCurrency: { ...font.heading, color: colors.textMuted },
  priceSource: { ...font.caption, color: colors.textFaint },
  priceMuted: { ...font.body, color: colors.textFaint },
  lookupBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing(3),
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  lookupBtnDisabled: { opacity: 0.5 },
  lookupText: { ...font.caption, color: colors.primaryBright },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) },
  section: { ...font.heading, color: colors.text },
  sectionCount: {
    ...font.caption,
    color: colors.primaryBright,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  tasting: {
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing(4),
    gap: 6,
  },
  tTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tDate: { ...font.caption, color: colors.textFaint },
  tActions: { flexDirection: 'row', gap: spacing(4) },
  tEdit: { ...font.caption, color: colors.gold },
  tDelete: { ...font.caption, color: colors.expensive },
  tPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) },
  tPrice: { ...font.bodyStrong, color: colors.text, flexShrink: 1 },
  tType: { ...font.body, color: colors.textMuted },
  tLine: { ...font.body, color: colors.textMuted },
  tRatings: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tRatingLabel: { ...font.caption, color: colors.textFaint },
  tNote: { ...font.body, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },

  addBtn: { marginTop: spacing(3) },
  deleteWine: { alignItems: 'center', paddingVertical: spacing(3) },
  deleteWineText: { ...font.caption, color: colors.expensive },
});
