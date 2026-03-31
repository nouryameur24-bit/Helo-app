// ─── Chat IA — Hēlo ──────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import {
  type ChatMessage,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  sendMessage,
} from '@/lib/anthropic';
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
        <ThemedText
          style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}
        >
          {message.content}
        </ThemedText>
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
  const insets = useSafeAreaInsets();
  const { isPremium, requirePremium } = usePremium();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

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
        router.push({ pathname: '/paywall', params: { trigger: 'chat_limit' } } as never);
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

    if (!isPremium) {
      const newCount = await incrementChatCount();
      setChatCount(newCount);
    }

    const reply = await sendMessage(messages, question);

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

  // ── Clear history ─────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    Alert.alert(
      'Effacer la conversation',
      'Voulez-vous supprimer tout l\'historique du chat ?',
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
              Votre assistante grossesse
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/voice' as never)}
          hitSlop={12}
          style={styles.voiceBtn}
        >
          <Feather name="mic" size={18} color={Colors.accent} />
        </TouchableOpacity>
        {hasMessages && (
          <TouchableOpacity onPress={handleClear} hitSlop={12} style={styles.clearBtn}>
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
              Bonjour 🤱
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptyBody}>
              Je suis votre assistante santé Hēlo. Posez-moi toutes vos questions sur votre grossesse — alimentation, cosmétiques, médicaments, bien-être.
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
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {/* Prescription scanner shortcut */}
        {!hasMessages && (
          <TouchableOpacity
            style={styles.prescriptionCTA}
            onPress={() => router.push('/prescription-scan' as never)}
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
                Revenez demain ou passez à Premium pour des questions illimitées.
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
              placeholder="Posez votre question…"
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              editable={!isTyping}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || isTyping) && styles.sendBtnDisabled,
                pressed && styles.sendBtnPressed,
              ]}
              onPress={() => handleSend()}
              disabled={!input.trim() || isTyping}
            >
              <Feather name="send" size={18} color={Colors.surface} />
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headerTitle: {
    color: Colors.textPrimary,
  },
  clearBtn: {
    padding: Spacing.sm,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.huge,
    paddingHorizontal: Spacing.xl,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  emptyAvatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  emptyTitle: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight + '55',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  limitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  avatarPlaceholder: {
    width: 28,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.soft,
  },
  bubbleUser: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomRightRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleAi: {
    backgroundColor: Colors.accentLight + '55',
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  typingBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  bubbleText: {
    lineHeight: 21,
    fontSize: 14,
  },
  bubbleTextUser: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bubbleTextAi: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Bottom area
  bottomArea: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },

  // Suggestions
  prescriptionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  prescriptionCTAText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textPrimary,
  },
  prescriptionBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  prescriptionBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  suggestionsScroll: {
    marginBottom: Spacing.sm,
  },
  suggestionsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Limit warning
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  limitWarningText: {
    fontSize: 12,
    color: Colors.caution,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Premium banner
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.accentLight + '44',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentLight,
    gap: Spacing.md,
  },
  premiumBannerLeft: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: 2,
  },
  premiumBannerBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 17,
  },
  premiumBannerBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexShrink: 0,
  },
  premiumBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_400Regular',
    maxHeight: 120,
    ...Shadows.soft,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  sendBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
