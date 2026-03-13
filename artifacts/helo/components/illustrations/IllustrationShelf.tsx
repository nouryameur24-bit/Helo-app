import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

export function IllustrationShelf({ size = 220 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Circle cx="110" cy="110" r="100" fill={Colors.accentLight} opacity="0.25" />
      <Circle cx="110" cy="110" r="80" fill={Colors.accentLight} opacity="0.35" />
      <Circle cx="110" cy="110" r="60" fill={Colors.accentLight} opacity="0.45" />

      <Rect x="60" y="60" width="100" height="110" rx="14" fill={Colors.surface} />
      <Rect x="65" y="65" width="90" height="100" rx="10" fill={Colors.backgroundSecondary} />

      <Rect x="75" y="78" width="30" height="30" rx="6" fill={Colors.safeLight} />
      <Circle cx="90" cy="93" r="8" fill={Colors.safe} opacity="0.6" />

      <Rect x="115" y="78" width="30" height="30" rx="6" fill={Colors.cautionLight} />
      <Circle cx="130" cy="93" r="8" fill={Colors.caution} opacity="0.6" />

      <Rect x="75" y="118" width="30" height="30" rx="6" fill={Colors.dangerLight} />
      <Circle cx="90" cy="133" r="8" fill={Colors.danger} opacity="0.6" />

      <Rect x="115" y="118" width="30" height="30" rx="6" fill={Colors.borderLight} />
      <Path
        d="M126 133 L130 137 L138 129"
        stroke={Colors.accent}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Circle cx="58" cy="80" r="4" fill={Colors.accent} opacity="0.6" />
      <Circle cx="162" cy="90" r="3" fill={Colors.accent} opacity="0.4" />
      <Circle cx="52" cy="145" r="2.5" fill={Colors.accentLight} opacity="0.8" />
      <Circle cx="168" cy="140" r="5" fill={Colors.accent} opacity="0.25" />
    </Svg>
  );
}
