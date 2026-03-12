import React from "react";
import Svg, { Circle, Ellipse, Path, Rect, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

export function IllustrationScan({ size = 220 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      {/* Outer aura rings */}
      <Circle cx="110" cy="110" r="100" fill={Colors.accentLight} opacity="0.25" />
      <Circle cx="110" cy="110" r="80" fill={Colors.accentLight} opacity="0.35" />
      <Circle cx="110" cy="110" r="60" fill={Colors.accentLight} opacity="0.45" />

      {/* Phone body */}
      <Rect x="78" y="50" width="64" height="120" rx="12" fill={Colors.surface} />
      <Rect x="82" y="54" width="56" height="112" rx="9" fill={Colors.backgroundSecondary} />

      {/* Screen content — ingredient check lines */}
      <Rect x="90" y="75" width="40" height="4" rx="2" fill={Colors.accentLight} />
      <Rect x="90" y="85" width="30" height="3" rx="1.5" fill={Colors.borderLight} />
      <Rect x="90" y="93" width="35" height="3" rx="1.5" fill={Colors.borderLight} />

      {/* Scan beam */}
      <Rect x="86" y="105" width="48" height="2" rx="1" fill={Colors.accent} opacity="0.7" />
      <Rect x="86" y="105" width="48" height="10" rx="0" fill={Colors.accent} opacity="0.08" />

      {/* Bottom safe badge */}
      <Rect x="93" y="124" width="34" height="14" rx="7" fill={Colors.safeLight} />
      <Circle cx="103" cy="131" r="3.5" fill={Colors.safe} />

      {/* Phone notch */}
      <Rect x="100" y="56" width="20" height="6" rx="3" fill={Colors.border} />

      {/* Corner brackets on phone */}
      <Path d="M86 68 L86 62 L92 62" stroke={Colors.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M134 68 L134 62 L128 62" stroke={Colors.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M86 152 L86 158 L92 158" stroke={Colors.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M134 152 L134 158 L128 158" stroke={Colors.accent} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Floating sparkle dots */}
      <Circle cx="68" cy="80" r="4" fill={Colors.accent} opacity="0.6" />
      <Circle cx="152" cy="90" r="3" fill={Colors.accent} opacity="0.4" />
      <Circle cx="62" cy="140" r="2.5" fill={Colors.accentLight} opacity="0.8" />
      <Circle cx="158" cy="135" r="5" fill={Colors.accent} opacity="0.25" />
      <Circle cx="145" cy="65" r="2" fill={Colors.accent} opacity="0.5" />
    </Svg>
  );
}
