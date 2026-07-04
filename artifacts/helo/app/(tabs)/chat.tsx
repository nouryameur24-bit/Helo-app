import { styles } from './chatStyles';
// ─── Chat IA — Hēlo ──────────────────────────────────────────────────────────
import { ROUTES } from '@/types/routes';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clearChatUnread } from '@/hooks/useChatUnread';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { RichChatContent } from '@/components/chat/RichChatContent';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  
import {
  type ChatMessage,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  sendMessage,
} from '@/lib/anthropic';
import { track } from '@/lib/analytics';
import { isRateLimitError } from '@/lib/errors';
import {
  canChatFree,
  FREE_CHAT_LIMIT,
  getDailyChatCount,
  incrementChatCount,
} from '@/lib/chatLimit';

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Puis-je manger du saumon fumé ?',
  'Le Doliprane est-il safe ?',
  'Quels fromages éviter ?',
  'Puis-je boire du café ?',
  'L\'ibuprofène est-il contre-indiqué ?',
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AiAvatar() {
  return (
    <View style={styles.avatar}>
      <ThemedText style={styles.avatarText}>H</ThemedText>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 20).duration(250)}
      style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}
    >
      {!isUser && <AiAvatar />}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAi,
        ]}
      >
        {/* v4 Lot 12 — Réponses assistant : sources médicales (CRAT, ANSM,
            EFSA, ANSES, OMS) rendues cliquables vers l'URL officielle. */}
        {isUser ? (
          <ThemedText style={[styles.bubbleText, styles.bubbleTextUser]}>
            {message.content}
          </ThemedText>
        ) : (
          <RichChatContent
            content={message.content}
            baseStyle={[styles.bubbleText, styles.bubbleTextAi]}
          />
        )}
      </View>
      {isUser && <View style={styles.avatarPlaceholder} />}
    </Animated.View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.bubbleRow}>
      <AiAvatar />
      <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const __discovery_chat = useFeatureDiscovery('chat');
  const insets = useSafeAreaInsets();
  const { isPremium, requirePremium } = usePremium();
  const scrollRef = useRef<ScrollView>(null);
  // Jeton d'envoi : incrémenté à chaque envoi ET à chaque "stop". Permet
  // d'ignorer le résultat d'une requête que l'utilisatrice a interrompue
  // (sa réponse tardive ne doit ni s'afficher ni ré-armer le spinner).
  const sendTokenRef = useRef(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Lot 16-10 — Reset le badge unread quand l'utilisatrice arrive sur le
  // chat tab. useFocusEffect = call à chaque fois que le tab est focus,
  // pas juste au mount.
  useFocusEffect(
    useCallback(() => {
      clearChatUnread();
    }, []),
  );

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [history, count] = await Promise.all([
        loadChatHistory(),
        getDailyChatCount(),
      ]);
      setMessages(history);
      setChatCount(count);
      setInitialized(true);
    })();
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isTyping]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || isTyping) return;

    if (!isPremium) {
      const ok = await canChatFree();
      if (!ok) {
        router.push({ pathname: '/paywall', params: { trigger: 'chat_limit' } });
        return;
      }
    }

    setInput('');

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);
    // Capture le jeton de CETTE requête. Si l'utilisatrice interrompt (stop)
    // ou relance, sendTokenRef.current change → on ignore ce résultat au retour.
    const token = ++sendTokenRef.current;

    // Analytics : envoi côté utilisateur. On émet ici (avant la réponse
    // assistant) pour ne pas perdre l'event si Claude timeout. `length` est
    // utile pour distinguer questions courtes vs prompts élaborés.
    track('chat_message_sent', {
      is_premium: isPremium,
      message_length: question.length,
      history_size: messages.length,
    }).catch(() => {});

    if (!isPremium) {
      const newCount = await incrementChatCount();
      setChatCount(newCount);
    }

    let reply: string;
    try {
      reply = await sendMessage(messages, question);
    } catch (err) {
      // Interrompue pendant l'attente → on ne touche à rien (le stop a déjà
      // restauré l'UI). Sinon on affiche l'erreur.
      if (sendTokenRef.current !== token) return;
      setIsTyping(false);
      if (isRateLimitError(err)) {
        Alert.alert(
          'Limite quotidienne atteinte',
          'Tu as atteint ta limite quotidienne de chat. Réessaie demain.',
        );
      } else {
        Alert.alert('Erreur', "Une erreur est survenue. Réessaie dans quelques instants.");
      }
      return;
    }

    // Réponse arrivée APRÈS un stop/relance → on la jette silencieusement.
    if (sendTokenRef.current !== token) return;

    const aiMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
    };

    const finalMessages = [...newMessages, aiMsg];
    setMessages(finalMessages);
    setIsTyping(false);
    await saveChatHistory(finalMessages);
  }, [input, isTyping, isPremium, messages]);

  // ── Stop / interruption ─────────────────────────────────────────────────
  // Rend la main immédiatement : on invalide la requête en cours (son résultat
  // sera ignoré au retour) et on retire le spinner. L'input n'est jamais gelé
  // → l'utilisatrice reprend le contrôle sans attendre le réseau.
  const handleStop = useCallback(() => {
    sendTokenRef.current++;
    setIsTyping(false);
  }, []);

  // ── Clear history ─────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    Alert.alert(
      'Effacer la conversation',
      'Veux-tu supprimer tout l\'historique du chat ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await clearChatHistory();
            setMessages([]);
          },
        },
      ],
    );
  }, []);

  const questionsLeft = Math.max(0, FREE_CHAT_LIMIT - chatCount);
  const hasMessages = messages.length > 0;

  if (!initialized) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      </View>
    );
  }

  const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 49 }) ?? 49;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <ThemedText style={styles.headerAvatarText}>H</ThemedText>
          </View>
          <View>
            <ThemedText variant="headlineMedium" style={styles.headerTitle}>
              Hēlo IA
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary">
              Ton assistante grossesse
            </ThemedText>
          </View>
        </View>
        {hasMessages && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Supprimer" onPress={handleClear} hitSlop={12} style={styles.clearBtn}>
            <Feather name="trash-2" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        {!hasMessages && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <View style={styles.emptyAvatar}>
              <ThemedText style={styles.emptyAvatarText}>H</ThemedText>
            </View>
            <ThemedText variant="headlineMedium" style={styles.emptyTitle}>
              Bonjour
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
              Je suis ton assistante santé Hēlo. Pose-moi toutes tes questions sur ta grossesse — alimentation, cosmétiques, médicaments, bien-être.
            </ThemedText>
            {!isPremium && (
              <View style={styles.limitBadge}>
                <Feather name="zap" size={12} color={Colors.accent} />
                <ThemedText style={styles.limitBadgeText}>
                  {questionsLeft} question{questionsLeft !== 1 ? 's' : ''} gratuite{questionsLeft !== 1 ? 's' : ''} aujourd'hui
                </ThemedText>
              </View>
            )}
          </Animated.View>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i} />
        ))}

        {isTyping && <TypingIndicator />}
      </ScrollView>

      {/* ── Bottom area ── */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.sm }]}>
        {/* Prescription scanner shortcut */}
        {!hasMessages && (
          <TouchableOpacity
            style={styles.prescriptionCTA}
            onPress={() => router.push(ROUTES.prescriptionScan)}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={15} color={Colors.accent} />
            <ThemedText style={styles.prescriptionCTAText}>Scanner mon ordonnance</ThemedText>
            <View style={styles.prescriptionBadge}>
              <ThemedText style={styles.prescriptionBadgeText}>Premium</ThemedText>
            </View>
          </TouchableOpacity>
        )}

        {/* Suggestions */}
        {!hasMessages && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}
          >
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => handleSend(s)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.chipText}>{s}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Free limit warning */}
        {!isPremium && chatCount >= FREE_CHAT_LIMIT - 1 && chatCount < FREE_CHAT_LIMIT && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.limitWarning}>
            <Feather name="alert-circle" size={13} color={Colors.caution} />
            <ThemedText style={styles.limitWarningText}>
              Dernière question gratuite du jour
            </ThemedText>
          </Animated.View>
        )}

        {/* Premium gate banner */}
        {!isPremium && chatCount >= FREE_CHAT_LIMIT ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.premiumBanner}>
            <View style={styles.premiumBannerLeft}>
              <ThemedText style={styles.premiumBannerTitle}>Limite atteinte</ThemedText>
              <ThemedText style={styles.premiumBannerBody}>
                Reviens demain ou passe à Premium pour des questions illimitées.
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.premiumBannerBtn}
              onPress={() => requirePremium('chat_limit')}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.premiumBannerBtnText}>Premium</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          /* Input bar */
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Pose ta question…"
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              // L'input n'est JAMAIS gelé : même pendant une réponse, on peut
              // rédiger la suivante. Le double-envoi est empêché par le guard
              // `isTyping` dans handleSend, pas par un verrou d'UI.
            />
            {isTyping ? (
              /* Pendant la génération : bouton STOP (le garde-fou de chargement
                 ne doit jamais empêcher l'interruption). */
              <Pressable
                style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
                onPress={handleStop}
                accessibilityRole="button"
                accessibilityLabel="Arrêter la réponse"
              >
                <Feather name="square" size={16} color={Colors.surface} />
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  !input.trim() && styles.sendBtnDisabled,
                  pressed && styles.sendBtnPressed,
                ]}
                onPress={() => handleSend()}
                disabled={!input.trim()}
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
              >
                <Feather name="send" size={18} color={Colors.surface} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    <FeatureDiscoverySheet {...__discovery_chat.sheetProps} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
