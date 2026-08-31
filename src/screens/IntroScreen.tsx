import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Rect, Path, Ellipse, ClipPath, Defs } from 'react-native-svg';
import { colors, fonts } from '../theme/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const MARK_SIZE = 96;
const STREAM_HEIGHT = 60;
const STREAM_GAP = 4;
const STREAM_WIDTH = 60;
const POUR_DURATION = 750;
const SPLASH_DURATION = 260;
const FILL_DURATION = 550;
const SETTLE_DURATION = 350;
const HOLD_DURATION = 350;

// One-time animated intro shown after JS loads (the native splash screen —
// app.json's expo-splash-screen config — is a static image and can't
// animate; this is where the actual "pouring coffee" motion lives). A
// liquid rope — thick at the source, thinning into a falling thread with a
// bulging droplet at its leading tip — stretches down toward the mark, then
// a splash flares on impact and the mark's interior fills as if receiving it.
export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const streamProgress = useRef(new Animated.Value(0)).current;
  const streamOpacity = useRef(new Animated.Value(0)).current;
  const splashScaleX = useRef(new Animated.Value(0.3)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const fillHeight = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.85)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(streamOpacity, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(streamProgress, {
          toValue: 1,
          duration: POUR_DURATION,
          easing: Easing.in(Easing.quad), // accelerates like something falling
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(streamOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(splashOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(splashScaleX, {
              toValue: 1,
              duration: SPLASH_DURATION,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(splashOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
        ]),
        Animated.timing(fillHeight, {
          toValue: 1,
          duration: FILL_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: SETTLE_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_DURATION),
    ]).start(() => onDone());
  }, []);

  // Five keyframes: the rope stretches from a short thick blob at the source
  // down to its full falling length, thinning noticeably along its length
  // and ending in a bulbous droplet tip — the width contrast (thick source,
  // thin rope, fat tip) is what actually reads as liquid rather than a bar.
  const streamPath = streamProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      ropePath(10, -1),
      ropePath(24, -2),
      ropePath(38, 1),
      ropePath(50, -1),
      ropePath(STREAM_HEIGHT, 0),
    ],
  });

  return (
    <View style={styles.container}>
      <View style={styles.markGroup}>
        <Animated.View style={[styles.streamBox, { opacity: streamOpacity }]}>
          <Svg width={STREAM_WIDTH} height={STREAM_HEIGHT} viewBox={`0 0 ${STREAM_WIDTH} ${STREAM_HEIGHT}`}>
            <AnimatedPath d={streamPath as unknown as string} fill={colors.accent} />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.splash,
            {
              opacity: splashOpacity,
              transform: [{ scaleX: splashScaleX }],
            },
          ]}
        >
          <Svg width={44} height={12} viewBox="0 0 44 12">
            <Ellipse cx={22} cy={6} rx={20} ry={4} fill={colors.accent} />
          </Svg>
        </Animated.View>

        <Animated.View
          style={{
            opacity: markOpacity,
            transform: [{ scale: markScale }],
          }}
        >
          <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}>
            <Defs>
              <ClipPath id="markClip">
                <Rect
                  x={0}
                  y={0}
                  width={MARK_SIZE}
                  height={MARK_SIZE}
                  rx={MARK_SIZE * 0.24}
                  ry={MARK_SIZE * 0.24}
                />
              </ClipPath>
            </Defs>

            <Rect
              x={0}
              y={0}
              width={MARK_SIZE}
              height={MARK_SIZE}
              rx={MARK_SIZE * 0.24}
              ry={MARK_SIZE * 0.24}
              fill={colors.surfaceRaised}
              stroke={colors.hairlineStrong}
              strokeWidth={1.5}
            />

            {/* Coffee fill rising from the bottom, clipped to the rounded square,
                with a gently wavy top edge instead of a flat liquid line. */}
            <AnimatedPath
              d={fillHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [wavePath(0), wavePath(MARK_SIZE)],
              })}
              fill={colors.accent}
              clipPath="url(#markClip)"
            />

            <Path
              d={`M${MARK_SIZE * 0.28} ${MARK_SIZE * 0.28} L${MARK_SIZE * 0.72} ${MARK_SIZE * 0.72}`}
              stroke={colors.background}
              strokeWidth={MARK_SIZE * 0.16}
              strokeLinecap="round"
            />
            <Path
              d={`M${MARK_SIZE * 0.72} ${MARK_SIZE * 0.28} L${MARK_SIZE * 0.28} ${MARK_SIZE * 0.72}`}
              stroke={colors.background}
              strokeWidth={MARK_SIZE * 0.16}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]}>
        XtraCup
      </Animated.Text>
    </View>
  );
}

// A falling rope of liquid: a wide rounded top (the pour source — where it
// leaves the spout, always wide), a pinched narrow waist partway down, and
// a bulbous rounded droplet tip at `tipY` (like the leading edge of a
// stream about to break into a drop). Width contrast between the source,
// waist, and tip is deliberately large so this reads as liquid, not a bar.
function ropePath(tipY: number, drift: number): string {
  const cx = STREAM_WIDTH / 2;
  const sourceHalfWidth = 9;
  const waistY = tipY * 0.55;
  const waistHalfWidth = Math.max(2, 4 - tipY * 0.03);
  const tipX = cx + drift;
  const tipHalfWidth = 6;
  const tipTop = Math.max(waistY + 2, tipY - 9);

  return [
    `M${cx - sourceHalfWidth} 0`,
    `C${cx - sourceHalfWidth} 4 ${cx - waistHalfWidth} ${waistY - 6} ${cx - waistHalfWidth} ${waistY}`,
    `C${cx - waistHalfWidth} ${waistY + 6} ${tipX - tipHalfWidth} ${tipTop - 4} ${tipX - tipHalfWidth} ${tipTop}`,
    `C${tipX - tipHalfWidth} ${tipY - 2} ${tipX - tipHalfWidth * 0.5} ${tipY} ${tipX} ${tipY}`,
    `C${tipX + tipHalfWidth * 0.5} ${tipY} ${tipX + tipHalfWidth} ${tipY - 2} ${tipX + tipHalfWidth} ${tipTop}`,
    `C${tipX + tipHalfWidth} ${tipTop - 4} ${cx + waistHalfWidth} ${waistY + 6} ${cx + waistHalfWidth} ${waistY}`,
    `C${cx + waistHalfWidth} ${waistY - 6} ${cx + sourceHalfWidth} 4 ${cx + sourceHalfWidth} 0`,
    'Z',
  ].join(' ');
}

// A rounded-square fill with a soft wavy top edge (three gentle bumps)
// instead of a flat rectangle top, so the "coffee" reads as liquid settling
// rather than a level rising mechanically.
function wavePath(fillHeight: number): string {
  const top = MARK_SIZE - fillHeight;
  const waveAmp = fillHeight > 4 ? 2.5 : 0;
  const w = MARK_SIZE;
  return [
    `M0 ${MARK_SIZE}`,
    `L0 ${top + waveAmp}`,
    `Q${w * 0.17} ${top - waveAmp} ${w * 0.34} ${top}`,
    `Q${w * 0.5} ${top + waveAmp} ${w * 0.67} ${top}`,
    `Q${w * 0.83} ${top - waveAmp} ${w} ${top + waveAmp}`,
    `L${w} ${MARK_SIZE}`,
    'Z',
  ].join(' ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGroup: {
    alignItems: 'center',
  },
  streamBox: {
    height: STREAM_HEIGHT,
    marginBottom: STREAM_GAP,
  },
  splash: {
    position: 'absolute',
    top: STREAM_HEIGHT + STREAM_GAP - 6,
  },
  wordmark: {
    marginTop: 20,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});
