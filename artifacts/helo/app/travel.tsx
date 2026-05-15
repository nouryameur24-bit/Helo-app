/**
 * app/travel.tsx — Mode Voyage ✈️
 *
 * Premium screen: Enter destination + dates → generate AI health briefing for pregnant women.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { FeatureDiscoverySheet } from '@/components/ui/FeatureDiscoverySheet';
import { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
  
import {
  generateTravelBriefing,
  loadTravelBriefingsIndex,
  type TravelBriefing,
  type TravelBriefingMeta,
} from '@/lib/travel';

const COUNTRIES: { name: string; flag: string }[] = [
  { name: 'France', flag: '🇫🇷' },
  { name: 'Espagne', flag: '🇪🇸' },
  { name: 'Italie', flag: '🇮🇹' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Grèce', flag: '🇬🇷' },
  { name: 'Maroc', flag: '🇲🇦' },
  { name: 'Tunisie', flag: '🇹🇳' },
  { name: 'Algérie', flag: '🇩🇿' },
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: "Côte d'Ivoire", flag: '🇨🇮' },
  { name: 'Madagascar', flag: '🇲🇬' },
  { name: 'Réunion', flag: '🇷🇪' },
  { name: 'Martinique', flag: '🇲🇶' },
  { name: 'Guadeloupe', flag: '🇬🇵' },
  { name: 'Thaïlande', flag: '🇹🇭' },
  { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Cambodge', flag: '🇰🇭' },
  { name: 'Indonésie', flag: '🇮🇩' },
  { name: 'Bali (Indonésie)', flag: '🇮🇩' },
  { name: 'Maldives', flag: '🇲🇻' },
  { name: 'Mexique', flag: '🇲🇽' },
  { name: 'Cuba', flag: '🇨🇺' },
  { name: 'République Dominicaine', flag: '🇩🇴' },
  { name: 'Brésil', flag: '🇧🇷' },
  { name: 'Colombie', flag: '🇨🇴' },
  { name: 'Pérou', flag: '🇵🇪' },
  { name: 'États-Unis', flag: '🇺🇸' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Royaume-Uni', flag: '🇬🇧' },
  { name: 'Allemagne', flag: '🇩🇪' },
  { name: 'Belgique', flag: '🇧🇪' },
  { name: 'Suisse', flag: '🇨🇭' },
  { name: 'Pays-Bas', flag: '🇳🇱' },
  { name: 'Autriche', flag: '🇦🇹' },
  { name: 'Turquie', flag: '🇹🇷' },
  { name: 'Égypte', flag: '🇪🇬' },
  { name: 'Afrique du Sud', flag: '🇿🇦' },
  { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Maurice', flag: '🇲🇺' },
  { name: 'Japon', flag: '🇯🇵' },
  { name: 'Chine', flag: '🇨🇳' },
  { name: 'Inde', flag: '🇮🇳' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Émirats Arabes Unis', flag: '🇦🇪' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Australie', flag: '🇦🇺' },
  { name: 'Nouvelle-Zélande', flag: '🇳🇿' },
];

function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = [
    'jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.',
  ];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function addWeeks(weeks: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

// ─── Native date picker button (iOS/Android) ─────────────────────────────────

interface NativeDateButtonProps {
  label: string;
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
}

function NativeDateButton({ label, value, minimumDate, onChange }: NativeDateButtonProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={dp.wrap}>
      <ThemedText variant="bodySmall" color="textTertiary" style={dp.label}>{label}</ThemedText>
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [dp.button, { opacity: pressed ? 0.88 : 1 }]}
      >
        <Feather name="calendar" size={14} color={Colors.textTertiary} />
        <ThemedText variant="bodyMedium" color="textPrimary">{formatDateDisplay(toISODateString(value))}</ThemedText>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={(_event, selectedDate) => {
            setShow(Platform.OS === 'ios');
            if (selectedDate) {
              onChange(selectedDate);
            }
            if (Platform.OS !== 'ios') {
              setShow(false);
            }
          }}
          locale="fr-FR"
        />
      )}
    </View>
  );
}

// ─── Web date input ───────────────────────────────────────────────────────────

interface WebDateInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}

function WebDateInput({ label, value, onChange, min }: WebDateInputProps) {
  return (
    <View style={dp.wrap}>
      <ThemedText variant="bodySmall" color="textTertiary" style={dp.label}>{label}</ThemedText>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: `1px solid ${Colors.border}`,
          borderRadius: Radius.md,
          padding: '10px 14px',
          fontSize: 15,
          fontFamily: 'PlusJakartaSans_400Regular, sans-serif',
          color: Colors.textPrimary,
          backgroundColor: Colors.surface,
          width: '100%',
          boxSizing: 'border-box' as const,
          outline: 'none',
        }}
      />
    </View>
  );
}

const dp = StyleSheet.create({
  wrap: { flex: 1 },
  label: { marginBottom: Spacing.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
});

// ─── History card ─────────────────────────────────────────────────────────────

function BriefingHistoryCard({ meta, onPress }: { meta: TravelBriefingMeta; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        hc.card,
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <ThemedText style={hc.flag}>{meta.flag}</ThemedText>
      <View style={{ flex: 1 }}>
        <ThemedText variant="labelLarge" color="textPrimary">{meta.country}</ThemedText>
        <ThemedText variant="bodySmall" color="textTertiary">
          {formatDateDisplay(meta.departureDate)} → {formatDateDisplay(meta.returnDate)}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

const hc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadows.soft,
  },
  flag: { fontSize: 28 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TravelScreen() {
  const __discovery_travel = useFeatureDiscovery('travel');
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const { isPremium, requirePremium } = usePremium();

  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; flag: string } | null>(null);

  const [departureDateObj, setDepartureDateObj] = useState<Date>(addWeeks(2));
  const [returnDateObj, setReturnDateObj] = useState<Date>(addWeeks(4));
  const [departureDateStr, setDepartureDateStr] = useState<string>(toISODateString(addWeeks(2)));
  const [returnDateStr, setReturnDateStr] = useState<string>(toISODateString(addWeeks(4)));

  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TravelBriefingMeta[]>([]);

  useEffect(() => {
    loadTravelBriefingsIndex().then(setHistory);
  }, []);

  const filteredCountries = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return COUNTRIES.filter((c) => {
      const name = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q);
    });
  }, [query]);

  const handleCountrySelect = useCallback((country: { name: string; flag: string }) => {
    setSelectedCountry(country);
    setQuery(country.name);
    setShowDropdown(false);
  }, []);

  const handleDepartureChange = useCallback((date: Date) => {
    setDepartureDateObj(date);
    setDepartureDateStr(toISODateString(date));
    if (date > returnDateObj) {
      const newReturn = new Date(date);
      newReturn.setDate(newReturn.getDate() + 7);
      setReturnDateObj(newReturn);
      setReturnDateStr(toISODateString(newReturn));
    }
  }, [returnDateObj]);

  const handleReturnChange = useCallback((date: Date) => {
    setReturnDateObj(date);
    setReturnDateStr(toISODateString(date));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isPremium) {
      requirePremium('voyage');
      return;
    }
    if (!selectedCountry) {
      setError('Veuillez sélectionner une destination.');
      return;
    }
    if (departureDateStr > returnDateStr) {
      setError('La date de retour doit être après la date de départ.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const briefing: TravelBriefing = await generateTravelBriefing(
        selectedCountry.name,
        selectedCountry.flag,
        departureDateStr,
        returnDateStr,
      );
      const updatedHistory = await loadTravelBriefingsIndex();
      setHistory(updatedHistory);
      router.push({
        pathname: '/travel-briefing',
        params: { briefingId: briefing.id, country: briefing.country, flag: briefing.flag },
      } as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'API_KEY_MISSING' || msg === 'API_KEY_INVALID') {
        setError('Clé API non configurée. Veuillez contacter le support Hēlo.');
      } else if (msg === 'RATE_LIMIT') {
        setError('Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.');
      } else if (msg === 'PARSE_ERROR') {
        setError('Erreur lors de la génération du briefing. Veuillez réessayer.');
      } else {
        setError('Impossible de générer le briefing. Vérifiez votre connexion et réessayez.');
      }
    } finally {
      setLoading(false);
    }
  }, [isPremium, requirePremium, selectedCountry, departureDateStr, returnDateStr]);

  if (!isPremium) {
    return (
      <View style={[s.root, { backgroundColor: Colors.background }]}>
        <View style={[s.header, { paddingTop: topPadding + Spacing.md }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <ThemedText variant="headlineMedium" color="textPrimary">Voyage enceinte ✈️</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={s.lockWrap}>
          <View style={s.lockIcon}>
            <Feather name="lock" size={36} color={Colors.accentDark} />
          </View>
          <ThemedText variant="headlineMedium" color="textPrimary" style={s.lockTitle}>
            Fonctionnalité Premium
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={s.lockDesc}>
            Obtenez un briefing santé personnalisé pour chaque destination, adapté à votre trimestre.
          </ThemedText>
          <Pressable
            style={({ pressed }) => [s.lockCTA, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => requirePremium('voyage')}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={s.lockCTAGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={s.lockCTAText}>Passer à Premium</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={[s.root, { backgroundColor: Colors.background }]}>
      <View style={[s.header, { paddingTop: topPadding + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <ThemedText variant="headlineMedium" color="textPrimary">Voyage enceinte ✈️</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <LinearGradient
            colors={['#E8D5B055', '#C9A96E22']}
            style={s.heroBanner}
          >
            <ThemedText style={s.heroEmoji}>✈️</ThemedText>
            <View style={{ flex: 1 }}>
              <ThemedText variant="labelLarge" color="textPrimary">Briefing santé voyage</ThemedText>
              <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                Généré par IA, adapté à votre trimestre
              </ThemedText>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.form}>
          <ThemedText variant="labelLarge" color="textPrimary" style={s.formLabel}>
            Votre destination
          </ThemedText>
          <View style={s.searchWrap}>
            <Feather name="search" size={16} color={Colors.textTertiary} style={s.searchIcon} />
            <TextInput
              style={[s.searchInput, { color: Colors.textPrimary }]}
              placeholder="Rechercher un pays..."
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setSelectedCountry(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(''); setSelectedCountry(null); setShowDropdown(false); }}>
                <Feather name="x" size={16} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {showDropdown && filteredCountries.length > 0 && (
            <View style={s.dropdown}>
              {filteredCountries.slice(0, 8).map((country) => (
                <TouchableOpacity
                  key={country.name}
                  onPress={() => handleCountrySelect(country)}
                  style={[
                    s.dropdownItem,
                    selectedCountry?.name === country.name && s.dropdownItemSelected,
                  ]}
                >
                  <ThemedText style={s.dropdownFlag}>{country.flag}</ThemedText>
                  <ThemedText variant="bodyMedium" color="textPrimary">{country.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ThemedText variant="labelLarge" color="textPrimary" style={[s.formLabel, { marginTop: Spacing.xl }]}>
            Dates de voyage
          </ThemedText>
          <View style={s.dateRow}>
            {Platform.OS === 'web' ? (
              <>
                <WebDateInput
                  label="Départ"
                  value={departureDateStr}
                  onChange={(v) => {
                    setDepartureDateStr(v);
                    setDepartureDateObj(new Date(v));
                  }}
                  min={toISODateString(today)}
                />
                <WebDateInput
                  label="Retour"
                  value={returnDateStr}
                  onChange={(v) => {
                    setReturnDateStr(v);
                    setReturnDateObj(new Date(v));
                  }}
                  min={departureDateStr}
                />
              </>
            ) : (
              <>
                <NativeDateButton
                  label="Départ"
                  value={departureDateObj}
                  minimumDate={today}
                  onChange={handleDepartureChange}
                />
                <NativeDateButton
                  label="Retour"
                  value={returnDateObj}
                  minimumDate={departureDateObj}
                  onChange={handleReturnChange}
                />
              </>
            )}
          </View>

          {error && (
            <Animated.View entering={FadeInDown.duration(300)} style={s.errorBanner}>
              <Feather name="alert-circle" size={14} color={Colors.danger} />
              <ThemedText variant="bodySmall" style={{ color: Colors.danger, flex: 1 }}>{error}</ThemedText>
            </Animated.View>
          )}

          <Pressable
            style={({ pressed }) => [
              s.generateBtn,
              (!selectedCountry || loading) && s.generateBtnDisabled,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleGenerate}
            disabled={loading || !selectedCountry}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={s.generateGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <ThemedText style={s.generateText}>Génération en cours...</ThemedText>
                </>
              ) : (
                <>
                  <Feather name="zap" size={18} color="#fff" />
                  <ThemedText style={s.generateText}>Générer mon briefing</ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <ThemedText variant="bodySmall" color="textTertiary" style={s.disclaimer}>
            Les informations fournies sont indicatives. Consultez votre médecin avant tout voyage pendant la grossesse.
          </ThemedText>
        </Animated.View>

        {history.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={s.historySection}>
            <ThemedText variant="headlineMedium" color="textPrimary" style={s.historyTitle}>
              Mes voyages
            </ThemedText>
            {history.map((meta) => (
              <BriefingHistoryCard
                key={meta.id}
                meta={meta}
                onPress={() => {
                  router.push({
                    pathname: '/travel-briefing',
                    params: {
                      storageKey: meta.storageKey,
                      country: meta.country,
                      flag: meta.flag,
                    },
                  } as never);
                }}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    <FeatureDiscoverySheet {...__discovery_travel.sheetProps} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.lg },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  heroEmoji: { fontSize: 32 },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  formLabel: { marginBottom: Spacing.sm },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  dropdown: {
    marginTop: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.accentLight + '44',
  },
  dropdownFlag: { fontSize: 20 },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
  },
  generateBtn: {
    marginTop: Spacing.xl,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  generateBtnDisabled: { opacity: 0.65 },
  generateGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
  generateText: {
    ...Typography.labelLarge,
    color: '#fff',
    fontSize: 15,
  },
  disclaimer: {
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 17,
  },
  historySection: { gap: Spacing.sm },
  historyTitle: { marginBottom: Spacing.xs },
  lockWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  lockIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentLight + '55',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentLight,
  },
  lockTitle: { textAlign: 'center' },
  lockDesc: { textAlign: 'center', lineHeight: 22 },
  lockCTA: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.elevated,
    marginTop: Spacing.md,
  },
  lockCTAGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  lockCTAText: { ...Typography.labelLarge, color: '#fff' },
});
