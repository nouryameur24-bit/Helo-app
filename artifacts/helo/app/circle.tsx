import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { useCircle } from '@/hooks/useCircle';
import { createCircle, joinCircle, leaveCircle } from '@/lib/circleUtils';

import MemberAvatar from '@/components/circle/MemberAvatar';
import CircleFeedCard, { EmptyFeed } from '@/components/circle/CircleFeedCard';
import NoCercleScreen from '@/components/circle/NoCercleScreen';

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

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleCreateCircle = async () => {
    if (!isPremium) { requirePremium('circle'); return; }
    setIsCreating(true);
    try {
      await createCircle(userId, firstName || 'Anonyme');
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg !== 'PREMIUM_REQUIRED') Alert.alert('Erreur', msg);
    } finally { setIsCreating(false); }
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
    } finally { setIsJoining(false); }
  };

  const handleLeaveCircle = () => {
    if (!circle) return;
    const isOwner = circle.owner_id === userId;
    Alert.alert(
      isOwner ? 'Supprimer le cercle' : 'Quitter le cercle',
      isOwner ? 'En tant que créatrice, cela supprimera le cercle pour tout le monde.' : 'Voulez-vous quitter ce cercle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: isOwner ? 'Supprimer' : 'Quitter', style: 'destructive', onPress: async () => {
          try { await leaveCircle(userId, circle.id); await refresh(); }
          catch (err) { Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur'); }
        }},
      ],
    );
  };

  const handleShare = async () => {
    if (!circle?.invite_code) return;
    try {
      await Share.share({ message: `Rejoins mon cercle sur Hēlo ! Entre le code : ${circle.invite_code}` });
    } catch {
      Alert.alert('Code cercle', circle.invite_code);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try { await sendMessage(message.trim()); setMessage(''); }
    catch { Alert.alert('Erreur', "Impossible d'envoyer le message."); }
    finally { setSending(false); }
  };

  const Header = () => (
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.headerBtn}>
        <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
      </Pressable>
      <ThemedText variant="headlineMedium">Mon Cercle</ThemedText>
      {circle ? (
        <Pressable onPress={handleLeaveCircle} style={s.headerBtn}>
          <Feather name="log-out" size={18} color={Colors.textTertiary} />
        </Pressable>
      ) : <View style={{ width: 40 }} />}
    </View>
  );

  if (isLoading) return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <Header />
      <View style={s.loadingCenter}><ActivityIndicator color={Colors.accent} size="large" /></View>
    </View>
  );

  if (!circle) return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <Header />
      {showJoinInput ? (
        <View style={s.joinWrap}>
          <ThemedText variant="headlineMedium" color="textPrimary" style={{ textAlign: 'center' }}>
            Entrez le code du cercle
          </ThemedText>
          <TextInput
            style={s.codeInput}
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
            style={({ pressed }) => [s.primaryBtn, { opacity: pressed || isJoining ? 0.7 : 1 }]}
          >
            <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={s.primaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {isJoining ? <ActivityIndicator color="#fff" /> : <ThemedText style={s.primaryText}>Rejoindre</ThemedText>}
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => setShowJoinInput(false)} style={s.cancelBtn}>
            <ThemedText variant="bodyMedium" color="textSecondary">Annuler</ThemedText>
          </Pressable>
        </View>
      ) : (
        <NoCercleScreen isPremium={isPremium} onCreateCircle={handleCreateCircle} onJoinCircle={() => setShowJoinInput(true)} />
      )}
      {isCreating && (
        <View style={s.overlay}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: Spacing.md }}>Création du cercle…</ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.root, { paddingTop: topPad }]}>
        <Header />

        {isOffline && (
          <View style={s.offlineBanner}>
            <Feather name="wifi-off" size={13} color={Colors.caution} />
            <ThemedText variant="labelSmall" style={{ color: Colors.caution, marginLeft: 6 }}>
              Mode hors ligne — données mises en cache
            </ThemedText>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card padding={Spacing.xl}>
              <View style={s.membersRow}>
                {members.slice(0, 8).map((m, i) => (
                  <View key={m.id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 1 }}>
                    <MemberAvatar member={m} size={38} />
                  </View>
                ))}
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: Spacing.md }}>
                  {members.length}/8 membres
                </ThemedText>
              </View>
              <View style={s.inviteRow}>
                <View>
                  <ThemedText variant="labelSmall" color="textTertiary">CODE D'INVITATION</ThemedText>
                  <ThemedText variant="headlineMedium" color="accent" style={{ letterSpacing: 4, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {circle.invite_code}
                  </ThemedText>
                </View>
                <Pressable onPress={handleShare} style={({ pressed }) => [s.shareBtn, { opacity: pressed ? 0.7 : 1 }]}>
                  <Feather name="share-2" size={18} color={Colors.accentDark} />
                  <ThemedText variant="labelLarge" style={{ color: Colors.accentDark }}>Partager</ThemedText>
                </Pressable>
              </View>
            </Card>
          </Animated.View>

          {glowScore > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(350)}>
              <Card padding={Spacing.xl}>
                <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.sm }}>GLOW SCORE DU CERCLE</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
                  <ThemedText variant="headlineLarge" color="accent">{glowScore}</ThemedText>
                  <ThemedText variant="bodySmall" color="textTertiary">/100 en moyenne</ThemedText>
                </View>
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: Spacing.xs }}>Bravo à toutes ! 🌿</ThemedText>
              </Card>
            </Animated.View>
          )}

          {weeklyChallenge && (
            <Animated.View entering={FadeInDown.delay(120).duration(350)}>
              <Card padding={Spacing.xl}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
                  <ThemedText style={{ fontSize: 20 }}>🏆</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="labelSmall" color="textTertiary">CHALLENGE — {weeklyChallenge.weekLabel.toUpperCase()}</ThemedText>
                    <ThemedText variant="bodyMedium" color="textPrimary" style={{ marginTop: 2 }}>{weeklyChallenge.label}</ThemedText>
                  </View>
                </View>
                {members.map((m) => {
                  const count = weeklyChallenge.progress[m.user_id] ?? 0;
                  const pct = Math.min(1, count / weeklyChallenge.goal);
                  return (
                    <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 }}>
                      <MemberAvatar member={m} size={28} />
                      <ThemedText variant="bodySmall" color="textSecondary" style={{ width: 60 }} numberOfLines={1}>{m.first_name}</ThemedText>
                      <View style={{ flex: 1, height: 6, borderRadius: Radius.full, backgroundColor: Colors.accentLight, overflow: 'hidden' }}>
                        <View style={{ height: '100%', borderRadius: Radius.full, backgroundColor: Colors.accent, width: `${pct * 100}%` }} />
                      </View>
                      <ThemedText variant="bodySmall" color="textTertiary" style={{ width: 30, textAlign: 'right' }}>{count}/{weeklyChallenge.goal}</ThemedText>
                    </View>
                  );
                })}
              </Card>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(160).duration(350)}>
            <ThemedText variant="labelSmall" color="textTertiary" style={{ marginBottom: Spacing.sm }}>ACTIVITÉ DU CERCLE</ThemedText>
            {feed.length === 0 ? <EmptyFeed /> : (
              <View style={{ gap: Spacing.md }}>
                {feed.map((entry) => (
                  <CircleFeedCard key={entry.id} entry={entry} userId={userId} onReact={react} />
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={[s.inputBar, { paddingBottom: bottomPad + Spacing.md }]}>
          <TextInput
            style={s.msgInput}
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
            style={({ pressed }) => [s.sendBtn, { opacity: pressed || !message.trim() ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,168,83,0.12)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xl },
  membersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.accentLight, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: Colors.surface },
  msgInput: { flex: 1, height: 44, borderRadius: Radius.full, backgroundColor: Colors.borderLight, paddingHorizontal: Spacing.lg, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: Colors.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', ...Shadows.soft },
  joinWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  codeInput: { height: 56, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.accent, paddingHorizontal: Spacing.xl, fontSize: 22, letterSpacing: 6, textAlign: 'center', color: Colors.textPrimary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  primaryBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: Radius.full },
  primaryText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,250,245,0.9)', alignItems: 'center', justifyContent: 'center' },
});
