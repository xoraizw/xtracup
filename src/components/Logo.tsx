import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import { colors, radii } from '../theme/theme';

// The XtraCup mark: a caramel rounded square with a cream "X" built from two
// crossing rounded strokes (not a literal letterform) — per the playbook's
// brand direction, used as a small recurring corner mark, scalable from a
// 24px header icon up to a large splash/intro treatment.
export default function Logo({ size = 40 }: { size?: number }) {
  const cornerRadius = size * 0.24;
  const strokeWidth = size * 0.16;
  const inset = size * 0.28;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect
        x={0}
        y={0}
        width={size}
        height={size}
        rx={cornerRadius}
        ry={cornerRadius}
        fill={colors.accent}
      />
      <Path
        d={`M${inset} ${inset} L${size - inset} ${size - inset}`}
        stroke={colors.background}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d={`M${size - inset} ${inset} L${inset} ${size - inset}`}
        stroke={colors.background}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
