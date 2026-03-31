import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { useCircle } from '@/hooks/useCircle';
import {
  createCircle,
  joinCircle,
  leaveCircle,
  getMemberColor,
  getRelativeTime,
  type CircleFeedEntry,
  type CircleMember,
} from '@/lib/circleUtils';

const REACTIONS = ['😱', '🤣', '👍', '❤️'] as const;

function getVerdictLabel(verdict?: string): string {
  if (verdict === 'danger') return 'À éviter';
  if (verdict === 'caution') return 'Précaution';
  if (verdict === 'safe') return 'Compatible';
  return '';
}

function getVerdictColor(verdict?: string): string {
  if (verdict === 'danger') return Colors.danger;
  if (verdict === 'caution') return Colors.caution;
  if (verdict === 'safe') return Colors.safe;
  return Colors.textTertiary;
}

function MemberAvatar({ member, size = 40 }: { member: CircleMember; size?: number }) {
  const color = getMemberColor(member.user_id);
  const initial = (member.first_name || '?').charAt(0).toUpperCase();
  return (
    <View
      style={[
        avatarStyles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <ThemedText style={[avatarStyles.initial, { fontSize: size * 0.4, color: '#fff' }]}>
        {initial}
      </ThemedText>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  initial: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});

function FeedCard({
  entry,
  userId,
  onReact,
}: {
  entry: CircleFeedEntry;
  userId: string;
  onReact: (id: string, emoji: string) => void;
}) {
  const myReaction = entry.user_reactions?.[userId];
  const verdictColor = getVerdictColor(entry.verdict);
  const verdictLabel = getVerdictLabel(entry.verdict);
  const color = getMemberColor(entry.user_id);
  const initial = (entry.first_name || '?').charAt(0).toUpperCase();

  return (
    <Card style={styles.feedCard} padding={Spacing.lg}>
      <View style={styles.feedHeader}>
        <View style={[styles.feedAvatar, { backgroundColor: color }]}>
          <ThemedText style={styles.feedAvatarInitial}>{initial}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          {entry.type === 'scan' ? (
            <>
              <ThemedText variant="bodyMedium" color="textPrimary">
                <ThemedText variant="labelLarge" color="textPrimary">{entry.first_name}</ThemedText>
                {' a scanné '}
                <ThemedText variant="labelLarge" color="textPrimary">{entry.product_name ?? 'un produit'}</ThemedText>
              </ThemedText>
              {entry.verdict && (
                <View style={[styles.verdictBadge, { backgroundColor: verdictColor + '20' }]}>
                  <ThemedText style={[styles.verdictBadgeText, { color: verdictColor }]}>
                    {verdictLabel}
                  </ThemedText>
                </View>
              )}
            </>
          ) : (
            <ThemedText variant="bodyMedium" color="textPrimary">
              <ThemedText variant="labelLarge" color="textPrimary">{entry.first_name}</ThemedText>
              {entry.message_text ? ` : ${entry.message_text}` : ''}
            </ThemedText>
          )}
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
            {getRelativeTime(entry.created_at)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.reactionsRow}>
        {REACTIONS.map((emoji) => {
          const count = entry.reactions?.[emoji] ?? 0;
          const isActive = myReaction === emoji;
          return (
            <Pressable
              key={emoji}
              onPress={() => onReact(entry.id, emoji)}
              style={({ pressed }) => [
                styles.reactionBtn,
                isActive && styles.reactionBtnActive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText style={styles.reactionEmoji}>{emoji}</ThemedText>
              {count > 0 && (
                <ThemedText
                  style={[styles.reactionCount, isActive && { color: Colors.accent }]}
                >
                  {count}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function EmptyFeed() {
  return (
    <View style={styles.emptyFeed}>
      <ThemedText style={{ fontSize: 36 }}>💬</ThemedText>
      <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
        Le fil est vide
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
        Partagez un scan depuis la page verdict ou envoyez un message pour démarrer !
      </ThemedText>
    </View>
  );
}

function NoCercleScreen({
  onCreateCircle,
  onJoinCircle,
  isPremium,
}: {
  onCreateCircle: () => void;
  onJoinCircle: () => void;
  isPremium: boolean;
}) {
  return (
    <View style={styles.noCercleRoot}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.noCercleInner}>
        <View style={styles.noCercleEmoji}>
          <ThemedText style={{ fontSize: 48 }}>🫂</ThemedText>
        </View>
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.centeredText}>
          Mon Cercle
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={[styles.centeredText, { marginTop: Spacing.sm }]}>
          Invitez jusqu'à 8 proches pour partager vos scans, vos réactions et vous motiver ensemble.
        </ThemedText>

        <View style={styles.noCercleActions}>
          <Pressable
            onPress={onCreateCircle}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.primaryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="users" size={18} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>
                Créer mon cercle {!isPremium ? '✦ Premium' : ''}
              </ThemedText>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onJoinCircle}
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="link" size={18} color={Colors.accentDark} />
            <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>
              Rejoindre un cercle
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default function CircleScreen() {
  const insets = useSafeAreaInsets();
  const { userId, firstName } = useProfile();
  const { isPremium, requirePremium } = usePremium();
  const { isLoading, isOffline, circle, members, feed, glowScore, weeklyChallenge, refresh, sendMessage, react } =
    useCircle(userId, firstName || 'Anonyme');

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [joiningCode, setJoiningCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleCreateCircle = async () => {
    if (!isPremium) {
      requirePremium('circle');
      return;
    }
    setIsCreating(true);
    try {
      await createCircle(userId, firstName || 'Anonyme');
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg !== 'PREMIUM_REQUIRED') {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!joiningCode.trim()) return;
    setIsJoining(true);
    try {
      await joinCircle(userId, firstName || 'Anonyme', joiningCode.trim());
      setShowJoinInput(false);
      setJoiningCode('');
      await refresh();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveCircle = () => {
    if (!circle) return;
    const isOwner = circle.owner_id === userId;
    Alert.alert(
      isOwner ? 'Supprimer le cercle' : 'Quitter le cercle',
      isOwner
        ? 'En tant que créatrice, cela supprimera le cercle pour tout le monde.'
        : 'Voulez-vous quitter ce cercle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isOwner ? 'Supprimer' : 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCircle(userId, circle.id);
              await refresh();
            } catch (err) {
              Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur');
            }
          },
        },
      ],
    );
  };

  const handleShare = () => {
    if (!circle?.invite_code) return;
    Share.share({
      message: `Rejoins mon cercle sur Hēlo ! Entre le code : ${circle.invite_code}`,
    });
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(message.trim());
      setMessage('');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium">Mon Cercle</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium">Mon Cercle</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {showJoinInput ? (
          <View style={styles.joinInputWrap}>
            <ThemedText variant="headlineMedium" color="textPrimary" style={styles.centeredText}>
              Entrez le code du cercle
            </ThemedText>
            <TextInput
              style={styles.codeInput}
              value={joiningCode}
              onChangeText={(t) => setJoiningCode(t.toUpperCase())}
              placeholder="EX: AB3C7DEF"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Pressable
              onPress={handleJoinCircle}
              disabled={isJoining}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed || isJoining ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                style={styles.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isJoining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.primaryBtnText}>Rejoindre</ThemedText>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setShowJoinInput(false)} style={styles.cancelBtn}>
              <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
            </Pressable>
          </View>
        ) : (
          <NoCercleScreen
            isPremium={isPremium}
            onCreateCircle={handleCreateCircle}
            onJoinCircle={() => setShowJoinInput(true)}
          />
        )}

        {isCreating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.accent} size="large" />
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>
              Création du cercle…
            </ThemedText>
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.root, { paddingTop: topPad }]}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium">Mon Cercle</ThemedText>
          <Pressable onPress={handleLeaveCircle} style={styles.leaveBtn}>
            <Feather name="log-out" size={18} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {isOffline && (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={13} color={Colors.caution} />
            <ThemedText variant="labelSmall" style={{ color: Colors.caution, marginLeft: 6 }}>
              Mode hors ligne — données mises en cache
            </ThemedText>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── CIRCLE HEADER ── */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card style={styles.circleCard} padding={Spacing.xl}>
              {/* Members avatars */}
              <View style={styles.membersRow}>
                {members.slice(0, 8).map((m, i) => (
                  <View key={m.id} style={[styles.memberAvatarWrap, { marginLeft: i > 0 ? -10 : 0 }]}>
                    <MemberAvatar member={m} size={38} />
                  </View>
                ))}
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: Spacing.md }}>
                  {members.length}/8 membres
                </ThemedText>
              </View>

              {/* Invite code */}
              <View style={styles.inviteRow}>
                <View style={styles.inviteCode}>
                  <ThemedText variant="labelSmall" color="textTertiary">CODE D'INVITATION</ThemedText>
                  <ThemedText variant="headlineMedium" color="accent" style={styles.codeText}>
                    {circle.invite_code}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="share-2" size={18} color={Colors.accentDark} />
                  <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>
                    Partager
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          </Animated.View>

          {/* ── GLOW SCORE DU CERCLE ── */}
          {glowScore > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(350)}>
              <Card style={styles.glowCard} padding={Spacing.xl}>
                <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.sm }}>
                  GLOW SCORE DU CERCLE
                </ThemedText>
                <View style={styles.glowRow}>
                  <ThemedText variant="headlineLarge" color="accent">{glowScore}</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">/100 en moyenne</ThemedText>
                </View>
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: Spacing.xs }}>
                  Bravo à toutes ! 🌿
                </ThemedText>
              </Card>
            </Animated.View>
          )}

          {/* ── CHALLENGE DE LA SEMAINE ── */}
          {weeklyChallenge && (
            <Animated.View entering={FadeInDown.delay(120).duration(350)}>
              <Card style={styles.challengeCard} padding={Spacing.xl}>
                <View style={styles.challengeHeader}>
                  <ThemedText style={{ fontSize: 20 }}>🏆</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelSmall" color="textTertiary">
                      CHALLENGE — {weeklyChallenge.weekLabel.toUpperCase()}
                    </ThemedText>
                    <ThemedText variant="bodyMedium" color="textPrimary" style={{ marginTop: 2 }}>
                      {weeklyChallenge.label}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.challengeProgress}>
                  {members.map((m) => {
                    const count = weeklyChallenge.progress[m.user_id] ?? 0;
                    const pct = Math.min(1, count / weeklyChallenge.goal);
                    return (
                      <View key={m.id} style={styles.challengeMemberRow}>
                        <MemberAvatar member={m} size={28} />
                        <ThemedText
                          variant="bodySmall"
                          color="textSecondary"
                          style={styles.challengeMemberName}
                          numberOfLines={1}
                        >
                          {m.first_name}
                        </ThemedText>
                        <View style={styles.progressBarWrap}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${pct * 100}%` }]} />
                          </View>
                        </View>
                        <ThemedText variant="bodySmall" color="textTertiary" style={styles.challengeCount}>
                          {count}/{weeklyChallenge.goal}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* ── FEED ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(350)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={styles.feedLabel}>
              ACTIVITÉ DU CERCLE
            </ThemedText>
            {feed.length === 0 ? (
              <EmptyFeed />
            ) : (
              <View style={{ gap: Spacing.md }}>
                {feed.map((entry) => (
                  <FeedCard
                    key={entry.id}
                    entry={entry}
                    userId={userId}
                    onReact={react}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* ── MESSAGE INPUT ── */}
        <View style={[styles.inputBar, { paddingBottom: bottomPad + Spacing.md }]}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Envoyer un message au cercle…"
            placeholderTextColor={Colors.textTertiary}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !message.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: pressed || !message.trim() ? 0.5 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,250,245,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleCard: {},

  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  memberAvatarWrap: {
    zIndex: 1,
  },

  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCode: {
    gap: 2,
  },
  codeText: {
    letterSpacing: 4,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },

  glowCard: {},
  glowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },

  challengeCard: {},
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  challengeProgress: {
    gap: Spacing.md,
  },
  challengeMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  challengeMemberName: {
    width: 60,
    flexShrink: 0,
  },
  progressBarWrap: {
    flex: 1,
  },
  progressBarBg: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  challengeCount: {
    width: 30,
    textAlign: 'right',
  },

  feedLabel: {
    marginBottom: Spacing.sm,
  },

  feedCard: {
    gap: Spacing.md,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
    flexShrink: 0,
  },
  feedAvatarInitial: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },

  reactionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.borderLight,
  },
  reactionBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },

  emptyFeed: {
    alignItems: 'center',
    paddingVertical: Spacing.massive,
    gap: Spacing.sm,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  messageInput: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
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

  noCercleRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  noCercleInner: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  noCercleEmoji: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  noCercleActions: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },

  primaryBtn: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.accentLight,
    backgroundColor: Colors.accentLight,
  },

  centeredText: {
    textAlign: 'center',
  },

  joinInputWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  codeInput: {
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    ...Shadows.soft,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
