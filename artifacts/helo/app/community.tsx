import { Image } from 'expo-image';
import { ROUTES } from '@/types/routes';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { isFeatureEnabled } from '@/constants/featureFlags';
import React, { type ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useOffline } from '@/hooks/useOffline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunitySubmission {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: 'cosmetic' | 'food' | 'medication';
  product_photo_url: string;
  submitted_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cosmetic: 'Cosmétique',
  food: 'Alimentaire',
  medication: 'Médicament',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// ─── Supabase unavailable banner ──────────────────────────────────────────────

function SupabaseUnavailableBanner({ isOffline }: { isOffline: boolean }) {
  return (
    <View style={styles.supabaseBanner}>
      <Feather name={isOffline ? 'wifi-off' : 'cloud-off'} size={15} color={Colors.textSecondary} />
      <ThemedText variant="bodySmall" color="textSecondary" style={styles.supabaseBannerText}>
        {isOffline
          ? 'Vous êtes hors-ligne — les produits vérifiés ne sont pas disponibles.'
          : 'Fonctionnalités communautaires désactivées dans cet environnement.'}
      </ThemedText>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Feather name="check-circle" size={11} color={Colors.accent} />
      <ThemedText variant="labelSmall" style={styles.verifiedText}>
        Vérifié Hēlo
      </ThemedText>
    </View>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <View style={styles.categoryChip}>
      <ThemedText variant="labelSmall" style={styles.categoryChipText}>
        {CATEGORY_LABELS[category] ?? category}
      </ThemedText>
    </View>
  );
}

const SubmissionCard = React.memo(function SubmissionCard({
  item,
}: {
  item: CommunitySubmission;
}) {
  return (
    <Card style={styles.productCard} padding={0}>
      <View style={styles.productCardContent}>
        {item.product_photo_url ? (
          <Image
            source={{ uri: item.product_photo_url }}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Feather name="package" size={22} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.productCardInfo}>
          <VerifiedBadge />
          <ThemedText
            variant="labelLarge"
            color="textPrimary"
            numberOfLines={1}
            style={styles.submissionCardName}
          >
            {item.name}
          </ThemedText>
          {item.brand ? (
            <ThemedText variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {item.brand}
            </ThemedText>
          ) : null}
          <View style={styles.productCardFooter}>
            <CategoryChip category={item.category} />
            <ThemedText variant="bodySmall" color="textTertiary">
              {formatDate(item.submitted_at)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );
});

// ─── Circle card ──────────────────────────────────────────────────────────────

function CircleCard() {
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(450)}>
      <Pressable
        onPress={() => router.push(ROUTES.circle)}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Mon Cercle"
      >
        <LinearGradient
          colors={['#2D2926', '#4A3F38']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circleCard}
        >
          {/* Decoration circles */}
          <View style={styles.circleDecor1} />
          <View style={styles.circleDecor2} />

          <View style={styles.circleCardContent}>
            <View style={styles.circleIconWrap}>
              <Feather name="users" size={22} color={Colors.accent} />
            </View>
            <View style={styles.circleCardBody}>
              <ThemedText style={styles.circleCardTitle}>Mon Cercle</ThemedText>
              <ThemedText style={styles.circleCardSub}>
                Partagez vos scans avec vos proches en temps réel
              </ThemedText>
            </View>
            <View style={styles.circleArrow}>
              <Feather name="arrow-right" size={16} color={Colors.accent} />
            </View>
          </View>

          {/* Features row */}
          <View style={styles.circleFeatures}>
            {['Scans partagés', 'Chat privé', 'Réactions'].map((f) => (
              <View key={f} style={styles.circleFeatureChip}>
                <ThemedText style={styles.circleFeatureText}>{f}</ThemedText>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Contribute card ──────────────────────────────────────────────────────────

function ContributeCard() {
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(450)}>
      <Pressable
        onPress={() => router.push(ROUTES.submitProduct)}
        style={({ pressed }) => [
          styles.contributeCard,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un produit"
      >
        <View style={styles.contributeIcon}>
          <Feather name="plus-circle" size={20} color={Colors.accentDark} />
        </View>
        <View style={styles.contributeBody}>
          <ThemedText variant="labelLarge" color="textPrimary">
            Ajouter un produit
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={styles.contributeSubtext}>
            Soumettez un produit inconnu pour enrichir la base
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty state for submissions ──────────────────────────────────────────────

function EmptySubmissions() {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(500)}
      style={styles.emptyWrap}
    >
      {/* How it works */}
      <ThemedText
        variant="labelLarge"
        color="textSecondary"
        style={styles.howItWorksTitle}
      >
        Comment ça marche ?
      </ThemedText>

      {(
        [
          { icon: 'camera', step: '1', text: 'Scannez un produit inconnu avec Hēlo' },
          { icon: 'send', step: '2', text: 'Soumettez-le via le bouton ci-dessus' },
          { icon: 'check-circle', step: '3', text: "Notre \u00e9quipe v\u00e9rifie et l\u2019ajoute ici" },
        ] as Array<{ icon: ComponentProps<typeof Feather>['name']; step: string; text: string }>
      ).map(({ icon, step, text }) => (
        <View key={step} style={styles.stepRow}>
          <View style={styles.stepBubble}>
            <Feather name={icon} size={16} color={Colors.accent} />
          </View>
          <ThemedText variant="bodyMedium" color="textSecondary" style={styles.stepText}>
            {text}
          </ThemedText>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Header component ─────────────────────────────────────────────────────────

interface ListHeaderProps {
  showUnavailableBanner: boolean;
  isOffline: boolean;
}

function ListHeader({ showUnavailableBanner, isOffline }: ListHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Title */}
      <Animated.View entering={FadeIn.delay(0).duration(400)} style={styles.titleRow}>
        <ThemedText variant="headlineLarge" color="textPrimary">
          Communauté
        </ThemedText>
      </Animated.View>

      {/* Supabase / offline indicator */}
      {showUnavailableBanner && <SupabaseUnavailableBanner isOffline={isOffline} />}

      {/* Circle card */}
      <CircleCard />

      {/* Contribute card */}
      <ContributeCard />

      {/* Section header */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={styles.sectionRow}
      >
        <ThemedText variant="headlineMedium" color="textPrimary">
          Produits vérifiés
        </ThemedText>
        <View style={styles.sectionBadge}>
          <Feather name="shield" size={12} color={Colors.accent} />
          <ThemedText style={styles.sectionBadgeText}>Approuvés par Hēlo</ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  if (!isFeatureEnabled('community')) return <Redirect href="/" />;
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const { isOffline } = useOffline();

  const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const showUnavailableBanner = !isSupabaseConfigured || isOffline;

  const loadSubmissions = useCallback(async () => {
    if (!isSupabaseConfigured || isOffline) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('community_submissions')
        .select('id, barcode, name, brand, category, product_photo_url, submitted_at')
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        setSubmissions(data as CommunitySubmission[]);
      }
    } catch {
      // Supabase fetch failure — community list shows empty state
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const listHeader = (
    <ListHeader showUnavailableBanner={showUnavailableBanner} isOffline={isOffline} />
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
            <SubmissionCard item={item} />
          </Animated.View>
        )}
        maxToRenderPerBatch={10}
        initialNumToRender={6}
        removeClippedSubviews
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPadding + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loading ? null : <EmptySubmissions />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  listContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },

  // ── Supabase unavailable banner ───────────────────────────────────────────────
  supabaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supabaseBannerText: {
    flex: 1,
    lineHeight: 18,
  },

  header: {
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  titleRow: {
    marginBottom: Spacing.xs,
  },

  // ── Circle card ──────────────────────────────────────────────────────────────
  circleCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  circleDecor1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
    opacity: 0.08,
    right: -20,
    top: -30,
  },
  circleDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    opacity: 0.06,
    right: 40,
    bottom: -20,
  },
  circleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  circleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,169,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCardBody: { flex: 1 },
  circleCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  circleCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  circleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201,169,110,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFeatures: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  circleFeatureChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  circleFeatureText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'PlusJakartaSans_500Medium',
  },

  // ── Contribute card ──────────────────────────────────────────────────────────
  contributeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  contributeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributeBody: { flex: 1 },
  contributeSubtext: { marginTop: 2 },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: Colors.accentDark,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // ── Product cards ──────────────────────────────────────────────────────────
  productCard: {
    overflow: 'hidden',
    ...Shadows.soft,
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundSecondary,
    flexShrink: 0,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submissionCardName: { marginTop: 3 },
  productCardInfo: {
    flex: 1,
    gap: 2,
  },
  productCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0,
    textTransform: 'none',
  },
  categoryChip: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  categoryChipText: {
    color: Colors.accentDark,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0,
    textTransform: 'none',
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  howItWorksTitle: { marginBottom: Spacing.lg, textAlign: 'center' },
  stepText: { flex: 1, lineHeight: 20 },
  emptyWrap: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  stepBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
