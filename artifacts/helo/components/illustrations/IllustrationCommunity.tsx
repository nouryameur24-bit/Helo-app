import React from "react";
import Svg, { Circle, Ellipse, Path, Line, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

export function IllustrationCommunity({ size = 220 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      {/* Background bloom */}
      <Circle cx="110" cy="115" r="85" fill={Colors.accentLight} opacity="0.2" />

      {/* Connection lines between figures */}
      <Line x1="68" y1="105" x2="110" y2="95" stroke={Colors.accentLight} strokeWidth="1.5" strokeDasharray="3 3" />
      <Line x1="152" y1="105" x2="110" y2="95" stroke={Colors.accentLight} strokeWidth="1.5" strokeDasharray="3 3" />
      <Line x1="44" y1="118" x2="68" y2="105" stroke={Colors.border} strokeWidth="1" strokeDasharray="3 3" />
      <Line x1="176" y1="118" x2="152" y2="105" stroke={Colors.border} strokeWidth="1" strokeDasharray="3 3" />

      {/* Center figure (main / largest) */}
      <Circle cx="110" cy="78" r="16" fill={Colors.accentLight} />
      <Circle cx="110" cy="78" r="16" stroke={Colors.accent} strokeWidth="1.5" fill="none" />
      {/* Head */}
      <Circle cx="110" cy="72" r="6" fill={Colors.accent} opacity="0.7" />
      {/* Body */}
      <Ellipse cx="110" cy="85" rx="8" ry="5" fill={Colors.accent} opacity="0.5" />

      {/* Left secondary figure */}
      <Circle cx="68" cy="108" r="13" fill={Colors.backgroundSecondary} />
      <Circle cx="68" cy="108" r="13" stroke={Colors.accentLight} strokeWidth="1.5" fill="none" />
      <Circle cx="68" cy="103" r="5" fill={Colors.accent} opacity="0.5" />
      <Ellipse cx="68" cy="114" rx="6" ry="4" fill={Colors.accentLight} opacity="0.9" />

      {/* Right secondary figure */}
      <Circle cx="152" cy="108" r="13" fill={Colors.backgroundSecondary} />
      <Circle cx="152" cy="108" r="13" stroke={Colors.accentLight} strokeWidth="1.5" fill="none" />
      <Circle cx="152" cy="103" r="5" fill={Colors.accent} opacity="0.5" />
      <Ellipse cx="152" cy="114" rx="6" ry="4" fill={Colors.accentLight} opacity="0.9" />

      {/* Far left figure */}
      <Circle cx="44" cy="122" r="10" fill={Colors.backgroundSecondary} />
      <Circle cx="44" cy="122" r="10" stroke={Colors.border} strokeWidth="1" fill="none" />
      <Circle cx="44" cy="118" r="4" fill={Colors.textTertiary} opacity="0.5" />
      <Ellipse cx="44" cy="127" rx="5" ry="3.5" fill={Colors.border} />

      {/* Far right figure */}
      <Circle cx="176" cy="122" r="10" fill={Colors.backgroundSecondary} />
      <Circle cx="176" cy="122" r="10" stroke={Colors.border} strokeWidth="1" fill="none" />
      <Circle cx="176" cy="118" r="4" fill={Colors.textTertiary} opacity="0.5" />
      <Ellipse cx="176" cy="127" rx="5" ry="3.5" fill={Colors.border} />

      {/* Heart at top center */}
      <Path
        d="M110 55 C110 55 107 51 104 51 C101 51 99 53 99 56 C99 62 110 68 110 68 C110 68 121 62 121 56 C121 53 119 51 116 51 C113 51 110 55 110 55 Z"
        fill={Colors.accent}
        opacity="0.6"
        scale="0.7"
        originX="110"
        originY="58"
      />

      {/* Floating dots */}
      <Circle cx="90" cy="55" r="2.5" fill={Colors.accent} opacity="0.35" />
      <Circle cx="130" cy="55" r="2" fill={Colors.accent} opacity="0.25" />
      <Circle cx="85" cy="145" r="3" fill={Colors.accentLight} opacity="0.6" />
      <Circle cx="135" cy="148" r="2" fill={Colors.accent} opacity="0.3" />
    </Svg>
  );
}
