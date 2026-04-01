import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { bar } from './searchStyles';

interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onBlur: () => void;
  focused: boolean;
}

function SearchBar({ value, onChangeText, onClear, onFocus, onBlur, focused }: SearchBarProps) {
  return (
    <View style={[bar.wrap, focused && { borderColor: Colors.accent }]}>
      <Feather name="search" size={18} color={focused ? Colors.accent : Colors.textTertiary} style={bar.icon} />
      <TextInput
        style={bar.input}
        placeholder="Rechercher un produit ou une marque…"
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} style={bar.clear} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
          <Feather name="x-circle" size={16} color={Colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

export default React.memo(SearchBar);
