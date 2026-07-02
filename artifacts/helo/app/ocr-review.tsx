import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { logError } from '@/lib/logger';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { incrementContributionCount } from '@/lib/contributions';
import { useProfile } from '@/hooks/useProfile';
import { matchIngredients, getVerdict, ghostCaptureSave } from '@/lib/productLookup';
import { awardPoints, isFirstContributor, POINTS } from '@/lib/heloPoints';
import { cleanOcrTextRemote, analyzeIngredientsWithClaudeVision } from '@/lib/api';
import { track } from '@/lib/analytics';
import { getBreastfeedingMode } from '@/hooks/useBreastfeeding';
import type { Phase } from '@/types';
import { processOCRImage, cleanOCRText, parseINCI } from '@/lib/ocr';
import type { ProductData, MatchResult, VerdictResult } from '@/types';
import { STORAGE_KEYS, ocrResultKey } from '@/lib/storageKeys';

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
  // Lot 18-03 — userId passé au RPC ghost_capture_upsert pour rate limit
  // per-user (empêche le spam d'un même user sur le même produit).
  const { userId } = useProfile();

  const [ocrText, setOcrText] = useState('');
  const [category, setCategory] = useState<Category>('Cosmétique');
  const [ocrLoading, setOcrLoading] = useState(true);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const hasRun = useRef(false);

  const uri = imageUri ? decodeURIComponent(imageUri) : '';
  const b64 = base64 ? decodeURIComponent(base64) : '';

  const runOCR = async () => {
    if (ghostBarcode) {
      track('ghost_capture_initiated', { ghost_barcode: ghostBarcode }).catch(() => {});
    }
    setOcrLoading(true);
    setOcrWarning(null);
    try {
      if (!b64) throw new Error('NO_TEXT_DETECTED');

      // ── Lot 18-10 — Claude Vision direct (PRIMARY) ──────────────────────
      // On essaye Claude Vision EN PREMIER. Si succès avec confidence !== low
      // et au moins 1 ingrédient → on prend ce résultat (10× meilleur que OCR
      // classique, comprend le contexte malgré flou ou mauvaise photo).
      // Sinon → fallback vers Google Vision OCR + AI cleanup classique.
      try {
        const visionAnalysis = await analyzeIngredientsWithClaudeVision(b64, {
          locale: 'fr',
          // Note : phase intentionnellement non envoyée ici car runOCR
          // s'exécute avant qu'on lise le profil — c'est fait dans
          // handleAnalyse() au moment du matching avec la vraie phase.
          hintCategory: 'auto',
          imageMediaType: 'image/jpeg',
        });

        if (
          visionAnalysis &&
          visionAnalysis.confidence !== 'low' &&
          visionAnalysis.ingredients.length > 0
        ) {
          // Claude Vision a réussi → on utilise ses ingrédients
          const visionText = visionAnalysis.ingredients.join(', ');
          setOcrText(visionText);
          setParsedCount(visionAnalysis.ingredients.length);
          if (visionAnalysis.confidence === 'medium') {
            setOcrWarning(
              `Lecture avec confiance moyenne · vérifie les ingrédients ci-dessus.`,
            );
          }
          track('ghost_capture_vision_success', {
            ingredients_count: visionAnalysis.ingredients.length,
            confidence: visionAnalysis.confidence,
            category: visionAnalysis.category,
          }).catch(() => {});
          return;
        }
        // Claude Vision a renvoyé null/low confidence → fallback OCR
      } catch (visionErr) {
        // Erreur backend Vision → on bascule sur OCR classique sans bruit
        if (__DEV__) console.warn('[ocr-review] Claude Vision failed, falling back to OCR:', visionErr);
      }

      // ── Fallback : Google Vision OCR + AI cleanup classique ──────────────
      const { text: raw, confidence } = await processOCRImage(b64);
      const locallyCleaned = cleanOCRText(raw);

      // v4 Lot 10 — AI cleanup : Claude relit le texte OCR pour corriger
      // les fautes (lettres mal lues, accents perdus, mots collés). Fallback
      // gracieux : si l'endpoint rate ou backend non configuré, on garde le
      // texte nettoyé localement — pas de régression possible.
      const { cleaned: aiCleaned } = await cleanOcrTextRemote(locallyCleaned, 'auto');

      const ingredients = parseINCI(aiCleaned);
      setOcrText(aiCleaned);
      setParsedCount(ingredients.length);

      // ── Lot 18-05 : badge confidence si OCR pas fiable ─────────────────
      // Si Google Vision retourne une confiance < 85%, on prévient l'user
      // de vérifier le texte. Évite que des typos passent inaperçus.
      if (confidence !== undefined && confidence < 0.85 && ingredients.length >= 3) {
        const pct = Math.round(confidence * 100);
        setOcrWarning(
          `Confiance de lecture ${pct}% · vérifie les ingrédients ci-dessus avant d'analyser.`,
        );
      } else if (ingredients.length < 3) {
        setOcrWarning(
          `Seuls ${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''} détecté${ingredients.length > 1 ? 's' : ''}. Tu peux corriger le texte ci-dessus.`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      if (msg.includes('NO_TEXT_DETECTED') || msg.includes('NO_API_KEY')) {
        setOcrWarning(
          msg.includes('NO_API_KEY')
            ? 'Clé Google Vision manquante. Saisis la liste manuellement.'
            : 'Nous n\'avons pas pu lire le texte. Essaie avec plus de lumière ou un angle différent.',
        );
      } else {
        setOcrWarning('Erreur lors de l\'analyse OCR. Saisis la liste manuellement.');
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
          const raw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
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

      // Ghost Capture: deliver the verdict FIRST with a placeholder name.
      // The user is invited to optionally add name/brand on the verdict screen
      // (contribution card) after she has received the value she came for.
      const product: ProductData = {
        barcode: `ocr_${Date.now()}`,
        name: 'Produit scanné',
        brand: undefined,
        imageUrl: uri || undefined,
        ingredientsList: ingredients,
        categories: [category],
        nutriscore: null,
        ecoscore: null,
      };

      // Persist to AsyncStorage
      const id = `${Date.now()}`;
      const key = ocrResultKey(id);
      await AsyncStorage.setItem(key, JSON.stringify({
        product,
        matches: matchesArr,
        verdict: verdictResult,
        isOCR: true,
        savedAt: Date.now(),
      }));

      // Increment the LOCAL contribution counter BEFORE navigation when we
      // have a ghostBarcode (the only case that yields a real DB submission).
      // AsyncStorage read+write is fast (a few ms); doing it here means the
      // verdict screen receives the new count synchronously via URL param
      // and can render the reward toast on first paint without a re-read.
      let newContribCount: number | null = null;
      if (ghostBarcode) {
        try {
          newContribCount = await incrementContributionCount();
        } catch (err) {
          // Counter failure is non-critical — the toast simply won't include
          // the ordinal. ghostCaptureSave still runs and the DB row is created.
          logError('ocrReview.incrementContribution', err);
        }
      }

      // Hēlo Points (task #107 + audit fix) — Calcul unique partagé entre
      // l'URL param (toast verdict) et les awards effectifs (RPC Supabase).
      // Source unique de vérité pour éviter la divergence URL/RPC.
      const productHasName = Boolean(
        product.name && product.name !== 'Produit' && product.name.trim().length > 2,
      );
      const basePointsSteps: { amount: number; reason: 'scan_new_barcode' | 'photo_ingredients' | 'name_filled' }[] =
        ghostBarcode && userId
          ? [
              { amount: POINTS.SCAN_NEW_BARCODE, reason: 'scan_new_barcode' as const },
              { amount: POINTS.PHOTO_INGREDIENTS, reason: 'photo_ingredients' as const },
              ...(productHasName
                ? [{ amount: POINTS.NAME_FILLED, reason: 'name_filled' as const }]
                : []),
            ]
          : [];
      const baseTotal = basePointsSteps.reduce((acc, s) => acc + s.amount, 0);

      // Task #110 — Détection 1ère contributrice + bonus ×2.
      // On AWAIT le check AVANT la navigation (~50-200ms DB roundtrip) pour
      // afficher le bon `pointsEarned` dans le toast verdict. La latence est
      // négligeable pour l'utilisatrice (déjà 800ms d'OCR + matching avant ça)
      // et l'expérience "+70 ⭐ ✨ Première contributrice !" vaut largement
      // les 100ms supplémentaires. Si le check fail → safe default (pas bonus).
      let firstContributor = false;
      if (ghostBarcode && userId && baseTotal > 0) {
        firstContributor = await isFirstContributor(ghostBarcode, userId).catch(
          (err) => {
            logError('ocrReview.isFirstContributor', err);
            return false;
          },
        );
      }

      // Multiplier ×2 implémenté via un award additionnel `first_contributor_bonus`
      // d'un montant égal au total de base. Permet de tracker séparément le bonus
      // dans point_transactions (ledger lisible) + facilite analytics.
      const pointsSteps: {
        amount: number;
        reason: 'scan_new_barcode' | 'photo_ingredients' | 'name_filled' | 'first_contributor_bonus';
      }[] = firstContributor
        ? [...basePointsSteps, { amount: baseTotal, reason: 'first_contributor_bonus' as const }]
        : basePointsSteps;
      const pointsToEarn = pointsSteps.reduce((acc, s) => acc + s.amount, 0);

      // Navigate to verdict with ocr_ prefix; pass ghostThanks=1 + the original
      // ghostBarcode so the verdict screen can render the "merci" toast and
      // (after 1s) the contribution card that updates the same DB row.
      const verdictPath = `/verdict/${encodeURIComponent(`ocr_${id}`)}`;
      if (ghostBarcode) {
        const contribParam = newContribCount !== null
          ? `&ghostContribCount=${newContribCount}`
          : '';
        const pointsParam = pointsToEarn > 0 ? `&pointsEarned=${pointsToEarn}` : '';
        const firstParam = firstContributor ? '&firstContributor=1' : '';
        router.replace(
          `${verdictPath}?ghostThanks=1&ghostBarcode=${encodeURIComponent(ghostBarcode)}${contribParam}${pointsParam}${firstParam}`,
        );
      } else {
        router.replace(verdictPath);
      }

      // ── Ghost Capture: background save + awards (audit fix #8) ────────────
      // L'UX reste optimiste (navigation déjà déclenchée), mais en background
      // on AWAIT le save AVANT d'octroyer les points pour préserver l'intégrité
      // user_points ↔ community_submissions. Si save fail → pas de points + log
      // Sentry + analytics `saved:false` pour suivre le taux d'échec.
      if (ghostBarcode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((err) => {
          logError('ocrReview.haptics', err);
        });
        // Lot 18-01 — Bug data integrity : avant on envoyait `cleaned`
        // (= cleanOCRText(ocrText)) qui strip % concentrations et lots codes
        // même quand l'user les tape volontairement. On envoie maintenant
        // le texte BRUT que l'user a édité (state `ocrText`) pour préserver
        // toutes ses corrections + ajouts contextuels.
        (async () => {
          const saved = await ghostCaptureSave({
            barcode: ghostBarcode,
            productName: product.name,
            category,
            ocrText: ocrText,
            verdict: verdictResult,
            trimester: phase,
            userId: userId ?? null,
          }).catch((err) => {
            logError('ocrReview.ghostCaptureSave', err);
            return false;
          });

          // Analytics : track le résultat réel (saved:true/false) plutôt que
          // de prétendre que toute contribution a réussi.
          track('ghost_capture_completed', {
            category,
            verdict: verdictResult.verdict,
            ingredients_count: ingredients.length,
            saved,
          }).catch(() => {});

          if (!saved) {
            // Save fail → pas d'awards pour éviter incohérence user_points vs
            // community_submissions. Sentry a déjà la trace via logError ci-dessus.
            logError(
              'ocrReview.skipPointsAfterSaveFail',
              new Error('ghost_capture_save_failed'),
              { barcode: ghostBarcode },
            );
            return;
          }

          // Hēlo Points (task #107 + audit fix) — Awards séquentiels pour
          // garantir l'ordre vis-à-vis du cap journalier 300 pts. Si on faisait
          // ces 3 awards en parallèle (Promise.all), un award peut consommer le
          // quota mid-stream et les suivants seraient cappés à 0. Séquentiel +
          // check du retour pour analytics fidèles.
          if (userId && pointsSteps.length > 0) {
            let totalAwarded = 0;
            let capped = false;
            for (const step of pointsSteps) {
              const res = await awardPoints({
                userId,
                amount: step.amount,
                reason: step.reason,
                productId: null, // pas de products.id côté ghost — uniq index basé sur (user_id, product_id, reason) ne s'applique pas
                metadata: { barcode: ghostBarcode, source: 'ocr_review' },
              });
              if (!res) {
                logError('ocrReview.awardPoints.null', new Error(`reason=${step.reason}`));
                break;
              }
              if (res.message === 'awarded_full' || res.message === 'awarded_partial') {
                totalAwarded += step.amount;
              }
              if (res.message === 'daily_cap_reached') {
                capped = true;
                break;
              }
            }
            track('points_earned', {
              source: 'ghost_capture',
              barcode: ghostBarcode,
              total_awarded: totalAwarded,
              total_expected: pointsToEarn,
              capped,
            }).catch(() => {});
          }
        })();
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

        {/* Lot 18-07 — Empty state explicite quand 0 ingrédient détecté.
            Avant : juste un WarningCard discret + textarea vide → user stranded
            sans savoir quoi faire. Maintenant : carte prominente avec 2 CTA
            clairs (reprendre photo / saisir à la main). */}
        {!ocrLoading && parsedCount === 0 && (
          <View style={emptyOcrStyles.card}>
            <ThemedText style={emptyOcrStyles.emoji}>📷</ThemedText>
            <ThemedText variant="headlineMedium" color="textPrimary" style={emptyOcrStyles.title}>
              Aucun ingrédient détecté
            </ThemedText>
            <ThemedText variant="bodyMedium" color="textSecondary" style={emptyOcrStyles.subtitle}>
              La photo est peut-être floue ou trop sombre. Tu peux reprendre une photo plus claire ou saisir la liste à la main.
            </ThemedText>
            <View style={emptyOcrStyles.actions}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.back();
                }}
                accessibilityRole="button"
                accessibilityLabel="Reprendre la photo"
                style={({ pressed }) => [
                  emptyOcrStyles.primaryBtn,
                  { opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Feather name="camera" size={16} color="#FFFFFF" />
                <ThemedText style={emptyOcrStyles.primaryBtnText}>Reprendre une photo</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  // Le user peut juste cliquer sur le textarea ci-dessous et taper.
                  // On scroll au textarea + clear le warning pour ne pas distraire.
                  Haptics.selectionAsync().catch(() => {});
                  setOcrWarning(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Saisir manuellement"
                style={({ pressed }) => [
                  emptyOcrStyles.secondaryBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="edit-3" size={16} color={Colors.accentDark} />
                <ThemedText style={emptyOcrStyles.secondaryBtnText}>Saisir à la main</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {!ocrLoading && parsedCount !== 0 && ocrWarning && (
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
            placeholder="La liste d'ingrédients apparaîtra ici. Tu peux la corriger."
            placeholderTextColor={Colors.textTertiary}
            textAlignVertical="top"
            scrollEnabled={false}
          />
          <ThemedText variant="bodySmall" color="textTertiary" style={styles.fieldHint}>
            Format INCI : ingrédients séparés par des virgules
          </ThemedText>
        </View>

        {/* Category — Lot 18-09 : label avec tooltip explicatif (i) */}
        <View style={styles.fieldGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText variant="labelLarge" style={styles.fieldLabel}>Catégorie</ThemedText>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                Alert.alert(
                  'Pourquoi choisir une catégorie ?',
                  "Le verdict peut différer selon l'usage. Exemple : le parabène est toléré dans une crème cosmétique appliquée localement, mais déconseillé dans un soin oral ou alimentaire.\n\nChoisis la catégorie correspondante pour que l'analyse Hēlo soit pertinente.",
                  [{ text: 'J\'ai compris', style: 'default' }],
                );
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Pourquoi choisir une catégorie ?"
              style={{ padding: 2 }}
            >
              <Feather name="info" size={14} color={Colors.textTertiary} />
            </Pressable>
          </View>
          <CategoryPicker selected={category} onChange={setCategory} />
        </View>

        {/* Info badge */}
        <View style={styles.infoBadge}>
          <Feather name="info" size={14} color={Colors.accent} />
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginLeft: 6, flex: 1 }}>
            L'analyse sera adaptée à ton trimestre actuel et évaluera chaque ingrédient détecté.
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
          {analysing ? 'Analyse en cours…' : 'Analyser →'}
        </Button>
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

// Lot 18-07 — Empty state OCR fail (0 ingrédient détecté).
const emptyOcrStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cautionLight ?? '#FFF4E5',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F5D9A3',
  },
  emoji: {
    fontSize: 36,
    lineHeight: 42,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentDark,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentDark,
  },
  secondaryBtnText: {
    color: Colors.accentDark,
    fontSize: 13,
    fontWeight: '700',
  },
});
