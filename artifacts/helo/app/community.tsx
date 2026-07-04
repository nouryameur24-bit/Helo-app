import { styles } from './communityStyles';
import { Image } from 'expo-image';
import { ROUTES } from '@/types/routes';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { ComingSoonScreen } from '@/components/ComingSoonScreen';
import React, { type ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
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
          ? 'Tu es hors-ligne — les produits vérifiés ne sont pas disponibles.'
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
                Partage tes scans avec tes proches en temps réel
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
          { icon: 'camera', step: '1', text: 'Scanne un produit inconnu avec Hēlo' },
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
  if (!isFeatureEnabled('community')) {
    return (
      <ComingSoonScreen
        title="La Communauté Hēlo"
        subtitle="Disponible en v1.1"
        emoji="🌸"
        description="Un fil bienveillant entre mamans, modéré par des sages-femmes. Patience, on prépare un espace safe."
      />
    );
  }
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
