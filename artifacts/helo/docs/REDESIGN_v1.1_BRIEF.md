# Brief Refonte Design — Hēlo v1.1

> ⚠️ **À ouvrir dans 3-4 semaines, après 100-200 premières utilisatrices.**
> **Ne pas exécuter ce brief avant d'avoir des données réelles d'usage.**

---

## Principe directeur

Ce brief n'est PAS une refonte. C'est une **amplification ciblée** des moments où le « woah » peut exister, sans casser ce qui fait déjà la signature de Hēlo.

**Règle d'or** : chaque décision design doit répondre à un retour utilisatrice concret. Si tu ne peux pas citer une utilisatrice qui a dit « ce moment-là, j'aurais aimé que ce soit différent », tu ne touches pas à ce moment-là.

---

## Ce qui est intouchable (signature déjà établie)

Ne pas modifier sans une raison data-driven très forte :

| Élément | Pourquoi c'est intouchable |
|---|---|
| Palette crème/sable/or (`#FFFAF5`, `#C9A96E`, `#E8D5B0`) | Différenciateur visuel rare. Aucune app grossesse française n'a cette palette. |
| Naming poétique (Hēlo, Glow Score, Hēlo Memories, Pacte) | Identité narrative déjà cohérente. |
| Typographie Plus Jakarta Sans | Choix sophistiqué, lisible, féminin sans être cliché. |
| Tons de risque (safe `#7CB69F`, caution `#D4A853`, danger `#C27B7B`) | Calibrés pour ne pas être anxiogènes — important sur vertical médical. |

---

## Inspirations concrètes (pas Linear ni Notion)

Registre visé : **luxe sobre santé féminine**.

**Références directes :**
- **Apothékary** (apothekary.co) — herbalisme premium, palette beige/or, typo serif/sans hybride
- **Glossier** (glossier.com) — nude beige, blanc cassé, simplicité radicale
- **Aesop** (aesop.com) — typographie majestueuse, espaces blancs généreux, contenu éditorial
- **Oura Ring app** — data visualization sobre + animations subtiles
- **Withings Health Mate** — courbes santé féminines bien rendues

**Indirectes (pour le geste produit, pas la palette) :**
- **Headspace** — onboarding émotionnel premium
- **Calm** — moments de transition, micro-animations
- **Arc Browser** — qualité d'exécution des transitions

**À éviter (pièges) :**
- Flo, Ovia Pregnancy → trop saturés en bleu/rose, identité "app santé femme cliché"
- Pregnancy+ → vieillot
- Yuka → trop game-y, scoring agressif

---

## Les 6 moments où le woah peut vraiment exister

Listés par impact × effort. **Commencer par les 2 premiers seulement.**

### 🥇 Moment 1 — Le verdict produit (l'instant le plus important de l'app)

**État actuel** : cercle vert avec « 100 Compatible », liste d'ingrédients.

**Pourquoi c'est THE moment** : c'est le moment où l'utilisatrice prend une décision (acheter / pas acheter, manger / pas manger). C'est aussi le moment le plus partagé (capture d'écran envoyée à la sage-femme ou à une amie).

**Pistes d'amplification (ordre d'effort) :**

1. **Animation de révélation du score** — au moment de l'apparition, le cercle se construit en 800ms : d'abord un trait fin qui se trace, puis le chiffre qui apparaît avec un léger scale-up, puis le halo coloré qui pulse une fois. Référence : l'animation de score Apple Watch quand tu fermes les anneaux.
2. **Halo dynamique** — autour du cercle, un dégradé radial dans la couleur du verdict (safe vert pâle, caution doré pâle, danger rosé pâle). Donne du volume.
3. **Tap haptic** — `Haptics.notificationAsync(NotificationFeedbackType.Success/Warning/Error)` selon le verdict. `expo-haptics` déjà installé.
4. **Texture de fond** — un grain très subtil (5% d'opacité) sur le fond de l'écran verdict, qui rappelle un papier vélin. Ajoute du « luxe » sans coût visuel.
5. **Quote/insight contextuel** — sous le verdict, une phrase signée « — Selon le CRAT » qui change selon le trimestre. Crédibilité + personnalisation.

---

### Moments 2 à 6

> ⚠️ Le brief original a été tronqué à la transmission. À récupérer auprès du PM avant ouverture du chantier v1.1.

---

## Conditions de déclenchement de ce brief

- [ ] 100 à 200 utilisatrices réelles ont utilisé l'app
- [ ] Retours qualitatifs collectés (interviews, NPS, support)
- [ ] Pour chaque moment touché : au moins une citation utilisatrice qui justifie le changement
- [ ] PM valide l'ouverture du chantier
