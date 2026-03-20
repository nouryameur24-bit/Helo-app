import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Feather name="check-circle" size={12} color={Colors.accent} />
      <ThemedText variant="labelSmall" style={styles.verifiedText}>
        Vérifié par l'équipe Hēlo
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

function SubmissionCard({ item }: { item: CommunitySubmission }) {
  return (
    <Card style={styles.card} padding={0}>
      <View style={styles.cardContent}>
        {item.product_photo_url ? (
          <Image
            source={{ uri: item.product_photo_url }}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Feather name="package" size={24} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <VerifiedBadge />
          <ThemedText variant="labelLarge" color="textPrimary" numberOfLines={1} style={{ marginTop: 4 }}>
            {item.name}
          </ThemedText>
          {item.brand ? (
            <ThemedText variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {item.brand}
            </ThemedText>
          ) : null}
          <View style={styles.cardFooter}>
            <CategoryChip category={item.category} />
            <ThemedText variant="bodySmall" color="textTertiary">
              {formatDate(item.submitted_at)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );
}

function EmptyState() {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Feather name="users" size={36} color={Colors.accentLight} />
      </View>
      <ThemedText variant="headlineMedium" style={styles.emptyTitle}>
        Soyez la première !
      </ThemedText>
      <ThemedText variant="bodyMedium" color="textSecondary" style={styles.emptySubtitle}>
        Les produits soumis par la communauté et vérifiés par notre équipe apparaîtront ici.
        Contribuez en scannant un produit inconnu.
      </ThemedText>
    </Animated.View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = useCallback(async () => {
    if (!isSupabaseConfigured) {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SubmissionCard item={item} />}
        contentContainerStyle={{
          paddingTop: topPadding + Spacing.lg,
          paddingBottom: bottomPadding + 120,
          paddingHorizontal: Spacing.xl,
          gap: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.header}>
            <ThemedText variant="headlineLarge" color="textPrimary">
              Communauté
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginTop: 4 }}>
              Produits vérifiés ajoutés par la communauté
            </ThemedText>
          </Animated.View>
        }
        ListEmptyComponent={loading ? null : <EmptyState />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    marginBottom: Spacing.xl,
  },
  card: {
    overflow: 'hidden',
    ...Shadows.soft,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  productImage: {
    width: 72,
    height: 72,
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
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: Colors.accent,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  categoryChip: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  categoryChipText: {
    color: Colors.accentDark,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.giant,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accentLight,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
