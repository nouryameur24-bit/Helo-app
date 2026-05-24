# Dark Mode — Migration progressive

Le dark mode "Lune de minuit" est **livré en infrastructure** (palette + hook + toggle UI) dans le Lot 8 design polish. Les écrans existants utilisent encore `Colors` importé directement → ils n'ont pas encore basculé visuellement.

Ce doc explique le pattern pour migrer un écran. À refaire pour chaque écran qu'on veut voir réagir au toggle.

## Pourquoi pas tout migrer d'un coup ?

- 30+ écrans dans `app/` + ~50 composants dans `components/`
- Chaque migration nécessite validation visuelle (capture light + dark)
- Risque de casser le UI si le hook est mal utilisé (rules of hooks, dépendances de useMemo)
- Effort total ≈ 5-8h, risqué pour un launch imminent

→ On préfère **migrer écran par écran** entre les releases : Home → Verdict → Chat → Scan → Profile → reste.

## Pattern de migration

### Avant migration

```tsx
import { Colors } from '@/constants/theme';

export default function MonÉcran() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonjour</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background },
  title: { color: Colors.textPrimary },
});
```

### Après migration

```tsx
import { useMemo } from 'react';
import { useColors } from '@/hooks/useAppTheme';

export default function MonÉcran() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: Colors.background },
    title: { color: Colors.textPrimary },
  }), [Colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonjour</Text>
    </View>
  );
}
```

### Changements clés

1. `import { Colors } from '@/constants/theme'` → **supprimer**
2. `import { useColors } from '@/hooks/useAppTheme'` → **ajouter**
3. Dans le corps du composant : `const Colors = useColors();` — appelé une fois, en haut
4. Le `StyleSheet.create(...)` doit être **wrappé dans `useMemo`** pour recréer les styles si la palette change. Sans ça, le toggle Apparence ne fera rien tant que l'écran n'est pas remonté.

## Checklist par écran

Pour chaque écran migré, vérifie :

- [ ] Plus aucun `import { Colors } from '@/constants/theme'` (sauf si on a aussi besoin de `Spacing`, `Radius` qui restent là — alors `import { Spacing, Radius } from '@/constants/theme'`)
- [ ] `useColors()` appelé **une seule fois** par composant, **avant tout return early**
- [ ] `StyleSheet.create` wrappé dans `useMemo([Colors])`
- [ ] Test visuel en mode Light (forcer dans Profile → APPARENCE → Clair)
- [ ] Test visuel en mode Dark (forcer Sombre)
- [ ] Pas de couleur hardcodée style `style={{ color: '#2D2926' }}` — remplacer par `Colors.textPrimary`

## Ordre de migration recommandé

| # | Écran | Priorité | Pourquoi |
|---|---|---|---|
| 1 | `app/(tabs)/index.tsx` (Home) | 🔴 High | Premier écran vu, impacte le wahou |
| 2 | `app/verdict/[scanId].tsx` | 🔴 High | Moment de vérité émotionnelle |
| 3 | `app/(tabs)/chat.tsx` | 🔴 High | Consulté la nuit (T3 insomnies) |
| 4 | `app/(tabs)/scan.tsx` | 🟠 Med | Caméra fond noir, moins critique |
| 5 | `app/(tabs)/shelf.tsx` | 🟠 Med | Vu souvent, lecture longue |
| 6 | `app/(tabs)/profile.tsx` | 🟠 Med | Là où on toggle = il doit lui-même bien réagir |
| 7 | `app/paywall.tsx` | 🟡 Low | Le mesh gradient marche déjà en light, dark = effort moyen |
| 8+ | Reste (onboarding, legal, autres) | 🟡 Low | Migrate quand on touche le fichier pour autre chose |

## Pièges à éviter

1. **Ne pas appeler `useColors()` conditionnellement** (rules of hooks). 
   ```tsx
   // ❌ NON
   if (loading) return <Spinner />;
   const Colors = useColors();
   
   // ✅ OUI
   const Colors = useColors();
   if (loading) return <Spinner />;
   ```

2. **Ne pas oublier le `useMemo`** sur les styles.
   ```tsx
   // ❌ NON — styles recréés à chaque render, perf dégradée
   const styles = StyleSheet.create({ ... });
   
   // ✅ OUI
   const styles = useMemo(() => StyleSheet.create({ ... }), [Colors]);
   ```

3. **Les composants partagés** (Card, Button, Badge, etc.) doivent être migrés en premier, sinon les écrans qui les utilisent ne réagiront que partiellement. Voir `components/ui/` pour la liste.

4. **Les couleurs sémantiques restent** : `Colors.safe`, `Colors.caution`, `Colors.danger` existent dans les 2 palettes — pas besoin de logique conditionnelle. Le hook s'en charge.

## Validation après migration globale

Une fois tous les écrans migrés :
1. Toggle Auto → vérifier que ça suit le réglage iOS/Android
2. Toggle Clair → vérifier que tout reste lisible
3. Toggle Sombre → vérifier qu'aucun élément n'est invisible (texte foncé sur fond foncé, etc.)
4. Test sur Android low-end (contrastes peuvent souffrir)
