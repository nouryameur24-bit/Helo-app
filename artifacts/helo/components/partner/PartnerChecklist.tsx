import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useShelfData } from '@/hooks/useShelfData';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const CHECKLIST_KEY = STORAGE_KEYS.partnerChecklist;

export interface CheckItem {
  id: string;
  label: string;
  subtitle?: string;
}

export const MAISON_ITEMS: CheckItem[] = [
  { id: 'chambre', label: 'Chambre bébé aménagée', subtitle: 'Lit, matelas, tour de lit si souhaité' },
  { id: 'berceau', label: 'Berceau ou couffin prêt', subtitle: 'Pour les premières semaines' },
  { id: 'siege_auto', label: 'Siège auto installé', subtitle: 'Groupe 0+ ou i-Size, correctement fixé' },
  { id: 'poussette', label: 'Poussette assemblée', subtitle: 'Testez les mécanismes avant la naissance' },
  { id: 'baignoire', label: 'Baignoire bébé', subtitle: 'Avec thermomètre de bain' },
  { id: 'table_a_langer', label: 'Table à langer sécurisée', subtitle: 'Ou tapis à langer fixé' },
  { id: 'baby_phone', label: 'Baby phone fonctionnel', subtitle: 'Avec ou sans caméra' },
  { id: 'temperature', label: 'Température de la pièce', subtitle: 'Idéalement entre 18°C et 20°C' },
  { id: 'prise_securite', label: 'Prises électriques sécurisées', subtitle: 'Protège-prises dans toutes les pièces' },
  { id: 'produits_menage', label: 'Produits ménagers hors de portée', subtitle: 'Rangés en hauteur ou sous clé' },
];

export const RDV_ITEMS: CheckItem[] = [
  { id: 'rdv_1t', label: 'Déclaration de grossesse', subtitle: 'Avant la 15e SA' },
  { id: 'echo_t1', label: 'Écho 1er trimestre (11-14 SA)', subtitle: 'Clarté nucale et confirmation du terme' },
  { id: 'echo_t2', label: 'Écho morphologique (20-25 SA)', subtitle: 'Examen détaillé de tous les organes' },
  { id: 'echo_t3', label: 'Écho 3e trimestre (30-35 SA)', subtitle: 'Croissance et position du bébé' },
  { id: 'diabete', label: 'Test diabète gestationnel (24-28 SA)', subtitle: 'Pour les femmes à risque' },
  { id: 'strepto', label: 'Dépistage streptocoque B (35-38 SA)', subtitle: 'Prélèvement vaginal standard' },
  { id: 'preparation', label: "Cours de préparation à l'accouchement", subtitle: '8 séances remboursées dès 25 SA' },
  { id: 'sage_femme', label: 'Suivi sage-femme régulier', subtitle: '1 consultation par mois minimum' },
  { id: 'anesthesiste', label: 'Consultation anesthésiste', subtitle: "Obligatoire avant l'accouchement" },
  { id: 'visite_maternite', label: 'Visite de la maternité', subtitle: 'Pour se familiariser avec les lieux' },
  { id: 'conge_paternite', label: 'Congé paternité déclaré', subtitle: "25 jours, à déclarer à l'employeur" },
];

export function CheckRow({
  id,
  label,
  subtitle,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  subtitle?: string;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onToggle(id)}
      style={({ pressed }) => [
        checkRowStyles.row,
        checked && checkRowStyles.rowDone,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[checkRowStyles.checkbox, checked && checkRowStyles.checkboxDone]}>
        {checked && <Feather name="check" size={14} color={Colors.surface} />}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText
          variant="labelLarge"
          style={{
            color: checked ? Colors.textTertiary : Colors.textPrimary,
            textDecorationLine: checked ? 'line-through' : 'none',
          }}
          numberOfLines={2}
        >
          {label}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const checkRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowDone: {
    backgroundColor: Colors.safeBg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: Colors.safe,
    borderColor: Colors.safe,
  },
});

export function SectionAccordion({
  title,
  emoji,
  isExpanded,
  onToggle,
  items,
  checked,
  onToggleItem,
}: {
  title: string;
  emoji: string;
  isExpanded: boolean;
  onToggle: () => void;
  items: CheckItem[];
  checked: Record<string, boolean>;
  onToggleItem: (id: string) => void;
}) {
  const doneCount = items.filter((i) => checked[i.id]).length;
  return (
    <View style={sectionStyles.wrap}>
      <Pressable onPress={onToggle} style={sectionStyles.header}>
        <View style={sectionStyles.left}>
          <ThemedText style={sectionStyles.emoji}>{emoji}</ThemedText>
          <View>
            <ThemedText variant="headlineMedium" color="textPrimary">
              {title}
            </ThemedText>
            <ThemedText variant="bodySmall" color="textTertiary" style={{ marginTop: 2 }}>
              {doneCount} / {items.length} effectués
            </ThemedText>
          </View>
        </View>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textTertiary}
        />
      </Pressable>
      {isExpanded && (
        <View style={sectionStyles.body}>
          {items.map((item) => (
            <CheckRow
              key={item.id}
              id={item.id}
              label={item.label}
              subtitle={item.subtitle}
              checked={!!checked[item.id]}
              onToggle={onToggleItem}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 24,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});

interface PartnerChecklistProps {
  showHeader?: boolean;
  headerPaddingTop?: number;
}

export function PartnerChecklist({ showHeader = true, headerPaddingTop = 0 }: PartnerChecklistProps) {
  const { linkedUserId, linkedFirstName } = useProfile();
  const { shelf } = useShelfData(linkedUserId ?? undefined);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    maison: true,
    produits: true,
    rdv: true,
  });

  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY).then((val) => {
      if (val) setChecked(JSON.parse(val));
    });
  }, []);

  const toggle = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const momName = linkedFirstName ?? 'votre partenaire';
  const safeProducts = shelf.filter((p) => p.verdict === 'safe').slice(0, 6);
  const cautionProducts = shelf.filter((p) => p.verdict === 'caution' || p.verdict === 'danger');

  const totalItems = MAISON_ITEMS.length + (shelf.length > 0 ? safeProducts.length : 1) + RDV_ITEMS.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const progress = totalItems > 0 ? checkedCount / totalItems : 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        contentStyles.container,
        showHeader ? {} : { paddingTop: Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {showHeader && (
        <View style={[contentStyles.header, { paddingTop: headerPaddingTop }]}>
          <ThemedText variant="headlineLarge" color="textPrimary">
            Ma checklist
          </ThemedText>
          <ThemedText variant="bodySmall" color="textTertiary">
            Pour {momName}
          </ThemedText>
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <Card padding={Spacing.lg} style={contentStyles.progressCard}>
          <View style={contentStyles.progressHeader}>
            <ThemedText variant="labelLarge" color="textPrimary">
              Progression
            </ThemedText>
            <ThemedText variant="labelLarge" color="accent">
              {checkedCount} / {totalItems}
            </ThemedText>
          </View>
          <View style={contentStyles.progressTrack}>
            <View style={[contentStyles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <SectionAccordion
          title="Préparer la maison"
          emoji="🏠"
          isExpanded={expanded.maison}
          onToggle={() => toggleSection('maison')}
          items={MAISON_ITEMS}
          checked={checked}
          onToggleItem={toggle}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <View style={sectionStyles.wrap}>
          <Pressable
            onPress={() => toggleSection('produits')}
            style={sectionStyles.header}
          >
            <View style={sectionStyles.left}>
              <ThemedText style={sectionStyles.emoji}>🛁</ThemedText>
              <View>
                <ThemedText variant="headlineMedium" color="textPrimary">
                  Produits à acheter
                </ThemedText>
                <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 2 }}>
                  Placard de {momName}
                </ThemedText>
              </View>
            </View>
            <Feather
              name={expanded.produits ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textTertiary}
            />
          </Pressable>
          {expanded.produits && (
            <View style={sectionStyles.body}>
              {shelf.length === 0 ? (
                <View style={contentStyles.emptyProducts}>
                  <Feather name="shopping-bag" size={32} color={Colors.textTertiary} />
                  <ThemedText
                    variant="bodyMedium"
                    color="textTertiary"
                    style={{ textAlign: 'center', marginTop: Spacing.sm }}
                  >
                    Aucun produit dans le placard de {momName} pour l'instant.
                  </ThemedText>
                </View>
              ) : (
                <>
                  {cautionProducts.length > 0 && (
                    <View style={contentStyles.productsAlert}>
                      <Feather name="alert-triangle" size={14} color={Colors.caution} />
                      <ThemedText
                        variant="bodySmall"
                        style={{ color: Colors.caution, marginLeft: Spacing.xs, flex: 1 }}
                      >
                        {cautionProducts.length} produit{cautionProducts.length > 1 ? 's' : ''} à remplacer
                      </ThemedText>
                    </View>
                  )}
                  {safeProducts.map((product) => {
                    const pid = `product_${product.id}`;
                    return (
                      <CheckRow
                        key={product.id}
                        id={pid}
                        label={product.name}
                        subtitle={`${product.brand} · ${product.verdictLabel}`}
                        checked={!!checked[pid]}
                        onToggle={toggle}
                      />
                    );
                  })}
                </>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(400)}>
        <SectionAccordion
          title="Rendez-vous médicaux"
          emoji="🏥"
          isExpanded={expanded.rdv}
          onToggle={() => toggleSection('rdv')}
          items={RDV_ITEMS}
          checked={checked}
          onToggleItem={toggle}
        />
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const contentStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
    marginBottom: -Spacing.lg,
  },
  progressCard: {
    gap: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  emptyProducts: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.sm,
  },
  productsAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cautionBg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
