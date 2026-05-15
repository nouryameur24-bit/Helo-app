import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { logError } from '@/lib/logger';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { matchIngredients, getVerdict, ghostCaptureSave } from '@/lib/productLookup';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import type { Phase } from '@/types';
import { processOCRImage, cleanOCRText, parseINCI } from '@/lib/ocr';
import type { ProductData, MatchResult, VerdictResult } from '@/types';

const CATEGORIES = ['Cosmétique', 'Soin corps', 'Cheveux', 'Maquillage', 'Autre'] as const;
type Category = typeof CATEGORIES[number];

// ─── Category picker ──────────────────────────────────────────────────────────
function CategoryPicker({
  selected,
  onChange,
}: {
  selected: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <View style={catStyles.row}>
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          activeOpacity={0.75}
          style={[catStyles.chip, selected === c && catStyles.chipActive]}
        >
          <ThemedText
            variant="bodySmall"
            style={{ color: selected === c ? '#fff' : Colors.textSecondary }}
          >
            {c}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
});

// ─── Warning card ─────────────────────────────────────────────────────────────
function WarningCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={warnStyles.card} padding={Spacing.lg}>
      <View style={warnStyles.row}>
        <Feather name="alert-triangle" size={20} color={Colors.caution} />
        <ThemedText variant="bodyMedium" style={warnStyles.text}>{message}</ThemedText>
      </View>
      <TouchableOpacity onPress={onRetry} style={warnStyles.retry}>
        <ThemedText variant="bodySmall" style={{ color: Colors.accent }}>Réessayer →</ThemedText>
      </TouchableOpacity>
    </Card>
  );
}

const warnStyles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, color: Colors.textSecondary },
  retry: { marginTop: Spacing.md, alignSelf: 'flex-end' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OcrReviewScreen() {
  const { imageUri, base64, ghostBarcode } = useLocalSearchParams<{ imageUri: string; base64?: string; ghostBarcode?: string }>();
  const insets = useSafeAreaInsets();

  const [ocrText, setOcrText] = useState('');
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('Cosmétique');
  const [ocrLoading, setOcrLoading] = useState(true);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const hasRun = useRef(false);

  const uri = imageUri ? decodeURIComponent(imageUri) : '';
  const b64 = base64 ? decodeURIComponent(base64) : '';

  const runOCR = async () => {
    setOcrLoading(true);
    setOcrWarning(null);
    try {
      if (!b64) throw new Error('NO_TEXT_DETECTED');
      const raw = await processOCRImage(b64);
      const cleaned = cleanOCRText(raw);
      const ingredients = parseINCI(cleaned);
      setOcrText(cleaned);
      setParsedCount(ingredients.length);
      if (ingredients.length < 3) {
        setOcrWarning(
          `Seuls ${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''} détecté${ingredients.length > 1 ? 's' : ''}. Vous pouvez corriger le texte ci-dessus.`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg.includes('NO_TEXT_DETECTED') || msg.includes('NO_API_KEY')) {
        setOcrWarning(
          msg.includes('NO_API_KEY')
            ? 'Clé Google Vision manquante. Saisissez la liste manuellement.'
            : 'Nous n\'avons pas pu lire le texte. Essayez avec plus de lumière ou un angle différent.',
        );
      } else {
        setOcrWarning('Erreur lors de l\'analyse OCR. Saisissez la liste manuellement.');
      }
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runOCR();
    // Intentional one-shot effect — hasRun.current ref prevents double execution in StrictMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyse = async () => {
    if (!ocrText.trim()) return;
    setAnalysing(true);
    try {
      const cleaned = cleanOCRText(ocrText);
      const ingredients = parseINCI(cleaned);

      // Get phase from user profile (breastfeeding takes priority)
      let phase: Phase = 2;
      try {
        const isBF = await getBreastfeedingMode();
        if (isBF) {
          phase = 'breastfeeding';
        } else {
          const raw = await AsyncStorage.getItem('user_profile');
          if (raw) {
            const p = JSON.parse(raw);
            if (p.trimester) phase = p.trimester as Phase;
          }
        }
      } catch (err) {
        // Profile read failure — OCR analysis continues with default phase
        logError('ocrReview.readProfile', err);
      }

      const matchesArr = await matchIngredients(ingredients, phase);
      const verdictResult = getVerdict(matchesArr);

      // Build a fake ProductData from user inputs
      const product: ProductData = {
        barcode: `ocr_${Date.now()}`,
        name: productName.trim() || 'Produit analysé par OCR',
        brand: brand.trim() || undefined,
        imageUrl: uri || undefined,
        ingredientsList: ingredients,
        categories: [category],
        nutriscore: null,
        ecoscore: null,
      };

      // Persist to AsyncStorage
      const id = `${Date.now()}`;
      const key = `@helo_ocr_${id}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        product,
        matches: matchesArr,
        verdict: verdictResult,
        isOCR: true,
        savedAt: Date.now(),
      }));

      // Navigate to verdict with ocr_ prefix; pass ghostThanks param so the
      // verdict screen renders the "merci" toast over its content.
      const verdictPath = `/verdict/${encodeURIComponent(`ocr_${id}`)}`;
      router.replace(ghostBarcode ? `${verdictPath}?ghostThanks=1` : verdictPath);

      // ── Ghost Capture: background save (fire-and-forget) ──────────────────
      if (ghostBarcode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((err) => {
          logError('ocrReview.haptics', err);
        });
        ghostCaptureSave({
          barcode: ghostBarcode,
          productName: product.name,
          category,
          ocrText: cleaned,
          verdict: verdictResult,
          trimester: phase,
        }).catch((err) => {
          logError('ocrReview.ghostCaptureSave', err);
        });
      }
    } catch (err) {
      logError('ocrReview.analyse', err);
      setAnalysing(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
        </TouchableOpacity>
        <ThemedText variant="headlineMedium">Vérifier les ingrédients</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Captured image */}
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.capturedImage}
            contentFit="contain"
          />
        ) : null}

        {/* OCR status / warning */}
        {ocrLoading && (
          <View style={styles.ocrLoadingRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: Spacing.sm }}>
              Lecture du texte en cours…
            </ThemedText>
          </View>
        )}

        {!ocrLoading && ocrWarning && (
          <WarningCard message={ocrWarning} onRetry={runOCR} />
        )}

        {!ocrLoading && parsedCount !== null && parsedCount >= 3 && (
          <View style={styles.successRow}>
            <Feather name="check-circle" size={16} color={Colors.safe} />
            <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: 6 }}>
              {parsedCount} ingrédients détectés
            </ThemedText>
          </View>
        )}

        {/* OCR text (editable) */}
        <View style={styles.fieldGroup}>
          <ThemedText variant="labelLarge" style={styles.fieldLabel}>Texte détecté</ThemedText>
          <TextInput
            style={styles.textArea}
            value={ocrText}
            onChangeText={setOcrText}
            multiline
            placeholder="La liste d'ingrédients apparaîtra ici. Vous pouvez la corriger."
            placeholderTextColor={Colors.textTertiary}
            textAlignVertical="top"
            scrollEnabled={false}
          />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.fieldHint}>
            Format INCI : ingrédients séparés par des virgules
          </ThemedText>
        </View>

        {/* Product name */}
        <View style={styles.fieldGroup}>
          <ThemedText variant="labelLarge" style={styles.fieldLabel}>Nom du produit</ThemedText>
          <TextInput
            style={styles.textInput}
            value={productName}
            onChangeText={setProductName}
            placeholder="Ex: Crème hydratante Nivea"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
          />
        </View>

        {/* Brand */}
        <View style={styles.fieldGroup}>
          <ThemedText variant="labelLarge" style={styles.fieldLabel}>
            Marque{' '}
            <ThemedText variant="bodySmall" color="textTertiary">(optionnel)</ThemedText>
          </ThemedText>
          <TextInput
            style={styles.textInput}
            value={brand}
            onChangeText={setBrand}
            placeholder="Ex: Nivea, L'Oréal…"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="done"
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <ThemedText variant="labelLarge" style={styles.fieldLabel}>Catégorie</ThemedText>
          <CategoryPicker selected={category} onChange={setCategory} />
        </View>

        {/* Info badge */}
        <View style={styles.infoBadge}>
          <Feather name="info" size={14} color={Colors.accent} />
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: 6, flex: 1 }}>
            L'analyse sera adaptée à votre trimestre actuel et évaluera chaque ingrédient détecté.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad + Spacing.md }]}>
        <Button
          variant="primary"
          fullWidth
          onPress={handleAnalyse}
          disabled={!ocrText.trim() || analysing}
          loading={analysing}
        >
          {ghostBarcode ? 'Analyser & Contribuer' : 'Analyser les ingrédients'}
        </Button>
        {ghostBarcode ? (
          <ThemedText
            variant="bodySmall"
            color="textTertiary"
            style={{ textAlign: 'center', marginTop: Spacing.sm }}
          >
            En analysant, vous aidez anonymement la communauté Hēlo 🤝
          </ThemedText>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.xl },

  capturedImage: {
    width: '100%',
    height: 250,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },

  ocrLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },

  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { color: Colors.textPrimary },
  fieldHint: { marginTop: 2 },

  textArea: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    minHeight: 140,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    height: 52,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: Typography.bodyMedium.fontSize,
    color: Colors.textPrimary,
  },

  infoBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: 6,
  },

  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.medium,
  },
});
