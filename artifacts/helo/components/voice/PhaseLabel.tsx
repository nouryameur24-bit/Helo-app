import React from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ThemedText } from '@/components/ui/ThemedText';
import type { VoicePhase } from './PulsingCircle';

interface PhaseLabelProps {
  phase: VoicePhase;
}

const PHASE_LABELS: Record<VoicePhase, string> = {
  idle: 'Maintenez pour parler',
  listening: 'Je vous écoute…',
  thinking: 'Hēlo réfléchit…',
  speaking: 'Hēlo répond…',
  result: 'Réponse reçue',
  error: "Je n'ai pas compris",
};

function PhaseLabel({ phase }: PhaseLabelProps) {
  return (
    <Animated.View key={phase} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
      <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
        {PHASE_LABELS[phase]}
      </ThemedText>
    </Animated.View>
  );
}

export default React.memo(PhaseLabel);
