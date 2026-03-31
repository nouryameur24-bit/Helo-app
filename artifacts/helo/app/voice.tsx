// ─── Mode Vocal — Hēlo ──────────────────────────────────────────────────────
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { sendMessage } from '@/lib/anthropic';
import {
  canVoiceFree,
  FREE_VOICE_LIMIT,
  getDailyVoiceCount,
  incrementVoiceCount,
} from '@/lib/voiceLimit';

// ─── Types ────────────────────────────────────────────────────────────────────
type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'result' | 'error';

// ─── Example questions (shown when idle) ─────────────────────────────────────
const EXAMPLE_QUESTIONS = [
  'Est-ce que je peux manger du parmesan ?',
  'Le Nurofen est-il safe ?',
  'Quels poissons éviter ?',
  'C\'est quoi le rétinol ?',
  'Puis-je boire du café ?',
];

// ─── Check Web Speech API availability ───────────────────────────────────────
function isSpeechRecognitionAvailable(): boolean {
  if (Platform.OS !== 'web') return false;
  return !!(
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
}

// ─── Strip markdown for TTS (remove **, *, #, etc.) ─────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

// ─── Pulsing circle ───────────────────────────────────────────────────────────
function PulsingCircle({ phase }: { phase: VoicePhase }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    switch (phase) {
      case 'idle':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        opacity.value = withRepeat(
          withSequence(withTiming(0.2, { duration: 1800 }), withTiming(0.1, { duration: 1800 })),
          -1,
        );
        break;

      case 'listening':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.22, { duration: 500, easing: Easing.out(Easing.ease) }),
            withTiming(1.05, { duration: 400, easing: Easing.in(Easing.ease) }),
          ),
          -1,
          false,
        );
        opacity.value = withRepeat(
          withSequence(withTiming(0.4, { duration: 500 }), withTiming(0.25, { duration: 400 })),
          -1,
        );
        break;

      case 'thinking':
        scale.value = withRepeat(
          withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        opacity.value = withRepeat(
          withTiming(0.3, { duration: 700 }),
          -1,
          true,
        );
        break;

      case 'speaking':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 300 }),
            withTiming(1.0, { duration: 300 }),
            withTiming(1.08, { duration: 400 }),
            withTiming(1.0, { duration: 400 }),
          ),
          -1,
          false,
        );
        opacity.value = withRepeat(
          withSequence(withTiming(0.35, { duration: 300 }), withTiming(0.15, { duration: 700 })),
          -1,
        );
        break;

      case 'result':
      case 'error':
        scale.value = withTiming(1.0, { duration: 300 });
        opacity.value = withTiming(0.12, { duration: 300 });
        break;
    }
  }, [phase]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconColor =
    phase === 'listening' ? Colors.accent :
    phase === 'thinking' ? Colors.caution :
    phase === 'speaking' ? Colors.safe :
    phase === 'error' ? Colors.danger :
    Colors.accent;

  const innerBg =
    phase === 'listening' ? Colors.accent :
    phase === 'thinking' ? Colors.caution + 'CC' :
    phase === 'speaking' ? Colors.safe :
    phase === 'error' ? Colors.danger :
    Colors.surface;

  const iconName: 'mic' | 'loader' | 'volume-2' | 'check-circle' | 'alert-circle' =
    phase === 'listening' ? 'mic' :
    phase === 'thinking' ? 'loader' :
    phase === 'speaking' ? 'volume-2' :
    phase === 'result' ? 'check-circle' :
    phase === 'error' ? 'alert-circle' :
    'mic';

  return (
    <View style={styles.circleContainer}>
      {/* Outer ripple */}
      <Animated.View
        style={[styles.ripple, { borderColor: Colors.accent }, rippleStyle]}
      />
      {/* Middle ring */}
      <View style={[styles.ring, { borderColor: Colors.accentLight }]} />
      {/* Core circle */}
      <View style={[styles.coreCircle, { backgroundColor: innerBg }]}>
        <Feather name={iconName} size={36} color={phase === 'listening' ? Colors.surface : iconColor} />
      </View>
    </View>
  );
}

// ─── Phase label ──────────────────────────────────────────────────────────────
function PhaseLabel({ phase }: { phase: VoicePhase }) {
  const label =
    phase === 'idle' ? 'Maintenez pour parler' :
    phase === 'listening' ? 'Je vous écoute…' :
    phase === 'thinking' ? 'Hēlo réfléchit…' :
    phase === 'speaking' ? 'Hēlo répond…' :
    phase === 'result' ? 'Réponse reçue' :
    'Je n\'ai pas compris';

  return (
    <Animated.View key={phase} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
      <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
        {label}
      </ThemedText>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = insets.bottom || 20;

  const { isPremium } = usePremium();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [voiceCount, setVoiceCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Text input fallback (native Expo Go)
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Speech recognition instance ref (web only)
  const recognitionRef = useRef<any>(null);
  // Ref to track live recognized text (avoids stale closure in onend)
  const recognizedTextRef = useRef('');

  const canUseVoice = isSpeechRecognitionAvailable();

  // Load daily count on mount
  useEffect(() => {
    getDailyVoiceCount().then((c) => {
      setVoiceCount(c);
      if (!isPremium && c >= FREE_VOICE_LIMIT) setLimitReached(true);
    });
  }, [isPremium]);

  // Stop TTS when unmounting
  useEffect(() => {
    return () => {
      Speech.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speakResponse = useCallback((text: string) => {
    setPhase('speaking');
    setIsSpeaking(true);
    const clean = stripMarkdown(text);
    Speech.speak(clean, {
      language: 'fr-FR',
      rate: 0.9,
      pitch: 1.0,
      onDone: () => {
        setIsSpeaking(false);
        setPhase('result');
      },
      onError: () => {
        setIsSpeaking(false);
        setPhase('result');
      },
    });
  }, []);

  // ── Send to AI ────────────────────────────────────────────────────────────────
  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) return;

    // Check limit
    const canUse = isPremium || (await canVoiceFree());
    if (!canUse) {
      setLimitReached(true);
      return;
    }

    setRecognizedText(question);
    setAiResponse('');
    setPhase('thinking');

    try {
      await incrementVoiceCount();
      const count = await getDailyVoiceCount();
      setVoiceCount(count);

      const response = await sendMessage([], question);
      setAiResponse(response);
      speakResponse(response);
    } catch {
      setPhase('error');
      setTimeout(() => setPhase('idle'), 3000);
    }
  }, [isPremium, speakResponse]);

  // ── Web Speech Recognition ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!canUseVoice) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase('listening');
      setRecognizedText('');
      setAiResponse('');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join('');
      recognizedTextRef.current = transcript;
      setRecognizedText(transcript);
    };

    recognition.onend = () => {
      const finalText = recognizedTextRef.current;
      if (finalText.trim()) {
        askAI(finalText);
      } else {
        setPhase('error');
        setTimeout(() => setPhase('idle'), 2500);
      }
    };

    recognition.onerror = () => {
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2500);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [canUseVoice, recognizedText, askAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  // ── Mic button handlers ───────────────────────────────────────────────────
  const handleMicPressIn = useCallback(() => {
    if (limitReached) return;
    if (canUseVoice) {
      startListening();
    } else {
      // Native fallback — just enter listening visual state
      setPhase('listening');
    }
  }, [canUseVoice, limitReached, startListening]);

  const handleMicPressOut = useCallback(() => {
    if (canUseVoice && phase === 'listening') {
      stopListening();
    }
  }, [canUseVoice, phase, stopListening]);

  // ── Native text submit ───────────────────────────────────────────────────
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || phase === 'thinking' || phase === 'speaking') return;
    askAI(textInput);
    setTextInput('');
  }, [textInput, phase, askAI]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    Speech.stop();
    recognizedTextRef.current = '';
    setPhase('idle');
    setRecognizedText('');
    setAiResponse('');
    setTextInput('');
    setIsSpeaking(false);
  }, []);

  const isActive = phase === 'listening' || phase === 'thinking' || phase === 'speaking';
  const showResult = phase === 'result' || (aiResponse && phase === 'speaking');

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <ThemedText variant="labelLarge" color="textPrimary">Mode Vocal</ThemedText>
        </View>

        {/* Voice counter */}
        {!isPremium && (
          <View style={styles.counterBadge}>
            <ThemedText variant="bodySmall" color="accent">
              {Math.max(0, FREE_VOICE_LIMIT - voiceCount)}/{FREE_VOICE_LIMIT}
            </ThemedText>
          </View>
        )}
        {isPremium && (
          <View style={[styles.counterBadge, { backgroundColor: Colors.accentLight }]}>
            <Feather name="zap" size={12} color={Colors.accent} />
          </View>
        )}
      </View>

      {/* Main content */}
      <View style={styles.body}>

        {/* Pulsing circle */}
        <Animated.View entering={FadeIn.duration(400)}>
          <PulsingCircle phase={phase} />
        </Animated.View>

        {/* Phase label */}
        <View style={styles.labelContainer}>
          <PhaseLabel phase={phase} />
        </View>

        {/* Recognized text */}
        {recognizedText ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.recognizedCard}>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginBottom: 4 }}>
              Votre question
            </ThemedText>
            <ThemedText variant="bodyLarge" color="textPrimary" style={{ lineHeight: 24, textAlign: 'center' }}>
              "{recognizedText}"
            </ThemedText>
          </Animated.View>
        ) : phase === 'idle' && !limitReached ? (
          /* Example questions hint */
          <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.examplesContainer}>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
              Essayez par exemple :
            </ThemedText>
            {EXAMPLE_QUESTIONS.slice(0, 3).map((q, i) => (
              <Pressable
                key={i}
                onPress={() => askAI(q)}
                style={({ pressed }) => [
                  styles.examplePill,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText variant="bodySmall" color="textSecondary">
                  {q}
                </ThemedText>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        {/* AI response card */}
        {showResult && aiResponse ? (
          <Animated.View entering={FadeInDown.duration(350)} style={styles.responseCard}>
            <View style={styles.responseHeader}>
              <View style={styles.aiAvatar}>
                <ThemedText style={styles.aiAvatarText}>H</ThemedText>
              </View>
              <ThemedText variant="labelLarge" color="accent">Hēlo</ThemedText>
              {isSpeaking && (
                <View style={styles.speakingDot} />
              )}
            </View>
            <ThemedText variant="bodyMedium" color="textPrimary" style={styles.responseText}>
              {aiResponse}
            </ThemedText>
          </Animated.View>
        ) : null}

        {/* Limit reached card */}
        {limitReached && !isPremium && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.limitCard}>
            <Feather name="lock" size={20} color={Colors.accent} />
            <ThemedText variant="bodyMedium" color="textPrimary" style={{ textAlign: 'center' }}>
              Vous avez utilisé vos {FREE_VOICE_LIMIT} questions vocales gratuites aujourd'hui.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/premium' as never)}
              style={({ pressed }) => [styles.premiumBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="star" size={14} color={Colors.surface} />
              <ThemedText variant="labelLarge" style={{ color: Colors.surface }}>
                Passer à Premium — Illimité
              </ThemedText>
            </Pressable>
            <ThemedText variant="bodySmall" color="textTertiary">
              Réinitialisation à minuit
            </ThemedText>
          </Animated.View>
        )}

        {/* Error fallback */}
        {phase === 'error' && (
          <Animated.View entering={FadeInDown.duration(250)} style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={Colors.danger} />
            <ThemedText variant="bodySmall" style={{ color: Colors.danger, flex: 1, textAlign: 'center' }}>
              Je n'ai pas compris. Reformulez ou tapez votre question ci-dessous.
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: bottomPadding + Spacing.lg }]}>

        {/* Text input fallback (always shown on native, shown on web in error state) */}
        {(!canUseVoice || phase === 'error' || phase === 'result') && !limitReached && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Tapez votre question…"
              placeholderTextColor={Colors.textTertiary}
              style={styles.textInput}
              onSubmitEditing={handleTextSubmit}
              editable={phase !== 'thinking'}
              returnKeyType="send"
              multiline={false}
            />
            <Pressable
              onPress={handleTextSubmit}
              disabled={!textInput.trim() || phase === 'thinking'}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  opacity: (!textInput.trim() || phase === 'thinking') ? 0.4 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="send" size={18} color={Colors.surface} />
            </Pressable>
          </Animated.View>
        )}

        {/* Main mic button */}
        {!limitReached && (
          <View style={styles.micRow}>
            {showResult && (
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="refresh-ccw" size={16} color={Colors.textSecondary} />
                <ThemedText variant="bodySmall" color="textSecondary">Reposer une question</ThemedText>
              </Pressable>
            )}

            {canUseVoice && !showResult && (
              <View style={styles.micWrap}>
                <Pressable
                  onPressIn={handleMicPressIn}
                  onPressOut={handleMicPressOut}
                  disabled={isActive && phase !== 'listening'}
                  style={({ pressed }) => [
                    styles.micButton,
                    {
                      backgroundColor: phase === 'listening' ? Colors.danger : Colors.accent,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                >
                  <Feather
                    name={phase === 'listening' ? 'square' : 'mic'}
                    size={28}
                    color={Colors.surface}
                  />
                </Pressable>
                <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
                  {phase === 'listening' ? 'Relâchez pour envoyer' : 'Maintenez pour parler'}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Native: explain STT unavailability */}
        {!canUseVoice && Platform.OS !== 'web' && phase === 'idle' && (
          <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.nativeHint}>
            <Feather name="info" size={13} color={Colors.textTertiary} />
            <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1, lineHeight: 17 }}>
              La reconnaissance vocale native est disponible dans la version complète de l'app. Tapez votre question ci-dessus.
            </ThemedText>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CIRCLE_SIZE = 160;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  counterBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 28,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
  },
  ring: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.78,
    height: CIRCLE_SIZE * 0.78,
    borderRadius: (CIRCLE_SIZE * 0.78) / 2,
    borderWidth: 1,
  },
  coreCircle: {
    width: CIRCLE_SIZE * 0.58,
    height: CIRCLE_SIZE * 0.58,
    borderRadius: (CIRCLE_SIZE * 0.58) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  labelContainer: {
    minHeight: 32,
    alignItems: 'center',
  },
  recognizedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  examplesContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  examplePill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    alignItems: 'center',
  },
  responseCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.accentLight,
    ...Shadows.soft,
    maxHeight: 220,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Colors.surface,
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.safe,
    marginLeft: Spacing.xs,
  },
  responseText: {
    lineHeight: 22,
  },
  limitCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
  },
  controls: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  micWrap: {
    alignItems: 'center',
    gap: 4,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  nativeHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
