/**
 * my-wine 디자인 시스템 — 컬러/타이포/스페이싱/라운딩/섀도 토큰.
 *
 * 무드: 프리미엄 다크. 깊은 잉크-플럼 배경 위에 따뜻한 크림 텍스트,
 * 클라레(와인) + 골드 액센트. 시세 판정은 의미 기반 컬러로 표현한다.
 * 모든 화면은 하드코딩 색 대신 이 토큰을 참조한다.
 */

export const colors = {
  // 배경 레이어 (어두운 → 밝은 순)
  bg: '#15101a',
  bgElevated: '#1d1722',
  surface: '#241d2b',
  surfaceAlt: '#2c2434',
  border: '#372e40',
  borderSoft: '#2a2331',

  // 브랜드 액센트 — 클라레(와인 레드)
  primary: '#c24a63',
  primaryBright: '#d65c75',
  primaryDim: '#8f3447',
  primarySoft: 'rgba(194,74,99,0.16)',

  // 보조 액센트 — 샴페인 골드
  gold: '#d8b06a',
  goldSoft: 'rgba(216,176,106,0.16)',

  // 텍스트
  text: '#f5efe9',
  textMuted: '#b1a6b0',
  textFaint: '#7d7283',
  onPrimary: '#fff',

  // 시세 판정 (의미 색)
  cheap: '#5fc295',
  cheapSoft: 'rgba(95,194,149,0.16)',
  fair: '#d8b06a',
  fairSoft: 'rgba(216,176,106,0.16)',
  expensive: '#e07a6a',
  expensiveSoft: 'rgba(224,122,106,0.16)',
  unknown: '#8a8089',
  unknownSoft: 'rgba(138,128,137,0.16)',
} as const;

/** 4pt 기반 스페이싱. spacing(4) = 16 */
export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  /** 화면 큰 타이틀 */
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const },
  label: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '600' as const },
  /** 섹션 헤더용 대문자 트래킹 라벨 */
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;
