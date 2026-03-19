import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/theme";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="role" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="partner-code" />
    </Stack>
  );
}
