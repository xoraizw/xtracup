import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Small stroke icons for chrome controls (back/close buttons sitting inside
// IconButton's circular bubble). Text glyphs like "←"/"×" don't center
// reliably inside a fixed-size container — their visual bounds depend on
// font metrics and vary by platform — so these use explicit SVG paths
// centered on a 24x24 viewBox instead, matching the stroke style used by
// TabIcon.
export function BackArrowIcon({ size = 20, color }: { size?: number; color: string }) {
  const strokeWidth = size * 0.13;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12l6-6M5 12l6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color }: { size?: number; color: string }) {
  const strokeWidth = size * 0.13;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
