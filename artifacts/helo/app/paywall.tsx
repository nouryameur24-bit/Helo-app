import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { AnimatedMeshGradient } from '@/components/ui/AnimatedMeshGradient';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { PLANS, type PlanId, type Plan } from '@/lib/purchases';
import { usePremium } from '@/hooks/usePremium';
import { track } from '@/lib/analytics';

// ─── Feature comparison data ──────────────────────────────────────────────────

interface Feature {
  label: string;
  free: boolean;
  premium: boolean;
}

const FEATURES: Feature[] = [
  { label: 'Scans par jour',              free: false, premium: true  }, // "5/jour" vs "illimité"
  { label: 'Détails ingrédients',         free: false, premium: true  },
  { label: 'Alternatives sûres',          free: false, premium: true  },
  { label: 'Recherche par nom',           free: false, premium: true  },
  { label: 'OCR — photo ingrédients',     free: false, premium: true  },
  { label: 'Placard illimité',            free: false, premium: true  },
  { label: 'Mode hors ligne',             free: false, premium: true  },
  { label: 'Badge Premium ✦',            free: false, premium: true  },
  { label: 'Analyses basiques',           free: true,  premium: true  },
  { label: 'Weekly Brief',               free: true,  premium: true  },
  // V1: Communauté masquée, réactiver pour V2
  // { label: 'Communauté',                 free: true,  premium: true  },
];

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        pc.wrap,
        plan.highlight && pc.wrapHighlight,
        selected && pc.wrapSelected,
        { opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* Badge */}
      {plan.badge && (
        <View style={[pc.badge, plan.highlight && pc.badgeGold]}>
          <ThemedText style={[pc.badgeText, plan.highlight && pc.badgeTextGold]}>
            {plan.badge}
          </ThemedText>
        </View>
      )}

      <View style={pc.inner}>
        {/* Radio */}
        <View style={[pc.radio, selected && pc.radioSelected]}>
          {selected && <View style={pc.radioDot} />}
        </View>

        {/* Labels */}
        <View style={{ flex: 1 }}>
          <ThemedText variant="labelLarge" color="textPrimary">{plan.label}</ThemedText>
          {plan.trial && (
            <View style={pc.trialBadge}>
              <ThemedText style={pc.trialText}>{plan.trial}</ThemedText>
            </View>
          )}
        </View>

        {/* Pricing */}
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText variant="headlineMedium" color="textPrimary">{plan.price}</ThemedText>
          {plan.pricePerMonth && (
            <ThemedText variant="bodySmall" color="textTertiary">{plan.pricePerMonth}</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(280)}
      style={fr.row}
    >
      <ThemedText variant="bodyMedium" color="textSecondary" style={{ flex: 1 }}>
        {feature.label === 'Scans par jour' ? (
          <>
            <ThemedText variant="bodyMedium" color="textSecondary">Scans par jour</ThemedText>
          </>
        ) : feature.label}
      </ThemedText>
      {/* Free col */}
      <View style={fr.col}>
        {feature.label === 'Scans par jour' ? (
          <ThemedText style={fr.limitText}>5/j</ThemedText>
        ) : feature.free ? (
          <Feather name="check" size={16} color={Colors.safe} />
        ) : (
          <Feather name="x" size={16} color={Colors.textTertiary} />
        )}
      </View>
      {/* Premium col */}
      <View style={fr.col}>
        {feature.label === 'Scans par jour' ? (
          <ThemedText style={fr.unlimitedText}>∞</ThemedText>
        ) : (
          <Feather name="check" size={16} color={Colors.safe} />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const { purchase, restore, isPremium } = usePremium();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Already premium — shouldn't be here, go back (must be in useEffect, not during render)
  useEffect(() => {
    if (isPremium) {
      router.back();
    }
  }, [isPremium]);

  // Analytics : un seul `paywall_viewed` par mount du screen. Inclut le
  // déclencheur (`scan_limit`, `feature`, etc.) pour mesurer la conversion
  // par source — utile pour décider quels gates renforcer.
  useEffect(() => {
    track('paywall_viewed', { trigger: trigger ?? 'direct' }).catch(() => {});
  }, [trigger]);

  const triggerMessages: Record<string, string> = {
    scan_limit:   'Vous avez atteint vos 5 scans gratuits du jour.',
    feature:      'Fonctionnalité réservée aux abonnées Premium.',
    shelf_limit:  'Le placard gratuit est limité à 20 produits.',
    search:       'La recherche par nom est réservée aux abonnées Premium.',
    ocr:          'L\'analyse par photo est réservée aux abonnées Premium.',
    scan_party:   'Scan Party est réservé aux abonnées Premium.',
    shelf_scan:   'Le scan d\'étagère est réservé aux abonnées Premium.',
    voyage:       'Le Mode Voyage est réservé aux abonnées Premium.',
  };
  const triggerMsg = trigger ? (triggerMessages[trigger] ?? null) : null;

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const success = await purchase(selectedPlan);
      if (success) {
        track('paywall_purchased', {
          plan: selectedPlan,
          trigger: trigger ?? 'direct',
        }).catch(() => {});
        router.back();
      }
    } catch {
      Alert.alert(
        'Achat impossible',
        'Impossible de traiter votre achat. Vérifiez votre connexion et réessayez.',
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const success = await restore();
      if (success) {
        Alert.alert('Achats restaurés', 'Votre abonnement Premium a été rétabli.');
        router.back();
      } else {
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement Premium actif trouvé sur ce compte.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de restaurer vos achats. Réessayez plus tard.');
    } finally {
      setRestoring(false);
    }
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <View style={[s.root, { backgroundColor: Colors.background }]}>
      {/* Close button */}
      <View style={[s.closeRow, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => {
            track('paywall_dismissed', { trigger: trigger ?? 'direct', selected_plan: selectedPlan }).catch(() => {});
            router.back();
          }}
          style={s.closeBtn}
        >
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header — mesh animé (v4 design polish) */}
        <AnimatedMeshGradient
          colors={[Colors.accentLight, '#e8c98a', Colors.accentLight]}
          style={s.hero}
        >
          <View style={s.heroCrown}>
            <ThemedText style={s.crownEmoji}>👑</ThemedText>
          </View>
          <ThemedText variant="displayMedium" style={s.heroTitle}>
            Hēlo Premium
          </ThemedText>
          <ThemedText variant="bodyMedium" style={s.heroSub}>
            Protégez votre grossesse sans compromis
          </ThemedText>
          {triggerMsg && (
            <View style={s.triggerBanner}>
              <Feather name="info" size={14} color={Colors.accentDark} />
              <ThemedText variant="bodySmall" style={s.triggerText}>{triggerMsg}</ThemedText>
            </View>
          )}
        </AnimatedMeshGradient>

        {/* Comparison table */}
        <View style={s.section}>
          {/* Column headers */}
          <View style={fr.header}>
            <View style={{ flex: 1 }} />
            <View style={fr.colHeader}>
              <ThemedText style={fr.colHeaderText}>Gratuit</ThemedText>
            </View>
            <View style={[fr.colHeader, fr.colHeaderPremium]}>
              <ThemedText style={[fr.colHeaderText, { color: Colors.accentDark }]}>Premium</ThemedText>
            </View>
          </View>
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.label} feature={f} index={i} />
          ))}
        </View>

        {/* Plans */}
        <View style={s.section}>
          <ThemedText variant="labelLarge" color="textPrimary" style={s.sectionTitle}>
            Choisissez votre formule
          </ThemedText>
          <View style={s.plans}>
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <Pressable
            style={({ pressed }) => [s.ctaBtn, { opacity: purchasing || pressed ? 0.85 : 1 }]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={s.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText
                  style={s.ctaText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {selectedPlanData.trial
                    ? `Commencer mon essai gratuit (${selectedPlanData.trial})`
                    : `Obtenir Premium — ${selectedPlanData.price}`}
                </ThemedText>
              )}
            </LinearGradient>
          </Pressable>

          {/* Restore */}
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={({ pressed }) => [s.restoreBtn, { opacity: restoring || pressed ? 0.6 : 1 }]}
          >
            {restoring ? (
              <ActivityIndicator color={Colors.textTertiary} size="small" />
            ) : (
              <ThemedText variant="bodySmall" color="textTertiary">
                Restaurer mes achats
              </ThemedText>
            )}
          </Pressable>

          {/* Legal */}
          <ThemedText variant="bodySmall" color="textTertiary" style={s.legal}>
            {Platform.OS === 'ios'
              ? 'Paiement débité sur votre compte Apple ID à confirmation d\'achat. Renouvelable automatiquement. Gérez vos abonnements dans les Réglages.'
              : 'Paiement via Google Play. Abonnement renouvelable. Gérez-le dans les paramètres Google Play.'}
            {'\n'}
            Annulable à tout moment · CGU · Confidentialité
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  closeRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { gap: 0 },
  hero: {
    padding: Spacing.xxl,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  heroCrown: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  crownEmoji: { fontSize: 32 },
  heroTitle: {
    color: Colors.accentDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroSub: {
    color: Colors.accentDark,
    textAlign: 'center',
    opacity: 0.8,
  },
  triggerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  triggerText: { color: Colors.accentDark, flex: 1 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  sectionTitle: { marginBottom: Spacing.md },
  plans: { gap: Spacing.md },
  ctaWrap: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaBtn: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  ctaGrad: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  ctaText: { ...Typography.labelLarge, color: '#fff', fontSize: 16 },
  restoreBtn: { paddingVertical: Spacing.sm },
  legal: {
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 10,
    paddingHorizontal: Spacing.lg,
  },
});

const pc = StyleSheet.create({
  wrap: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  wrapHighlight: {
    borderColor: Colors.accentLight,
    backgroundColor: '#FFFDF8',
  },
  wrapSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  badgeGold: {
    backgroundColor: Colors.accent,
  },
  badgeText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  badgeTextGold: { color: '#fff' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.accent },
  radioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  trialBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  trialText: { ...Typography.labelSmall, color: Colors.safe, fontSize: 10 },
});

const fr = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  colHeader: {
    width: 72, alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  colHeaderPremium: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.sm,
    paddingVertical: 3,
  },
  colHeaderText: { ...Typography.labelSmall, color: Colors.textTertiary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  col: { width: 72, alignItems: 'center' },
  limitText: { ...Typography.labelSmall, color: Colors.textTertiary, fontSize: 11 },
  unlimitedText: { ...Typography.headlineMedium, color: Colors.safe },
});
