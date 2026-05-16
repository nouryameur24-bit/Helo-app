import * as Haptics from 'expo-haptics';
import { ROUTES } from '@/types/routes';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { sendMessage } from '@/lib/anthropic';
import { isRateLimitError } from '@/lib/errors';
import { canVoiceFree, FREE_VOICE_LIMIT, getDailyVoiceCount, incrementVoiceCount } from '@/lib/voiceLimit';

import PulsingCircle, { type VoicePhase } from '@/components/voice/PulsingCircle';
import PhaseLabel from '@/components/voice/PhaseLabel';
import styles from '@/components/voice/voiceStyles';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  

const EXAMPLE_QUESTIONS = [
  'Est-ce que je peux manger du parmesan ?',
  'Le Nurofen est-il safe ?',
  'Quels poissons éviter ?',
  "C'est quoi le rétinol ?",
  'Puis-je boire du café ?',
];

interface WebSpeechRecognitionResult { 0: { transcript: string }; }
interface WebSpeechRecognitionEvent { results: ArrayLike<WebSpeechRecognitionResult>; }
interface WebSpeechRecognitionErrorEvent { error: string; }
interface WebSpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
interface WindowWithSpeech extends Window {
  SpeechRecognition?: { new(): WebSpeechRecognition };
  webkitSpeechRecognition?: { new(): WebSpeechRecognition };
}

function isSpeechRecognitionAvailable(): boolean {
  if (Platform.OS !== 'web') return false;
  const w = window as WindowWithSpeech;
  return !!(typeof window !== 'undefined' && (w.SpeechRecognition || w.webkitSpeechRecognition));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '').replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1').trim();
}

export default function VoiceScreen() {
  const __discovery_voice = useFeatureDiscovery('voice');
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
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const recognizedTextRef = useRef('');

  // Auto-scroll to the bottom when the AI response arrives so it stays visible
  // above the keyboard.
  useEffect(() => {
    if (!aiResponse) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [aiResponse]);
  const canUseVoice = isSpeechRecognitionAvailable();

  useEffect(() => {
    getDailyVoiceCount().then((c) => {
      setVoiceCount(c);
      if (!isPremium && c >= FREE_VOICE_LIMIT) setLimitReached(true);
    });
  }, [isPremium]);

  useEffect(() => {
    return () => {
      Speech.stop();
      // WebSpeechAPI abort() throws if recognition is not active — safe to swallow
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* no-op */ } }
    };
  }, []);

  const speakResponse = useCallback((text: string) => {
    setPhase('speaking');
    setIsSpeaking(true);
    Speech.speak(stripMarkdown(text), {
      language: 'fr-FR', rate: 0.9, pitch: 1.0,
      onDone: () => { setIsSpeaking(false); setPhase('result'); },
      onError: () => { setIsSpeaking(false); setPhase('result'); },
    });
  }, []);

  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) return;
    const canUse = isPremium || (await canVoiceFree());
    if (!canUse) { setLimitReached(true); return; }
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
    } catch (err) {
      setPhase('error');
      if (isRateLimitError(err)) setLimitReached(true);
      setTimeout(() => setPhase('idle'), 3000);
    }
  }, [isPremium, speakResponse]);

  const startListening = useCallback(() => {
    if (!canUseVoice) return;
    const w = window as WindowWithSpeech;
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase('listening'); setRecognizedText(''); setAiResponse(''); recognizedTextRef.current = ''; };
    recognition.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; }
      setRecognizedText(t);
      recognizedTextRef.current = t;
    };
    recognition.onerror = () => { setPhase('error'); setTimeout(() => setPhase('idle'), 2000); };
    recognition.onend = () => { if (recognizedTextRef.current) askAI(recognizedTextRef.current); else setPhase('idle'); };
    recognitionRef.current = recognition;
    recognition.start();
  }, [canUseVoice, askAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && phase === 'listening') { recognitionRef.current.stop(); }
  }, [phase]);

  const handleReset = useCallback(() => {
    Speech.stop();
    // WebSpeechAPI abort() throws if recognition is not active — safe to swallow
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* no-op */ } }
    setPhase('idle');
    setRecognizedText('');
    setAiResponse('');
    setTextInput('');
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setTextInput('');
    askAI(q);
  }, [textInput, askAI]);

  const micActive = phase === 'listening';
  const micBg = micActive ? Colors.danger : Colors.accent;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: topPadding }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">Mode Vocal</ThemedText>
        {!isPremium && (
          <View style={{ backgroundColor: Colors.accentLight, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
            <ThemedText variant="labelSmall" style={{ color: Colors.accentDark }}>
              {voiceCount}/{FREE_VOICE_LIMIT}
            </ThemedText>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.centerSection}>
          <PulsingCircle phase={phase} />
          <View style={styles.labelContainer}>
            <PhaseLabel phase={phase} />
          </View>

          {recognizedText ? (
            <View style={styles.recognizedCard}>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
                {recognizedText}
              </ThemedText>
            </View>
          ) : phase === 'idle' ? (
            <View style={styles.examplesContainer}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  style={styles.examplePill}
                  onPress={() => askAI(q)}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <ThemedText variant="bodySmall" color="textSecondary" style={{ textAlign: 'center' }}>{q}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {aiResponse ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <View style={styles.aiAvatar}>
                  <ThemedText style={styles.aiAvatarText}>H</ThemedText>
                </View>
                <ThemedText variant="labelLarge" color="textPrimary">Hēlo</ThemedText>
                {isSpeaking && <View style={styles.speakingDot} />}
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <ThemedText variant="bodyMedium" color="textPrimary" style={styles.responseText}>
                  {aiResponse}
                </ThemedText>
              </ScrollView>
            </Animated.View>
          ) : limitReached ? (
            <View style={styles.limitCard}>
              <ThemedText style={{ fontSize: 32 }}>⭐</ThemedText>
              <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>Limite atteinte</ThemedText>
              <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center' }}>
                Vous avez utilisé vos {FREE_VOICE_LIMIT} questions gratuites. Passez Premium pour continuer.
              </ThemedText>
              <Pressable
                style={styles.premiumBtn}
                onPress={() => router.push(ROUTES.premium)}
                accessibilityRole="button"
                accessibilityLabel="Débloquer Premium"
              >
                <Feather name="star" size={16} color="#fff" />
                <ThemedText variant="labelLarge" style={{ color: '#fff' }}>Débloquer Premium</ThemedText>
              </Pressable>
            </View>
          ) : phase === 'error' ? (
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={18} color={Colors.danger} />
              <ThemedText variant="bodySmall" color="textPrimary">Je n'ai pas pu traiter votre demande. Réessayez.</ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: bottomPadding + Spacing.sm }]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Posez votre question par écrit…"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="send"
            onSubmitEditing={handleTextSubmit}
          />
          <Pressable
            onPress={handleTextSubmit}
            disabled={!textInput.trim()}
            style={[styles.sendBtn, { opacity: textInput.trim() ? 1 : 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer la question"
          >
            <Feather name="send" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.micRow}>
          {canUseVoice ? (
            <View style={styles.micWrap}>
              <Pressable
                onPressIn={startListening}
                onPressOut={stopListening}
                style={[styles.micButton, { backgroundColor: micBg }]}
                accessibilityRole="button"
                accessibilityLabel={micActive ? 'Relâchez pour envoyer' : 'Maintenez pour parler'}
              >
                <Feather name={micActive ? 'mic' : 'mic'} size={28} color="#fff" />
              </Pressable>
              <ThemedText variant="bodySmall" color="textTertiary">
                {micActive ? 'Relâchez pour envoyer' : 'Maintenez pour parler'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.nativeHint}>
              <Feather name="info" size={14} color={Colors.textTertiary} />
              <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1 }}>
                La reconnaissance vocale est disponible dans le navigateur. Utilisez la saisie texte ci-dessus.
              </ThemedText>
            </View>
          )}

          {(phase !== 'idle') && (
            <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Réinitialiser">
              <Feather name="refresh-ccw" size={14} color={Colors.textSecondary} />
              <ThemedText variant="bodySmall" color="textSecondary">Recommencer</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    <FeatureDiscoverySheet {...__discovery_voice.sheetProps} />
    </KeyboardAvoidingView>
  );
}
