import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IllustrationCommunity } from "@/components/illustrations/IllustrationCommunity";
import { IllustrationMoment } from "@/components/illustrations/IllustrationMoment";
import { IllustrationPromise } from "@/components/illustrations/IllustrationPromise";
import { IllustrationScan } from "@/components/illustrations/IllustrationScan";
import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  Illustration: React.ComponentType<{ size?: number }>;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  sources?: string[]; // pour Slide 2 — badges sources
  stats?: string; // "16 799 produits..."
}

const SLIDES: Slide[] = [
  // ── Slide 1 — THE MOMENT (hook émotionnel) ────────────────────────────────
  {
    key: "moment",
    title: "23h47.\nTu lis l'étiquette.\nTu doutes.",
    subtitle:
      "Chaque jour, des centaines de produits.\nDes questions que personne ne peut répondre à 3h du matin.",
    Illustration: IllustrationMoment,
    gradientFrom: "#FFFAF5",
    gradientTo: "#FFE9C9",
    accentColor: Colors.accentDark,
  },
  // ── Slide 2 — THE PROMISE (révélation solution) ───────────────────────────
  {
    key: "promise",
    title: "Hēlo te répond.\nEn 2 secondes.",
    subtitle:
      "16 799 produits analysés. 5 000 ingrédients référencés.\nAdapté à ton trimestre.",
    Illustration: IllustrationPromise,
    gradientFrom: "#FFFAF5",
    gradientTo: "#EDF7F0",
    accentColor: "#5BB97C",
    sources: ["CRAT", "ANSM", "EFSA", "SCCS"],
    stats: "16 799 produits · 5 000 ingrédients",
  },
  // ── Slide 3 — RESTAURANT (killer differentiator) ─────────────────────────
  // v4 Lot 14 — Mode Restaurant : feature unique sur le marché FR. Yuka
  // n'a pas. La justifier dans l'onboarding fait passer la perception
  // "scanner basique" → "compagnon complet". Boost conversion W1.
  {
    key: "restaurant",
    title: "Le menu du resto ?\nUne photo, et c'est tout.",
    subtitle:
      "Photographie le menu. On analyse chaque plat en 5 secondes.\nTu sais quoi commander — sans demander.",
    Illustration: IllustrationScan,
    gradientFrom: "#FFFAF5",
    gradientTo: "#FFE4D6",
    accentColor: Colors.accent,
  },
  // ── Slide 4 — SAGE-FEMME IA (premium value teaser) ───────────────────────
  // v4 Lot 14 — Pose la promesse Premium AVANT le paywall. Réduit le choc
  // de la friction d'achat plus tard.
  {
    key: "ai",
    title: "Une question.\nUne réponse sourcée.",
    subtitle:
      "Ta Sage-Femme IA, disponible 24/7.\nAdaptée à ton trimestre, à ton allaitement, à toi.",
    Illustration: IllustrationCommunity,
    gradientFrom: "#FFFAF5",
    gradientTo: "#F0F0F8",
    accentColor: Colors.accent,
    sources: ["CRAT", "ANSM"],
  },
  // ── Slide 5 — PARTNER (viralité couple) ──────────────────────────────────
  // v4 Lot 14 — Le mari/conjoint·e est un acquisition vector. Le mentionner
  // dans l'onboarding pousse l'utilisatrice à inviter spontanément.
  {
    key: "partner",
    title: "Il t'aide.\nMême au supermarché.",
    subtitle:
      "Ton partenaire scanne pour toi. Vous voyez vos choix en temps réel.\nVous êtes une équipe.",
    Illustration: IllustrationCommunity,
    gradientFrom: "#FFFAF5",
    gradientTo: "#EDF7F0",
    accentColor: "#5BB97C",
  },
];

// ─── Breathing illustration wrapper ───────────────────────────────────────────
function AnimatedIllustration({
  Illustration,
  isActive,
}: {
  Illustration: React.ComponentType<{ size?: number }>;
  isActive: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1.0, { duration: 400 });
    }
  }, [isActive, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Illustration size={230} />
    </Animated.View>
  );
}

// ─── Animated dot ─────────────────────────────────────────────────────────────
function AnimatedDot({ isActive }: { isActive: boolean }) {
  const width = useSharedValue(isActive ? 28 : 8);
  const opacity = useSharedValue(isActive ? 1 : 0.35);

  useEffect(() => {
    width.value = withSpring(isActive ? 28 : 8, { stiffness: 200, damping: 18 });
    opacity.value = withTiming(isActive ? 1 : 0.35, { duration: 250 });
  }, [isActive, width, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

// ─── Single slide ─────────────────────────────────────────────────────────────
function SlideCard({
  item,
  isActive,
}: {
  item: Slide;
  isActive: boolean;
}) {
  const { Illustration } = item;

  return (
    <LinearGradient
      colors={[item.gradientFrom, item.gradientTo]}
      style={[styles.slide, { width: SCREEN_WIDTH }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <Animated.View
        entering={FadeIn.delay(40).duration(400).easing(Easing.out(Easing.cubic))}
        style={styles.illustrationWrap}
      >
        <AnimatedIllustration Illustration={Illustration} isActive={isActive} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(120).duration(380).easing(Easing.out(Easing.cubic))}
        style={styles.textBlock}
      >
        <View
          style={[styles.accentLine, { backgroundColor: item.accentColor }]}
        />
        <ThemedText
          variant="headlineLarge"
          color="textPrimary"
          style={styles.slideTitle}
        >
          {item.title}
        </ThemedText>
        <ThemedText
          variant="bodyLarge"
          color="textSecondary"
          style={styles.slideSubtitle}
        >
          {item.subtitle}
        </ThemedText>

        {/* Slide 2 — stats chiffrées (proof point) */}
        {item.stats && (
          <ThemedText variant="labelLarge" style={styles.statsLine}>
            {item.stats}
          </ThemedText>
        )}

        {/* Slide 2 — badges sources scientifiques (texte uniquement, pas de logos tiers) */}
        {item.sources && (
          <View style={styles.sourcesRow}>
            {item.sources.map((src) => (
              <View key={src} style={styles.sourceBadge}>
                <ThemedText variant="labelSmall" style={styles.sourceBadgeText}>
                  {src}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </LinearGradient>
  );
}

// ─── Splash screen ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  const ring1 = useSharedValue(0.5);
  const ring2 = useSharedValue(0.5);

  useEffect(() => {
    // Logo reveal
    logoScale.value = withSpring(1, { stiffness: 120, damping: 14 });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Glow pulse
    glowOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    glowScale.value = withDelay(200, withSpring(1, { stiffness: 80, damping: 12 }));

    // Outer rings — breathing
    ring1.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.95, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    ring2.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.92, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Auto-advance
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(400)}
      style={styles.splash}
    >
      <LinearGradient
        colors={["#FFFAF5", "#FFF3E0"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Animated background rings */}
      <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
      <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />

      {/* Center glow */}
      <Animated.View style={[styles.glow, glowStyle]}>
        <LinearGradient
          colors={[Colors.accentLight, Colors.accent + "33"]}
          style={styles.glowGradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <ThemedText style={styles.logoText}>Hēlo</ThemedText>
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
        >
          <ThemedText style={styles.logoTagline}>
            Pour les mamans qui ne font pas de compromis
          </ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Tap to skip */}
      <Pressable
        onPress={onDone}
        style={styles.splashSkip}
        hitSlop={20}
        accessibilityRole="button"
        accessibilityLabel="Passer le splash"
      >
        <Animated.View entering={FadeIn.delay(1200).duration(400)}>
          <ThemedText variant="bodySmall" color="textTertiary">
            Appuyez pour continuer
          </ThemedText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [phase, setPhase] = useState<"splash" | "slides">("splash");
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = activeIndex === SLIDES.length - 1;

  const buttonScale = useSharedValue(1);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    buttonScale.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withSpring(1, { stiffness: 300, damping: 14 }),
    );

    if (isLast) {
      router.replace("/onboarding/role");
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    router.replace("/onboarding/role");
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (phase === "splash") {
    return <SplashScreen onDone={() => setPhase("slides")} />;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.root, { backgroundColor: Colors.background }]}
    >
      {/* Skip */}
      <View style={[styles.skipRow, { paddingTop: topPadding + Spacing.sm }]}>
        <View style={{ flex: 1 }} />
        {!isLast && (
          <Pressable onPress={handleSkip} style={styles.skipBtn} hitSlop={12}>
            <ThemedText variant="labelLarge" color="textTertiary">
              Passer
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SlideCard item={item} isActive={index === activeIndex} />
        )}
        style={styles.flatList}
      />

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPadding + Spacing.xl },
        ]}
      >
        {/* Animated dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <AnimatedDot key={i} isActive={i === activeIndex} />
          ))}
        </View>

        {/* Button */}
        <Animated.View style={[styles.buttonWrap, buttonStyle]}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.92 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Commencer" : "Suivant"}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.primaryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={styles.primaryBtnText}>
                {isLast ? "Commencer" : "Suivant"}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Splash ──────────────────────────────────────────────────────────────────
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  ring1: {
    width: 260,
    height: 260,
    opacity: 0.18,
  },
  ring2: {
    width: 360,
    height: 360,
    opacity: 0.1,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
  },
  glowGradient: {
    flex: 1,
  },
  logoWrap: {
    alignItems: "center",
    gap: Spacing.md,
  },
  logoText: {
    fontSize: 64,
    fontWeight: "700",
    color: Colors.accentDark,
    letterSpacing: -1.5,
  },
  logoTagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
    marginTop: Spacing.sm,
  },
  splashSkip: {
    position: "absolute",
    bottom: 60,
  },

  // ── Slides ──────────────────────────────────────────────────────────────────
  skipRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.xxl,
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    gap: Spacing.md,
  },
  accentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  slideTitle: {
    textAlign: "center",
  },
  slideSubtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  statsLine: {
    textAlign: "center",
    marginTop: Spacing.md,
    color: Colors.accentDark,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sourcesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.lg,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent + "55",
  },
  sourceBadgeText: {
    color: Colors.accentDark,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // ── Bottom bar ──────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xxl,
    backgroundColor: "transparent",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  buttonWrap: {
    width: "100%",
  },
  primaryBtn: {
    borderRadius: Radius.full,
    overflow: "hidden",
    width: "100%",
  },
  primaryBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
