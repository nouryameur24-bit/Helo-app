import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Category = 'cosmetic' | 'food' | 'medication';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'cosmetic', label: 'Cosmétique', icon: 'droplet' },
  { key: 'food', label: 'Alimentaire', icon: 'coffee' },
  { key: 'medication', label: 'Médicament', icon: 'plus-circle' },
];

async function uploadImageToSupabase(
  uri: string,
  bucket: string,
  path: string,
): Promise<string | null> {
  if (!isSupabaseConfigured) return uri;

  // React Native (Hermes): Blob.arrayBuffer() is undefined — use Response.arrayBuffer() directly
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage.from(bucket).upload(path, uint8, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    if (__DEV__) console.warn('[submit] storage upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function SuccessScreen() {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  React.useEffect(() => {
    checkScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
    checkOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
  }, [checkOpacity, checkScale, textOpacity]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIcon, checkStyle]}>
        <Feather name="check-circle" size={72} color={Colors.accent} />
      </Animated.View>
      <Animated.View style={textStyle}>
        <ThemedText variant="headlineMedium" style={styles.successTitle}>
          Merci !
        </ThemedText>
        <ThemedText variant="bodyMedium" color="textSecondary" style={styles.successSubtitle}>
          Vérification sous 48h.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

export default function SubmitProductScreen() {
  const { barcode: rawBarcode } = useLocalSearchParams<{ barcode?: string }>();
  const barcode = rawBarcode ?? '';
  const insets = useSafeAreaInsets();
  const { userId } = useProfile();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('cosmetic');
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [ingredientsPhoto, setIngredientsPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const pickImage = async (setter: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const takePhoto = async (setter: (uri: string) => void) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      setError("Permission refusée pour accéder à la caméra.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const showPhotoOptions = (setter: (uri: string) => void) => {
    pickImage(setter);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Le nom du produit est requis."); return; }
    if (!productPhoto) { setError("La photo du produit est requise."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const uid = userId ?? 'anonymous';
      const ts = Date.now();

      let productPhotoUrl: string;
      let ingredientsPhotoUrl: string | null = null;

      if (isSupabaseConfigured) {
        const uploaded = await uploadImageToSupabase(
          productPhoto,
          'community-products',
          `${uid}/${ts}_product.jpg`,
        );
        if (!uploaded) {
          throw new Error("L'upload de la photo a échoué. Réessaie.");
        }
        productPhotoUrl = uploaded;

        if (ingredientsPhoto) {
          const ingUploaded = await uploadImageToSupabase(
            ingredientsPhoto,
            'community-products',
            `${uid}/${ts}_ingredients.jpg`,
          );
          if (ingUploaded) ingredientsPhotoUrl = ingUploaded;
        }

        const { error: insertError } = await supabase.from('community_submissions').insert({
          user_id: uid,
          barcode,
          name: name.trim(),
          brand: brand.trim(),
          category,
          product_photo_url: productPhotoUrl,
          ingredients_photo_url: ingredientsPhotoUrl,
          status: 'pending',
        });

        if (insertError) {
          if (__DEV__) console.warn('[submit] DB insert error:', insertError);
          throw new Error(insertError.message);
        }
      } else {
        productPhotoUrl = productPhoto;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        router.back();
      }, 2800);
    } catch (e) {
      if (__DEV__) console.warn('[submit] error:', e);
      setError("Une erreur est survenue. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.root, { backgroundColor: Colors.background }]}>
        <SuccessScreen />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPadding + Spacing.lg, paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
            <ThemedText variant="bodyMedium" style={{ marginLeft: 8 }}>Retour</ThemedText>
          </TouchableOpacity>

          <ThemedText variant="headlineLarge" style={{ marginBottom: Spacing.sm }}>
            Ajouter un produit
          </ThemedText>
          <ThemedText variant="bodyMedium" color="textSecondary" style={{ marginBottom: Spacing.xxl }}>
            Contribuez à la base de données communautaire Hēlo.
          </ThemedText>

          {/* Product photo */}
          <ThemedText variant="labelSmall" color="textTertiary" style={styles.label}>
            PHOTO DU PRODUIT *
          </ThemedText>
          <PhotoPicker
            uri={productPhoto}
            onPick={() => showPhotoOptions(setProductPhoto)}
            onCamera={() => takePhoto(setProductPhoto)}
            placeholder="Ajouter une photo du produit"
          />

          {/* Ingredients photo */}
          <ThemedText variant="labelSmall" color="textTertiary" style={[styles.label, { marginTop: Spacing.xl }]}>
            PHOTO DES INGRÉDIENTS (optionnel)
          </ThemedText>
          <PhotoPicker
            uri={ingredientsPhoto}
            onPick={() => showPhotoOptions(setIngredientsPhoto)}
            onCamera={() => takePhoto(setIngredientsPhoto)}
            placeholder="Ajouter une photo des ingrédients"
          />

          {/* Barcode (read-only) */}
          <ThemedText variant="labelSmall" color="textTertiary" style={[styles.label, { marginTop: Spacing.xl }]}>
            CODE-BARRES
          </ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: Colors.textTertiary }]}
              value={barcode || 'Non disponible'}
              editable={false}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* Name */}
          <ThemedText variant="labelSmall" color="textTertiary" style={[styles.label, { marginTop: Spacing.xl }]}>
            NOM DU PRODUIT *
          </ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex. Crème hydratante"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="next"
            />
          </View>

          {/* Brand */}
          <ThemedText variant="labelSmall" color="textTertiary" style={[styles.label, { marginTop: Spacing.xl }]}>
            MARQUE
          </ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Ex. NUXE"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="done"
            />
          </View>

          {/* Category */}
          <ThemedText variant="labelSmall" color="textTertiary" style={[styles.label, { marginTop: Spacing.xl }]}>
            CATÉGORIE
          </ThemedText>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[
                  styles.categoryChip,
                  category === cat.key && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.key)}
              >
                <Feather
                  name={cat.icon}
                  size={14}
                  color={category === cat.key ? Colors.accent : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: category === cat.key ? Colors.accent : Colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={Colors.danger} />
              <ThemedText variant="bodySmall" style={{ color: Colors.danger, marginLeft: 6 }}>
                {error}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + Spacing.lg },
          Shadows.medium,
        ]}
      >
        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Envoi en cours…' : 'Envoyer ma contribution'}
        </Button>
      </View>
    </View>
  );
}

function PhotoPicker({
  uri,
  onPick,
  onCamera,
  placeholder,
}: {
  uri: string | null;
  onPick: () => void;
  onCamera: () => void;
  placeholder: string;
}) {
  if (uri) {
    return (
      <View style={styles.photoPreviewWrapper}>
        <Image source={{ uri }} style={styles.photoPreview} contentFit="cover" />
        <Pressable style={styles.photoReplaceBtn} onPress={onPick}>
          <Feather name="edit-2" size={14} color={Colors.accent} />
          <Text style={styles.photoReplaceText}>Modifier</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.photoPickerRow}>
      <Pressable
        style={({ pressed }) => [styles.photoPicker, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onCamera}
      >
        <Feather name="camera" size={22} color={Colors.accent} />
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
          Caméra
        </ThemedText>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.photoPicker, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onPick}
      >
        <Feather name="image" size={22} color={Colors.accent} />
        <ThemedText variant="bodySmall" color="textSecondary" style={{ marginTop: 4 }}>
          Galerie
        </ThemedText>
      </Pressable>
      <View style={[styles.photoPicker, { flex: 2, alignItems: 'flex-start', flexDirection: 'row' }]}>
        <Feather name="info" size={14} color={Colors.textTertiary} style={{ marginRight: 4, marginTop: 2 }} />
        <ThemedText variant="bodySmall" color="textTertiary" style={{ flex: 1 }}>
          {placeholder}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  label: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
  },
  input: {
    fontSize: Typography.bodyLarge.fontSize,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: Colors.textPrimary,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoPicker: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.accentLight,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
  },
  photoPreviewWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  photoReplaceBtn: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  photoReplaceText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.accent,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    textAlign: 'center',
  },
  successSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
