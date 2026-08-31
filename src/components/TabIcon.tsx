import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabIconName =
  | 'pass'
  | 'explore'
  | 'staff'
  | 'profile'
  | 'scan'
  | 'pending'
  | 'today'
  | 'cafe'
  | 'manageCafes';

// A small geometric line-icon set matching the Logo's visual language:
// rounded stroke caps/joins, no fill except where a shape reads better
// solid (checkmarks, dots), single-color (tinted by the caller for
// active/inactive tab state) so it stays legible against the dark theme.
export default function TabIcon({
  name,
  size = 20,
  color,
}: {
  name: TabIconName;
  size?: number;
  color: string;
}) {
  const strokeWidth = size * 0.11;

  switch (name) {
    case 'pass':
      // A ticket/pass card with a torn perforation edge
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V8Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path d="M9 6v12" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 2.4" strokeLinecap="round" />
        </Svg>
      );
    case 'explore':
      // A compass — browsing/discovering cafés
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M15.5 8.5l-2.2 5-5 2.2 2.2-5 5-2.2Z"
            stroke={color}
            strokeWidth={strokeWidth * 0.85}
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
    case 'staff':
      // Two overlapping people
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path
            d="M15.5 6.2a3 3 0 0 1 0 5.6M17 20a5.2 5.2 0 0 0-3.2-4.8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'scan':
      // Corner brackets around a QR-ish dot grid
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Rect x={9.5} y={9.5} width={5} height={5} rx={1} fill={color} />
        </Svg>
      );
    case 'pending':
      // Clock face
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M12 8v4.5l3 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'today':
      // Checkmark inside a rounded square (redemption confirmed)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={3.5} y={3.5} width={17} height={17} rx={5} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M8 12.5l2.5 2.5L16.5 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'cafe':
      // Same coffee cup mark as "buy" but framed by a small storefront roofline
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 9l1-4h14l1 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M5 9v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M9.5 19.5V15a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4.5" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </Svg>
      );
    case 'manageCafes':
      // Grid of storefronts — a roster/collection of cafes
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={3.5} y={4} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={strokeWidth} />
          <Rect x={13} y={4} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={strokeWidth} />
          <Rect x={3.5} y={12.5} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={strokeWidth} />
          <Rect x={13} y={12.5} width={7.5} height={7.5} rx={2} fill={color} />
        </Svg>
      );
  }
}
