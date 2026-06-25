/**
 * 공용 UI 컴포넌트 — 디자인 토큰(theme.ts) 위에서만 동작한다.
 * Badge / PrimaryButton / Chip / StarRating / ScreenBackground.
 */

import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, shadow, spacing } from './theme';

/** 의미 색을 가진 알약형 뱃지. 시세 판정·태그 표시에 사용. */
export function Badge({
  label,
  fg = colors.textMuted,
  bg = colors.surfaceAlt,
  glyph,
}: {
  label: string;
  fg?: string;
  bg?: string;
  glyph?: string;
}) {
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      {glyph ? <Text style={[badge.glyph, { color: fg }]}>{glyph}</Text> : null}
      <Text style={[badge.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
  glyph: { fontSize: 9 },
  text: { ...font.caption },
});

/** 그라데이션 느낌의 채워진 기본 버튼 + 보조(outline) 변형. */
export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        btn.base,
        outline ? btn.outline : btn.solid,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      <Text style={[btn.text, outline && { color: colors.primaryBright }]}>{label}</Text>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: colors.primary, ...shadow.card, shadowColor: colors.primaryDim },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
  text: { ...font.bodyStrong, color: colors.onPrimary, letterSpacing: 0.2 },
});

/** 선택 가능한 토글 칩(세그먼트/태그 선택용). */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chip.wrap,
        active ? chip.on : chip.off,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[chip.text, active ? chip.textOn : chip.textOff]}>{label}</Text>
    </Pressable>
  );
}

const chip = StyleSheet.create({
  wrap: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1 },
  on: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  off: { backgroundColor: 'transparent', borderColor: colors.border },
  text: { ...font.bodyStrong, letterSpacing: 0.2 },
  textOn: { color: colors.primaryBright },
  textOff: { color: colors.textMuted },
});

/** 1~5 별점 입력/표시. onSelect가 없으면 읽기 전용. */
export function StarRating({
  value,
  onSelect,
  size = 30,
  color = colors.gold,
}: {
  value: number | null;
  onSelect?: (n: number) => void;
  size?: number;
  color?: string;
}) {
  return (
    <View style={star.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (value ?? 0) >= n;
        const glyph = (
          <Text style={{ fontSize: size, color: filled ? color : colors.borderSoft, lineHeight: size * 1.1 }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        return onSelect ? (
          <Pressable key={n} hitSlop={4} onPress={() => onSelect(n)}>
            {glyph}
          </Pressable>
        ) : (
          <View key={n}>{glyph}</View>
        );
      })}
    </View>
  );
}

const star = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});

/** 폼 라벨 — 골드 오버라인 스타일. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={fieldLabel.text}>{children}</Text>;
}

const fieldLabel = StyleSheet.create({
  text: { ...font.overline, color: colors.gold, textTransform: 'uppercase', marginBottom: spacing(2) },
});

/** 다크 테마 텍스트 입력. multiline 시 높이 확장. */
export function Input({ multiline, style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      multiline={multiline}
      style={[input.base, multiline && input.multiline, style]}
      {...props}
    />
  );
}

const input = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing(3.5) },
});

/** 모든 화면을 감싸는 다크 배경 + 상단 은은한 글로우. */
export function ScreenBackground({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[bg.root, style]}>
      <View style={bg.glow} pointerEvents="none" />
      {children}
    </View>
  );
}

const bg = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute',
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: colors.primarySoft,
    opacity: 0.5,
  },
});

export { spacing, colors, font, radius, shadow };
