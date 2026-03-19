import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IllustrationCommunity } from "@/components/illustrations/IllustrationCommunity";
import { IllustrationGlowScore } from "@/components/illustrations/IllustrationGlowScore";
import { IllustrationScan } from "@/components/illustrations/IllustrationScan";
import { IllustrationTrimester } from "@/components/illustrations/IllustrationTrimester";
import { Button } from "@/components/ui/Button";
import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  Illustration: React.ComponentType<{ size?: number }>;
}

const SLIDES: Slide[] = [
  {
    key: "scan",
    title: "Scannez en toute sérénité",
    subtitle:
      "Cosmétiques, alimentation, médicaments — vérifiez instantanément ce qui est adapté à votre grossesse.",
    Illustration: IllustrationScan,
  },
  {
    key: "trimester",
    title: "Adapté à votre trimestre",
    subtitle:
      "Les recommandations évoluent avec vous. Hēlo ajuste automatiquement chaque évaluation.",
    Illustration: IllustrationTrimester,
  },
  {
    key: "glow",
    title: "Votre Glow Score",
    subtitle:
      "Découvrez votre score global de sérénité et partagez-le avec vos proches.",
    Illustration: IllustrationGlowScore,
  },
  {
    key: "community",
    title: "Ensemble, c'est mieux",
    subtitle:
      "Rejoignez des milliers de futures mamans qui font les meilleurs choix pour leur bébé.",
    Illustration: IllustrationCommunity,
  },
];

// Animated slide card — each slide has its own enter animation
function SlideCard({ item }: { item: Slide }) {
  const { Illustration } = item;

  return (
    <Animated.View
      entering={FadeIn.duration(300).easing(Easing.out(Easing.cubic))}
      style={[styles.slide, { width: SCREEN_WIDTH }]}
    >
      <Animated.View
        entering={FadeIn.delay(60).duration(300).easing(Easing.out(Easing.cubic))}
        style={styles.illustrationWrap}
      >
        <Illustration size={230} />
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(110).duration(300).easing(Easing.out(Easing.cubic))}
        style={styles.textBlock}
      >
        <ThemedText variant="headlineLarge" color="textPrimary" style={styles.slideTitle}>
          {item.title}
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.slideSubtitle}>
          {item.subtitle}
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (isLast) {
      router.replace("/onboarding/role");
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    router.replace("/onboarding/role");
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Skip button */}
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
        renderItem={({ item }) => <SlideCard item={item} />}
        style={styles.flatList}
      />

      {/* Bottom: dots + button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPadding + Spacing.xl },
        ]}
      >
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonWrap}>
          <Button variant="primary" fullWidth onPress={handleNext}>
            {isLast ? "Commencer" : "Suivant"}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  },
  illustrationWrap: {
    marginBottom: Spacing.xxxl,
  },
  textBlock: {
    alignItems: "center",
    gap: Spacing.md,
  },
  slideTitle: {
    textAlign: "center",
  },
  slideSubtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonWrap: {
    width: "100%",
  },
});
