# Mode Miroir AR — Comment ça marche

Fichier principal : `app/ar-mirror.tsx`

## Le principe

Tu pointes ta caméra vers ton étagère / une rangée de produits, et l'app entoure chaque produit en temps réel d'un **halo coloré pulsant** selon son verdict :

- 🟢 **vert** = safe
- 🟡 **ambre** = vigilance
- 🔴 **rouge** = à éviter

C'est une feature **Premium** (gate avec écran de teasing si tu n'es pas abonné).

## Comment ça marche techniquement

### 1. Caméra continue + scan multi-codes-barres

```tsx
<CameraView
  onBarcodeScanned={…}
  barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
/>
```

Reçoit en continu **tous les codes-barres visibles** dans le champ (pas un seul à la fois comme le scanner classique).

### 2. Lookup dans le cache offline

Au démarrage, l'app charge `@helo_offline_cache` (AsyncStorage) — c'est l'historique de tous tes scans déjà faits. Pour chaque code-barres détecté, elle cherche le verdict dans ce cache local (instantané, pas d'appel réseau).

→ **Grosse limite : si un produit n'a jamais été scanné, il apparaît en gris « non scanné ».**

### 3. Tracking en temps réel

Chaque code-barres détecté est stocké dans `trackedRef` avec :

- ses coordonnées `(x, y, w, h)` normalisées sur l'écran (via `normaliseBounds`)
- son `lastSeen` (timestamp)
- son `lookup` (verdict + nom + marque)

Un `setInterval` toutes les **150 ms** met à jour le rendu :

- si un code n'a pas été revu depuis `FADE_START_MS` il commence à s'estomper
- à `REMOVE_MS` il est supprimé

→ Les halos suivent les produits quand tu bouges la caméra.

### 4. Le composant `Halo`

Fichier : `components/ar-mirror/Halo.tsx`

Pour chaque produit tracké, il dessine :

- un cercle extérieur qui **pulse** (Reanimated : scale 1 → 1.12 → 1, boucle 900 ms)
- un cercle intérieur translucide de la couleur du verdict
- un label avec le nom + emoji (`item.lookup.name.slice(0,24) + ✓/⚠/✕`)

Position : `left: item.x + item.w/2 - halfHalo` → centré sur le code-barres détecté.

### 5. Deux modes (bouton ⚡/👁 en haut à droite)

- **Mode étagère** (défaut) : tous les produits visibles ont leur halo simultanément + bandeau du score en bas (`3 ✕ · 2 ⚠ · 5 ✓`)
- **Mode rapide** ⚡ : un seul produit à la fois, affiche une carte `QuickScanResult` avec nom/marque/verdict pendant 2,5 s

### 6. Bouton capture 📸

`ViewShot` prend une screenshot de la vue (caméra + halos) → `expo-sharing` ouvre le share sheet (TikTok / Insta / Messages…). C'est le hook viral.

## Ce qu'il ne fait PAS

- ❌ Pas de **vraie reconnaissance visuelle** d'objet (pas de ML / Vision API). C'est uniquement basé sur les codes-barres visibles.
- ❌ Pas d'**appel API en live** — uniquement le cache local des scans déjà faits. Plus tu scannes, plus le miroir devient utile.
- ❌ Pas d'**OCR** sur les étiquettes (juste les codes-barres).

## En résumé

C'est de la **"fausse AR" très bien faite** — du barcode tracking + overlay animé positionné sur le code-barres. L'effet wow est réel mais ça suppose que les produits aient déjà été scannés une fois.
