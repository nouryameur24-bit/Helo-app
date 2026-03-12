import React from "react";
import Svg, { Circle, Path, Text as SvgText, Defs, LinearGradient, Stop, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

interface Props {
  size?: number;
}

export function IllustrationGlowScore({ size = 220 }: Props) {
  // Arc parameters
  const cx = 110;
  const cy = 120;
  const r = 72;
  const strokeW = 10;

  // Arc from 210° to 330° (240° sweep = score arc)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startAngle = 210;
  const endAngle = 330; // ~82% of 240° range

  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));

  // Background track: full 240° from 150° to 390° (=30°)
  const bx1 = cx + r * Math.cos(toRad(150));
  const by1 = cy + r * Math.sin(toRad(150));
  const bx2 = cx + r * Math.cos(toRad(30));
  const by2 = cy + r * Math.sin(toRad(30));

  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Defs>
        <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Colors.accentLight} />
          <Stop offset="1" stopColor={Colors.accent} />
        </LinearGradient>
      </Defs>

      {/* Background glow circle */}
      <Circle cx={cx} cy={cy} r="90" fill={Colors.accentLight} opacity="0.18" />

      {/* Track arc (full range) */}
      <Path
        d={`M ${bx1} ${by1} A ${r} ${r} 0 1 1 ${bx2} ${by2}`}
        stroke={Colors.borderLight}
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
      />

      {/* Score arc */}
      <Path
        d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`}
        stroke="url(#scoreGrad)"
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
      />

      {/* Score end dot */}
      <Circle cx={x2} cy={y2} r="6" fill={Colors.accent} />
      <Circle cx={x2} cy={y2} r="3" fill={Colors.surface} />

      {/* Center score text */}
      <SvgText x={cx} y={cy - 12} textAnchor="middle" fontSize="38" fontWeight="700" fill={Colors.accent}>86</SvgText>
      <SvgText x={cx} y={cy + 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={Colors.accentDark} letterSpacing="1">GLOW</SvgText>
      <SvgText x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill={Colors.textTertiary} letterSpacing="0.5">SCORE</SvgText>

      {/* Small decorative dots */}
      <Circle cx="52" cy="80" r="3.5" fill={Colors.accent} opacity="0.3" />
      <Circle cx="168" cy="80" r="4" fill={Colors.accent} opacity="0.25" />
      <Circle cx="45" cy="130" r="2.5" fill={Colors.accentLight} opacity="0.7" />
      <Circle cx="175" cy="130" r="3" fill={Colors.accent} opacity="0.2" />
    </Svg>
  );
}
