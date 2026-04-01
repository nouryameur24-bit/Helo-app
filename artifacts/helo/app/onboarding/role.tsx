import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ui/ThemedText";
import { Colors, Radius, Spacing } from "@/constants/theme";

type Role = "pregnant" | "partner";

interface RoleCard {
  role: Role;
  emoji: string;
  title: string;
  description: string;
  gradient: [string, string];
}

const ROLES: RoleCard[] = [
  {
    role: "pregnant",
    emoji: "🤰",
    title: "Je suis enceinte",
    description: "Analysez vos produits au quotidien et suivez votre grossesse semaine par semaine.",
    gradient: [Colors.accentLight, "#FFF0D0"],
  },
  {
    role: "partner",
    emoji: "💙",
    title: "J'accompagne",
    description: "Scannez des produits pour votre proche et accédez à son placard.",
    gradient: ["#EAF3FF", "#D5E8FF"],
  },
];

function AnimatedRoleCard({
  card,
  selected,
  onSelect,
}: {
  card: RoleCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(selected ? 1 : 0);
  const borderAnim = useSharedValue(selected ? 1 : 0);

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1.01, { stiffness: 280, damping: 14 }),
      withSpring(1, { stiffness: 200, damping: 16 }),
    );
    checkScale.value = withSpring(1, { stiffness: 300, damping: 16 });
    borderAnim.value = withTiming(1, { duration: 200 });
    onSelect();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={card.title}
        accessibilityState={{ selected }}
      >
        <LinearGradient
          colors={selected ? card.gradient : ["#FFFFFF", "#FAFAFA"]}
          style={[
            styles.card,
            selected && styles.cardSelected,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Emoji */}
          <View style={styles.emojiWrap}>
            <ThemedText style={styles.cardEmoji}>{card.emoji}</ThemedText>
          </View>

          {/* Text */}
          <View style={styles.cardBody}>
            <ThemedText variant="headlineMedium" color="textPrimary">
              {card.title}
            </ThemedText>
            <ThemedText
              variant="bodyMedium"
              color="textSecondary"
              style={{ marginTop: 4, lineHeight: 20 }}
            >
              {card.description}
            </ThemedText>
          </View>

          {/* Checkmark */}
          <Animated.View style={[styles.checkCircle, selected && styles.checkCircleSelected, checkStyle]}>
            {selected && (
              <Feather name="check" size={14} color="#fff" />
            )}
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [selected, setSelected] = useState<Role | null>(null);

  const handleSelect = async (role: Role) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(role);

    await AsyncStorage.setItem("@helo_user_role", role);

    setTimeout(() => {
      if (role === "pregnant") {
        router.replace("/onboarding/profile");
      } else {
        router.replace("/onboarding/partner-code");
      }
    }, 280);
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: topPadding + Spacing.xl, paddingBottom: bottomPadding + Spacing.xxl },
      ]}
    >
      {/* Step indicator */}
      <Animated.View
        entering={FadeIn.delay(0).duration(400)}
        style={styles.stepRow}
      >
        <View style={styles.stepDot} />
        <View style={[styles.stepLine, { opacity: 0.25 }]} />
        <View style={[styles.stepDot, { opacity: 0.25 }]} />
      </Animated.View>

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(450)}
        style={styles.header}
      >
        <ThemedText variant="displayMedium" color="textPrimary" style={styles.title}>
          Bienvenue sur Hēlo
        </ThemedText>
        <ThemedText variant="bodyLarge" color="textSecondary" style={styles.subtitle}>
          Comment souhaitez-vous utiliser l'application ?
        </ThemedText>
      </Animated.View>

      {/* Cards */}
      <View style={styles.cards}>
        {ROLES.map((card, i) => (
          <Animated.View
            key={card.role}
            entering={FadeInDown.delay(120 + i * 80).duration(400)}
          >
            <AnimatedRoleCard
              card={card}
              selected={selected === card.role}
              onSelect={() => handleSelect(card.role)}
            />
          </Animated.View>
        ))}
      </View>

      {/* Trust line */}
      <Animated.View
        entering={FadeInDown.delay(320).duration(400)}
        style={styles.trustRow}
      >
        <Feather name="shield" size={14} color={Colors.textTertiary} />
        <ThemedText variant="bodySmall" color="textTertiary" style={{ marginLeft: 6 }}>
          Vos données restent sur votre appareil
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.accent,
    marginHorizontal: 4,
  },
  header: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 26,
  },
  cards: {
    gap: Spacing.lg,
    flex: 1,
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  cardSelected: {
    borderColor: Colors.accent,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkCircleSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Spacing.sm,
  },
});
