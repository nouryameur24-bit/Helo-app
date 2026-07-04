import React from "react";
import Svg, { Circle, Text as SvgText, Line } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

export function IllustrationTrimester({ size = 220 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      {/* Connecting line */}
      <Line x1="45" y1="110" x2="175" y2="110" stroke={Colors.border} strokeWidth="1.5" strokeDasharray="4 3" />

      {/* T1 circle — smallest, lighter */}
      <Circle cx="55" cy="110" r="32" fill={Colors.backgroundSecondary} />
      <Circle cx="55" cy="110" r="32" stroke={Colors.border} strokeWidth="1.5" fill="none" />
      <Circle cx="55" cy="110" r="20" fill={Colors.accentLight} opacity="0.5" />
      <SvgText x="55" y="104" textAnchor="middle" fontSize="9" fontWeight="600" fill={Colors.accentDark} letterSpacing="0.5">T1</SvgText>
      <SvgText x="55" y="118" textAnchor="middle" fontSize="7.5" fill={Colors.textSecondary}>1–12 SA</SvgText>

      {/* T2 circle — medium, accent */}
      <Circle cx="110" cy="110" r="40" fill={Colors.accentLight} opacity="0.4" />
      <Circle cx="110" cy="110" r="40" stroke={Colors.accent} strokeWidth="1.5" fill="none" />
      <Circle cx="110" cy="110" r="26" fill={Colors.accent} opacity="0.25" />
      <SvgText x="110" y="104" textAnchor="middle" fontSize="10" fontWeight="700" fill={Colors.accentDark} letterSpacing="0.5">T2</SvgText>
      <SvgText x="110" y="118" textAnchor="middle" fontSize="7.5" fill={Colors.textSecondary}>13–26 SA</SvgText>

      {/* T3 circle — largest, richest */}
      <Circle cx="170" cy="110" r="36" fill={Colors.accentLight} opacity="0.6" />
      <Circle cx="170" cy="110" r="36" stroke={Colors.accent} strokeWidth="2" fill="none" />
      <Circle cx="170" cy="110" r="22" fill={Colors.accent} opacity="0.35" />
      <SvgText x="170" y="104" textAnchor="middle" fontSize="10" fontWeight="700" fill={Colors.accentDark} letterSpacing="0.5">T3</SvgText>
      <SvgText x="170" y="118" textAnchor="middle" fontSize="7.5" fill={Colors.textSecondary}>27–40 SA</SvgText>

      {/* Growth arrow dots */}
      <Circle cx="78" cy="97" r="2.5" fill={Colors.accent} opacity="0.4" />
      <Circle cx="90" cy="93" r="2" fill={Colors.accent} opacity="0.3" />
      <Circle cx="130" cy="93" r="2" fill={Colors.accent} opacity="0.3" />
      <Circle cx="143" cy="94" r="2.5" fill={Colors.accent} opacity="0.4" />

      {/* Bottom label */}
      <SvgText x="110" y="170" textAnchor="middle" fontSize="9" fill={Colors.textTertiary} letterSpacing="0.8">ÉVOLUTION PAR TRIMESTRE</SvgText>
    </Svg>
  );
}
